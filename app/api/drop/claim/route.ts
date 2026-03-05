import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { mintTo } from "@/lib/thirdweb";
import { calculateDistance } from "@/lib/utils";
import { buildMintLogEntry } from "@/lib/nft-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        // 1. Check session
        const session = await getSession();
        if (!session?.walletAddress) {
            return NextResponse.json(
                { error: "ログインしてください。" },
                { status: 401 }
            );
        }

        const { templateId: reqTemplateId, spotId, lat, lng } = await req.json();

        if (!reqTemplateId && !spotId) {
            return NextResponse.json(
                { error: "テンプレートIDまたはスポットIDが必要です。" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        let finalTemplateId = reqTemplateId;

        // 2a. Fetch Spot Data if spotId provided
        if (spotId) {
            const { data: spot, error: spotError } = await supabase
                .from("nft_distribution_spots")
                .select("*")
                .eq("id", spotId)
                .single();

            if (spotError || !spot || !spot.is_active) {
                return NextResponse.json(
                    { error: "無効または終了した配布スポットです。" },
                    { status: 404 }
                );
            }

            // check location limits
            if (spot.is_location_restricted) {
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                    return NextResponse.json(
                        { error: "位置情報の取得に失敗しました。少し待ってから再度お試しください。", requiresLocation: true },
                        { status: 403 }
                    );
                }

                if (spot.latitude && spot.longitude) {
                    const radius = spot.radius_meters || 100;
                    const distOptions = calculateDistance(lat, lng, spot.latitude, spot.longitude);
                    if (distOptions > radius) {
                        return NextResponse.json(
                            { error: "配布エリア（半径" + radius + "m）から離れています。もう少し現地に近づいてください。" },
                            { status: 403 }
                        );
                    }
                }
            }

            // Spot limit verification done in RPC!

            finalTemplateId = spot.template_id;
        }

        // 2b. Fetch template
        const { data: template, error: templateError } = await supabase
            .from("nft_templates")
            .select("*")
            .eq("id", finalTemplateId)
            .single();

        if (templateError || !template) {
            return NextResponse.json(
                { error: "テンプレートが見つかりません。" },
                { status: 404 }
            );
        }

        // 3. User claim duplication check (template level restriction)
        const { data: existingClaim } = await supabase
            .from("airdrop_claims")
            .select("id")
            .eq("template_id", finalTemplateId)
            .eq("wallet_address", session.walletAddress)
            .maybeSingle();

        if (existingClaim) {
            return NextResponse.json(
                { error: "このNFTは既に受け取り済みです。" },
                { status: 409 }
            );
        }

        // 4. Template supply check
        if (template.max_supply !== null && (template.current_supply || 0) >= template.max_supply) {
            return NextResponse.json(
                { error: "在庫切れです。このNFTの配布は終了しました。" },
                { status: 410 }
            );
        }

        // 5. Try to claim atomically via RPC
        const rpcName = spotId ? "claim_spot_airdrop_safe" : "claim_airdrop_safe";
        const rpcArgs: any = {
            p_template_id: finalTemplateId,
            p_wallet_address: session.walletAddress,
        };

        if (spotId) {
            rpcArgs.p_spot_id = spotId;
        }

        const { data: rpcResult, error: rpcError } = await supabase.rpc(rpcName, rpcArgs);

        if (rpcError) {
            console.error("RPC error:", rpcError);
            if (spotId) {
                // If the new RPC fails (maybe not deployed), we can fallback safely if we check spot limits manually here
                // However, doing manual spot check is race condition prone. Better to just let it fail gracefully.
                return NextResponse.json(
                    { error: "配布処理中にエラーが発生しました。" },
                    { status: 500 }
                );
            } else {
                // Old fallback for single template claim
                await supabase
                    .from("nft_templates")
                    .update({ current_supply: (template.current_supply || 0) + 1 })
                    .eq("id", finalTemplateId);

                await supabase.from("airdrop_claims").insert({
                    template_id: finalTemplateId,
                    wallet_address: session.walletAddress,
                });
            }
        } else if (rpcResult && !rpcResult.success) {
            const errorMap: Record<string, string> = {
                ALREADY_CLAIMED: "このNFTは既に受け取り済みです。",
                TEMPLATE_NOT_FOUND: "テンプレートが見つかりません。",
                OUT_OF_STOCK: "在庫切れです。このNFTの配布は終了しました。",
                SPOT_NOT_FOUND: "無効な配布スポットです。",
                SPOT_LIMIT_REACHED: "配布終了", // ユーザー要望「配布終了」とだけ出す
            };
            return NextResponse.json(
                { error: errorMap[rpcResult.error] || "エラーが発生しました。" },
                { status: 409 }
            );
        }

        // 6. Mint NFT to the user
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
        const contractAddress = template.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID || "";

        const metadata = {
            name: template.name,
            description: template.description || "",
            image: template.image_url || "",
            attributes: [
                { trait_type: "Type", value: template.type },
                { trait_type: "Source", value: "Location Drop" },
                { trait_type: "Transferable", value: template.is_transferable ? "Yes" : "No" },
                { trait_type: "TemplateID", value: finalTemplateId },
            ],
        };

        const mintResult = await mintTo(chain, contractAddress, session.walletAddress, metadata);

        // 7. Record in mint_logs
        const mintLogEntry = buildMintLogEntry({
            walletAddress: session.walletAddress,
            contractAddress,
            tokenId: mintResult?.result?.tokenId?.toString(),
            templateId: finalTemplateId,
            transactionHash: mintResult?.result?.transactionHash,
            source: spotId ? `spot-${spotId}` : `drop-${finalTemplateId}`,
        });
        mintLogEntry.metadata = metadata;
        await supabase.from("mint_logs").insert(mintLogEntry);



        return NextResponse.json({
            ok: true,
            message: "NFTを受け取りました！",
            txHash: mintResult?.result?.transactionHash || null,
        });
    } catch (error: any) {
        console.error("Drop claim error:", error);
        return NextResponse.json(
            { error: error.message || "予期しないエラーが発生しました。" },
            { status: 500 }
        );
    }
}
