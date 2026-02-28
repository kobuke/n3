import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { transfer } from "@/lib/thirdweb";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.walletAddress || !session.authenticated) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const contractAddress = process.env.NEXT_PUBLIC_COLLECTION_ID;
        const backendWallet = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;

        if (!contractAddress || !backendWallet) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const supabase = createAdminClient();

        // 1. Verify token in DB
        const { data: linkRecord, error: findError } = await supabase
            .from('transfer_links')
            .select('*')
            .eq('token', token)
            .single();

        if (findError || !linkRecord) {
            return NextResponse.json({ error: "Invalid transfer link" }, { status: 404 });
        }

        if (linkRecord.status !== 'ACTIVE') {
            return NextResponse.json({ error: `Transfer link is already ${linkRecord.status}` }, { status: 400 });
        }

        if (new Date() > new Date(linkRecord.expires_at)) {
            // Opportunistically update status to EXPIRED
            await supabase.from('transfer_links').update({ status: 'EXPIRED' }).eq('id', linkRecord.id);
            return NextResponse.json({ error: "Transfer link has expired" }, { status: 400 });
        }

        // Attempting to claim one's own link?
        if (linkRecord.giverAddress === session.walletAddress) {
            return NextResponse.json({ error: "You cannot claim your own transfer link" }, { status: 400 });
        }

        // 2. Transfer from Escrow (Backend Wallet) to the claiming user
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
        let txHash: string | null = null;
        try {
            const transferResult = await transfer(
                chain,
                contractAddress,
                session.walletAddress,   // to claimer
                linkRecord.tokenId,
                "1"
            );
            txHash = transferResult?.result?.queueId || null;
        } catch (transferErr: any) {
            console.error("Claim transfer failed:", transferErr.message);
            return NextResponse.json({ error: "Failed to transfer NFT from escrow." }, { status: 500 });
        }

        // 3. Update transfer link status to CLAIMED and save tx hash
        const { error: updateError } = await supabase
            .from('transfer_links')
            .update({ status: 'CLAIMED', transaction_hash: txHash })
            .eq('id', linkRecord.id);

        if (updateError) {
            console.error("DB Update Error (Claimed):", updateError);
            // Note: NFT transferred but DB not updated. Needs compensation in prod.
        }

        return NextResponse.json({
            ok: true,
            message: "Successfully claimed the NFT",
            tokenId: linkRecord.tokenId
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Claim Transfer Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
