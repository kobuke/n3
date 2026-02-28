import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { mintTo } from "@/lib/thirdweb";

export const dynamic = "force-dynamic";

/**
 * POST /api/airdrop/line
 * Called after login when the user is detected to be in the LINE browser.
 * Checks if LINE airdrop is enabled and if user hasn't already received it.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.walletAddress) {
            return NextResponse.json(
                { error: "ログインが必要です。" },
                { status: 401 }
            );
        }

        const supabase = createAdminClient();

        // 1. Check if LINE airdrop is enabled
        const { data: enabledSetting } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "line_airdrop_enabled")
            .single();

        if (!enabledSetting || enabledSetting.value !== "true") {
            return NextResponse.json({ ok: false, reason: "LINE配布は現在無効です。" });
        }

        // 2. Get the template ID
        const { data: templateSetting } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "line_airdrop_template_id")
            .single();

        if (!templateSetting || !templateSetting.value) {
            return NextResponse.json({ ok: false, reason: "LINE配布用テンプレートが設定されていません。" });
        }

        const templateId = templateSetting.value;

        // 3. Check if already claimed (LINE airdrop is also 1 per user)
        const { data: existingClaim } = await supabase
            .from("airdrop_claims")
            .select("id")
            .eq("template_id", templateId)
            .eq("wallet_address", session.walletAddress)
            .maybeSingle();

        if (existingClaim) {
            return NextResponse.json({ ok: false, reason: "LINE連携記念NFTは既に受け取り済みです。" });
        }

        // 4. Fetch template
        const { data: template, error: templateErr } = await supabase
            .from("nft_templates")
            .select("*")
            .eq("id", templateId)
            .single();

        if (templateErr || !template) {
            console.error("LINE airdrop template not found:", templateId);
            return NextResponse.json({ ok: false, reason: "テンプレートが見つかりません。" });
        }

        // 5. Check supply
        if (template.max_supply !== null && (template.current_supply || 0) >= template.max_supply) {
            return NextResponse.json({ ok: false, reason: "在庫切れです。" });
        }

        // 6. Claim atomically
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc("claim_airdrop_safe", {
                p_template_id: templateId,
                p_wallet_address: session.walletAddress,
            });

        if (rpcError) {
            // Fallback
            await supabase
                .from("nft_templates")
                .update({ current_supply: (template.current_supply || 0) + 1 })
                .eq("id", templateId);
            await supabase.from("airdrop_claims").insert({
                template_id: templateId,
                wallet_address: session.walletAddress,
            });
        } else if (rpcResult && !rpcResult.success) {
            return NextResponse.json({ ok: false, reason: rpcResult.error });
        }

        // 7. Mint NFT
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
        const contractAddress = template.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID || "";

        const metadata = {
            name: template.name,
            description: template.description || "",
            image: template.image_url || "",
            attributes: [
                { trait_type: "Type", value: template.type },
                { trait_type: "Source", value: "LINE連携" },
                { trait_type: "Transferable", value: template.is_transferable ? "Yes" : "No" },
            ],
        };

        const mintResult = await mintTo(chain, contractAddress, session.walletAddress, metadata);

        // 8. Log
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
            message: "LINE連携記念NFTを配布しました！",
        });
    } catch (error: any) {
        console.error("LINE airdrop error:", error);
        return NextResponse.json(
            { error: error.message || "予期しないエラーが発生しました。" },
            { status: 500 }
        );
    }
}
