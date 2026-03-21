import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { transfer } from "@/lib/thirdweb";

// Secure token generation using Web Crypto API
function generateSecureToken(length = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.walletAddress || !session.authenticated) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { nftId } = await req.json();

        if (!nftId) {
            return NextResponse.json({ error: "nftId is required" }, { status: 400 });
        }

        const contractAddress = process.env.NEXT_PUBLIC_COLLECTION_ID;
        const backendWallet = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;

        if (!contractAddress || !backendWallet) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const supabase = createAdminClient();

        // --- Expiration Check ---
        const { getNFTById } = await import("@/lib/thirdweb");
        const { extractTemplateId } = await import("@/lib/nft-helpers");

        const nft = await getNFTById(contractAddress, String(nftId));
        if (nft && (nft.metadata as any)?.attributes) {
            const templateId = extractTemplateId((nft.metadata as any).attributes);
            if (templateId) {
                const { data: mintLog } = await supabase
                    .from('mint_logs')
                    .select('created_at')
                    .eq('token_id', String(nftId))
                    .eq('contract_address', contractAddress)
                    .ilike('recipient_wallet', session.walletAddress)
                    .eq('status', 'success')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (mintLog?.created_at) {
                    const { data: tmpl } = await supabase
                        .from('nft_templates')
                        .select('validity_days')
                        .eq('id', templateId)
                        .single();

                    if (tmpl?.validity_days) {
                        const expDate = new Date(mintLog.created_at);
                        expDate.setDate(expDate.getDate() + tmpl.validity_days);
                        if (new Date() > expDate) {
                            return NextResponse.json({ error: "このNFTは有効期限が切れているため譲渡できません" }, { status: 400 });
                        }
                    }
                }
            }
        }
        // ------------------------

        // 1. Generate unique transfer token
        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

        // 2. We do NOT transfer the token on-chain here. 
        // Instead, we just lock it in the DB, and mint a fresh copy to the recipient upon claim.
        // This avoids requiring the sender (MetaMask user) to sign a transaction or give approvals.

        // 3. Save transfer link to DB
        const { error: dbError } = await supabase
            .from('transfer_links')
            .insert({
                token,
                giveraddress: session.walletAddress,
                tokenid: String(nftId),
                status: 'ACTIVE',
                expires_at: expiresAt.toISOString(),
            });

        if (dbError) {
            console.error("DB Insert Error:", dbError);
            // We transferred the NFT but failed to save DB! In production, 
            // a rollback or compensation logic is needed here.
            return NextResponse.json({ error: "Failed to create transfer link record" }, { status: 500 });
        }

        // 4. Return the generated link token
        return NextResponse.json({
            ok: true,
            token,
            expiresAt: expiresAt.toISOString()
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Create Transfer Link Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
