import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { polygon, polygonAmoy } from "thirdweb/chains";

export async function POST(req: Request) {
    try {
        const { tokenId, walletAddress, staffSecret, contractAddress } = await req.json();

        // 1. Verify Staff Secret
        if (staffSecret !== process.env.STAFF_SECRET) {
            return NextResponse.json({ error: "Invalid staff secret" }, { status: 403 });
        }

        if (!tokenId || !walletAddress || !contractAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 2. Check if already used locally
        const { data: usageLog } = await supabase
            .from('ticket_usages')
            .select('status')
            .eq('token_id', tokenId)
            .eq('contract_address', contractAddress)
            .eq('status', 'used')
            .single();

        if (usageLog) {
            return NextResponse.json({ error: "Ticket feels like it's already used." }, { status: 400 });
        }

        // 3. Initiate Burn transaction to invalidate ticket on-chain
        // thirdweb burn endpoint from engine
        const ENGINE_URL = process.env.THIRDWEB_ENGINE_URL || "";
        const ENGINE_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN || "";
        const ENGINE_BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET || "";

        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "Polygon";
        // NOTE: "burn-from" requires the wallet to have approved the backend wallet to burn on its behalf.
        // If not approved, or if we just want to update metadata (not burn), we execute standard contract write.
        /* 
        const url = `${ENGINE_URL}/contract/${chain}/${contractAddress}/erc1155/burn-from`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ENGINE_ACCESS_TOKEN}`,
                "x-backend-wallet-address": ENGINE_BACKEND_WALLET,
            },
            body: JSON.stringify({
                account: walletAddress,
                tokenId: tokenId,
                amount: "1"
            })
        });

        if (!res.ok) {
            throw new Error(await res.text());
        }
        const data = await res.json();
        */

        // For now, since true on-chain burn requires user approval, we simulate the 'used' state locally.
        // A true on-chain update typically means burning or updating metadata via a custom smart contract "markUsed" function.
        // We will log it.
        const txHash = "pending_onchain_update_or_burn";

        // 4. Log Usage
        await supabase.from('ticket_usages').insert({
            token_id: tokenId,
            contract_address: contractAddress,
            wallet_address: walletAddress,
            transaction_hash: txHash,
            status: "used"
        });

        // Audit Log
        await supabase.from('audit_logs').insert({
            user_id: 'Staff',
            action: 'TICKET_USED',
            details: { tokenId, contractAddress, walletAddress, txHash }
        });

        return NextResponse.json({ success: true, txHash });

    } catch (error: any) {
        console.error("Use ticket error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
