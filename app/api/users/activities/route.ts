import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.walletAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const walletAddress = session.walletAddress;
        const supabase = createAdminClient();

        // 1. Fetch acquired NFTs (Mints & Claims)
        const { data: mints } = await supabase
            .from("mint_logs")
            .select("id, product_name, status, created_at, transaction_hash, shopify_order_id")
            .eq("recipient_wallet", walletAddress)
            .order("created_at", { ascending: false })
            .limit(20);

        // 2. Fetch usages
        const { data: usages } = await supabase
            .from("ticket_usages")
            .select("id, token_id, status, used_at, transaction_hash")
            .eq("wallet_address", walletAddress)
            .order("used_at", { ascending: false })
            .limit(20);

        // 3. Fetch transfers out
        const { data: transfers } = await supabase
            .from("transfer_links")
            .select("id, tokenid, status, created_at, transaction_hash")
            .eq("giveraddress", walletAddress)
            .order("created_at", { ascending: false })
            .limit(20);

        const activities: any[] = [];

        mints?.forEach(m => {
            const isTransfer = m.shopify_order_id?.startsWith('transfer-claim-');
            activities.push({
                id: `mint-${m.id}`,
                type: isTransfer ? 'received' : 'mint',
                status: m.status,
                title: isTransfer ? 'チケットを受け取りました' : 'チケットを獲得しました',
                description: m.product_name || 'NFT Ticket',
                date: new Date(m.created_at).getTime(),
                txHash: m.transaction_hash
            });
        });

        usages?.forEach(u => {
            activities.push({
                id: `use-${u.id}`,
                type: 'use',
                status: 'success', // usages are generally success if logged
                title: 'チケットを使用しました',
                description: `Token ID: ${u.token_id}`,
                date: new Date(u.used_at).getTime(),
                txHash: u.transaction_hash
            });
        });

        transfers?.forEach(t => {
            // Only show CLAIMED ones as completed transfers, or ACTIVE as pending
            let title = '譲渡リンクを作成しました';
            if (t.status === 'CLAIMED') title = 'チケットを譲渡しました';
            else if (t.status === 'CANCELLED') title = '譲渡がキャンセルされました';
            else if (t.status === 'EXPIRED') title = '譲渡リンクが期限切れになりました';

            activities.push({
                id: `transfer-${t.id}`,
                type: 'transfer',
                status: t.status === 'CLAIMED' ? 'success' : (t.status === 'ACTIVE' ? 'pending' : 'failed'),
                title: title,
                description: `Token ID: ${t.tokenid}`,
                date: new Date(t.created_at).getTime(), // Should Ideally be claimed_at if we had it
                txHash: t.transaction_hash
            });
        });

        activities.sort((a, b) => b.date - a.date);

        return NextResponse.json({ activities: activities.slice(0, 30) });

    } catch (err: unknown) {
        return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
    }
}
