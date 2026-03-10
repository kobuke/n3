import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get('x-thirdweb-signature');

        // Webhook Secret Verification
        const webhookSecret = process.env.THIRDWEB_WEBHOOK_SECRET;
        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(bodyText)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('[Engine Webhook] Signature mismatch');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const payload = JSON.parse(bodyText);
        console.log(`[Engine Webhook] Received payload:`, JSON.stringify(payload));

        const status = payload.status?.toLowerCase();
        const queueId = payload.queueId;

        // Only process mined status (mint completed)
        if (status === 'mined') {
            let thirdwebTokenId = payload.result?.tokenId;

            if (queueId && thirdwebTokenId === undefined) {
                // EngineからのWebhookペイロードに直接tokenIdが含まれていない場合、詳細を問い合わせる
                console.log(`[Engine Webhook] TokenID missing in payload, fetching transaction details for queueId: ${queueId}`);
                try {
                    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
                    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;

                    if (engineUrl && accessToken) {
                        const urlStr = engineUrl.startsWith('http') ? engineUrl : `https://${engineUrl}`;
                        const response = await fetch(`${urlStr}/transaction/status/${queueId}`, {
                            headers: {
                                "Authorization": `Bearer ${accessToken}`,
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.result?.result?.tokenId !== undefined) {
                                thirdwebTokenId = data.result.result.tokenId;
                            } else if (data.result?.tokenId !== undefined) {
                                thirdwebTokenId = data.result.tokenId;
                            }
                        } else {
                            console.error(`[Engine Webhook] Failed to fetch transaction details: ${response.status}`);
                        }
                    }
                } catch (err) {
                    console.error('[Engine Webhook] Error fetching from Engine:', err);
                }
            }

            if (queueId && thirdwebTokenId !== undefined && thirdwebTokenId !== null) {
                console.log(`[Engine Webhook] Process mined transaction: ${queueId}, parsed TokenID: ${thirdwebTokenId}`);
                const supabase = createAdminClient();

                const { error: updateError } = await supabase
                    .from('mint_logs')
                    .update({
                        token_id: thirdwebTokenId.toString(),
                        status: 'success'
                    })
                    .eq('transaction_hash', queueId);

                if (updateError) {
                    console.error('[Engine Webhook] Failed to update mint_logs:', updateError);
                } else {
                    console.log(`[Engine Webhook] Successfully updated mint_logs for queueId ${queueId} with token_id ${thirdwebTokenId}`);
                }
            } else if (queueId) {
                console.log(`[Engine Webhook] Mined transaction ${queueId} still missing tokenId after fallback fetch. Engine might pass it differently depending on the contract call.`);
                // 成功ステータスのみ更新しておく
                const supabase = createAdminClient();
                await supabase
                    .from('mint_logs')
                    .update({ status: 'success' })
                    .eq('transaction_hash', queueId);
            }
        } else if (payload.status === 'errored') {
            console.error(`[Engine Webhook] Transaction ${payload.queueId} errored: ${payload.errorMessage}`);
            const supabase = createAdminClient();
            await supabase
                .from('mint_logs')
                .update({ status: 'errored' })
                .eq('transaction_hash', payload.queueId);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Engine Webhook] Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
