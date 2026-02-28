import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { mintTo } from "@/lib/thirdweb";

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

        const { templateId } = await req.json();
        if (!templateId) {
            return NextResponse.json(
                { error: "テンプレートIDが必要です。" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // 2. Fetch template
        const { data: template, error: templateError } = await supabase
            .from("nft_templates")
            .select("*")
            .eq("id", templateId)
            .single();

        if (templateError || !template) {
            return NextResponse.json(
                { error: "テンプレートが見つかりません。" },
                { status: 404 }
            );
        }

        // 3. Check if already claimed (1 user = 1 claim per template)
        const { data: existingClaim } = await supabase
            .from("airdrop_claims")
            .select("id")
            .eq("template_id", templateId)
            .eq("wallet_address", session.walletAddress)
            .maybeSingle();

        if (existingClaim) {
            return NextResponse.json(
                { error: "このNFTは既に受け取り済みです。" },
                { status: 409 }
            );
        }

        // 4. Check supply
        if (template.max_supply !== null && (template.current_supply || 0) >= template.max_supply) {
            return NextResponse.json(
                { error: "在庫切れです。このNFTの配布は終了しました。" },
                { status: 410 }
            );
        }

        // 5. Try to claim atomically via RPC (prevents race conditions)
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc("claim_airdrop_safe", {
                p_template_id: templateId,
                p_wallet_address: session.walletAddress,
            });

        if (rpcError) {
            console.error("RPC error:", rpcError);
            // Fallback: manual claim if RPC not available
            // Update supply
            await supabase
                .from("nft_templates")
                .update({ current_supply: (template.current_supply || 0) + 1 })
                .eq("id", templateId);

            // Insert claim record
            await supabase.from("airdrop_claims").insert({
                template_id: templateId,
                wallet_address: session.walletAddress,
            });
        } else if (rpcResult && !rpcResult.success) {
            const errorMap: Record<string, string> = {
                ALREADY_CLAIMED: "このNFTは既に受け取り済みです。",
                TEMPLATE_NOT_FOUND: "テンプレートが見つかりません。",
                OUT_OF_STOCK: "在庫切れです。このNFTの配布は終了しました。",
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
                { trait_type: "Source", value: "Airdrop" },
                { trait_type: "Transferable", value: template.is_transferable ? "Yes" : "No" },
            ],
        };

        const mintResult = await mintTo(chain, contractAddress, session.walletAddress, metadata);

        // 7. Record in mint_logs
        await supabase.from("mint_logs").insert({
            wallet_address: session.walletAddress,
            contract_address: contractAddress,
            token_id: mintResult?.result?.tokenId || null,
            template_id: templateId,
            status: "success",
            metadata: metadata,
            tx_hash: mintResult?.result?.transactionHash || null,
        });

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
