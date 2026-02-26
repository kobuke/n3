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

        // 1. Generate unique transfer token
        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

        // 2. Transfer the NFT from the user to the Backend Wallet (Escrow)
        // IMPORTANT: The user must have approved the Backend Wallet to spend their tokens.
        // In a fully gasless relayer setup, this might require a signed message or EIP-712 permit
        // depending on the contract configuration.
        // Assuming Engine can transfer *from* the user via relayer if permissions are set:
        // (NOTE: The standard /erc1155/transfer endpoint in Engine transfers FROM the backend wallet.
        // To transfer from a user, it requires /erc1155/transfer-from if supported, or a custom approach.)
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
        try {
            await transfer(
                chain,
                contractAddress,
                backendWallet,         // to escrow (3rd arg is toAddress)
                String(nftId),
                "1"
            );
        } catch (transferErr: any) {
            console.error("Escrow transfer failed:", transferErr.message);
            return NextResponse.json({ error: "Failed to transfer NFT to escrow." }, { status: 500 });
        }

        // 3. Save transfer link to DB
        const supabase = createAdminClient();
        const { error: dbError } = await supabase
            .from('transfer_links')
            .insert({
                token,
                giverAddress: session.walletAddress,
                tokenId: String(nftId),
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
