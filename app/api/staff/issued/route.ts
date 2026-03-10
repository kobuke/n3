import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireStaffAuth } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const authError = await requireStaffAuth(req);
    if (authError) return authError;

    try {
        const supabase = createAdminClient();

        // 成功したミントログを取得（配布済みNFT）
        const { data: mintLogs, error: mintError } = await supabase
            .from('mint_logs')
            .select(`
                id, 
                token_id, 
                contract_address, 
                template_id, 
                recipient_email, 
                recipient_wallet, 
                product_name, 
                created_at,
                shopify_order_id
            `)
            .eq('status', 'success')
            .order('created_at', { ascending: false });

        if (mintError) {
            throw new Error(mintError.message);
        }

        // テンプレート情報（画像URLやタイプを取得するため）
        // 外部キー制約が確定していないため、関連テーブルを別途取得して結合
        const { data: templates } = await supabase
            .from('nft_templates')
            .select('id, name, type, image_url');

        const templatesMap = new Map();
        templates?.forEach(t => templatesMap.set(t.id, t));

        // チケット使用状況（もぎり済みかどうか）
        const { data: usages } = await supabase
            .from('ticket_usages')
            .select('token_id, contract_address, status, used_at')
            .eq('status', 'used');

        const usagesMap = new Map();
        usages?.forEach(u => {
            usagesMap.set(`${u.contract_address?.toLowerCase()}-${u.token_id}`, u);
        });

        // データの結合
        const issuedNfts = mintLogs?.map(log => {
            const template = log.template_id ? templatesMap.get(log.template_id) : null;
            // contract_address と token_id が存在する場合のみ利用状況を取得
            const usageKey = log.contract_address && log.token_id ? `${log.contract_address.toLowerCase()}-${log.token_id}` : null;
            const usage = usageKey ? usagesMap.get(usageKey) : null;

            return {
                id: log.id,
                token_id: log.token_id,
                contract_address: log.contract_address,
                recipient_email: log.recipient_email,
                recipient_wallet: log.recipient_wallet,
                product_name: template?.name || log.product_name || (log.token_id ? `Ticket #${log.token_id}` : 'Syncing NFT Data...'),
                template_type: template?.type || 'unknown',
                image_url: template?.image_url || null,
                created_at: log.created_at,
                source: log.shopify_order_id?.startsWith('manual-airdrop') ? 'Airdrop/Manual' :
                    (log.shopify_order_id ? `Shopify(${log.shopify_order_id})` : 'Unknown'),
                is_used: !!usage,
                used_at: usage?.used_at || null,
            };
        }) || [];

        return NextResponse.json({ nfts: issuedNfts });
    } catch (e: any) {
        console.error("Staff issued APIs error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
