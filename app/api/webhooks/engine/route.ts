import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { sendNftDeliveryEmail } from '@/lib/email';

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
            const thirdwebTokenId = await resolveTokenId(payload);

            if (thirdwebTokenId !== undefined && thirdwebTokenId !== null) {
                console.log(`[Engine Webhook] Process mined transaction: ${queueId}, parsed TokenID: ${thirdwebTokenId}`);
                await updateMintLogWithRetry(queueId, {
                    token_id: thirdwebTokenId.toString(),
                    status: 'success'
                });
            } else {
                console.log(`[Engine Webhook] Mined transaction ${queueId} still missing tokenId after fallback fetch.`);
                // 成功ステータスのみ更新しておく
                await updateMintLogWithRetry(queueId, { status: 'success' });
            }
        } else if (payload.status === 'errored') {
            console.error(`[Engine Webhook] Transaction ${queueId} errored: ${payload.errorMessage}`);
            const supabase = createAdminClient();
            await supabase
                .from('mint_logs')
                .update({ status: 'errored' })
                .eq('transaction_hash', queueId);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Engine Webhook] Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

/**
 * ペイロードからtokenIdを取得する。ペイロードに無い場合はRPCに問い合わせて抽出する。
 */
async function resolveTokenId(payload: any): Promise<string | undefined> {
    let tokenId = payload.result?.tokenId;

    if (tokenId === undefined && payload.transactionHash && payload.chainId) {
        console.log(`[Engine Webhook] TokenID missing in payload, getting receipt for tx: ${payload.transactionHash}`);
        try {
            const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
            const rpcUrl = clientId 
                ? `https://${payload.chainId}.rpc.thirdweb.com/${clientId}` 
                : `https://${payload.chainId}.rpc.thirdweb.com`;
                
            const rpcResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_getTransactionReceipt",
                    params: [payload.transactionHash]
                })
            });

            if (rpcResponse.ok) {
                const rpcData = await rpcResponse.json();
                const logs = rpcData.result?.logs || [];

                // TransferSingle (ERC1155): 0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62
                const transferSingleLog = logs.find((log: any) =>
                    log.topics && log.topics[0] === "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"
                );

                if (transferSingleLog && transferSingleLog.data) {
                    const dataBytes = transferSingleLog.data.replace('0x', '');
                    if (dataBytes.length >= 64) {
                        const idHex = dataBytes.slice(0, 64);
                        tokenId = parseInt(idHex, 16).toString();
                        console.log(`[Engine Webhook] Extracted tokenId ${tokenId} from TransferSingle event.`);
                    }
                }

                // Transfer (ERC721/ERC20): 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
                if (tokenId === undefined) {
                    const transferLog = logs.find((log: any) =>
                        log.topics && log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
                    );
                    if (transferLog && transferLog.topics && transferLog.topics.length >= 4) {
                        tokenId = parseInt(transferLog.topics[3], 16).toString();
                        console.log(`[Engine Webhook] Extracted tokenId ${tokenId} from Transfer event.`);
                    }
                }
            } else {
                console.error(`[Engine Webhook] Failed to fetch receipt: ${rpcResponse.status}`);
            }
        } catch (err) {
            console.error('[Engine Webhook] Error fetching receipt from RPC:', err);
        }
    }

    return tokenId;
}

/**
 * DBへINSERTされるのを待ちながら、mint_logsを更新する
 */
async function updateMintLogWithRetry(queueId: string, updates: any) {
    if (!queueId) return;

    const supabase = createAdminClient();
    const MAX_RETRIES = 5;
    const WAIT_MS = 4000;

    for (let i = 0; i < MAX_RETRIES; i++) {
        const { data: checkData } = await supabase
            .from('mint_logs')
            .select('id')
            .eq('transaction_hash', queueId)
            .maybeSingle();

        if (checkData) {
            const { error: updateError } = await supabase
                .from('mint_logs')
                .update(updates)
                .eq('transaction_hash', queueId);

            if (updateError) {
                console.error('[Engine Webhook] Failed to update mint_logs:', updateError);
            } else {
                console.log(`[Engine Webhook] Successfully updated mint_logs for queueId ${queueId} with ${JSON.stringify(updates)}`);

                // ✉️ on-chain確定後にNFT配布完了メールを送信
                // recipient_emailがある場合のみ（Shopify購入経由のmintに限定）
                try {
                    const { data: logRow } = await supabase
                        .from('mint_logs')
                        .select('recipient_email, product_name, recipient_wallet')
                        .eq('transaction_hash', queueId)
                        .maybeSingle();

                    if (logRow?.recipient_email) {
                        await sendNftDeliveryEmail({
                            to: logRow.recipient_email,
                            nftName: logRow.product_name || 'NFT',
                            recipientWallet: logRow.recipient_wallet || '',
                        });
                        console.log(`[Engine Webhook] ✉️ Delivery email sent to ${logRow.recipient_email}`);
                    }
                } catch (emailError: any) {
                    // メール送信失敗はログのみ（mint自体は成功しているので致命的ではない）
                    console.error('[Engine Webhook] Failed to send delivery email:', emailError.message);
                }
            }
            return; // 成功したので終了
        }

        console.log(`[Engine Webhook] DB row for queueId ${queueId} not found yet. Waiting... (${i + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, WAIT_MS));
    }

    console.log(`[Engine Webhook] Gave up waiting for db row queueId ${queueId}.`);
}
