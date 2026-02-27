import { createAdminClient } from '@/lib/supabase/server'
import { verifyShopifyWebhook } from '@/lib/shopify'
import { mintTo } from '@/lib/thirdweb'
import { Resend } from 'resend'
import { NextResponse, after } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
    const hmac = request.headers.get('X-Shopify-Hmac-Sha256')
    const rawBody = await request.text()

    // HMAC検証 - 失敗時のみ即時エラー応答
    if (!verifyShopifyWebhook(hmac, rawBody, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
        console.error('[Webhook] HMAC verification FAILED')
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
    }

    console.log('[Webhook] HMAC verified OK, scheduling background processing...')

    // ✅ after() を使って200応答後も確実にバックグラウンド処理を実行
    after(async () => {
        console.log('[Webhook] Background processing started')
        await processShopifyOrder(rawBody)
        console.log('[Webhook] Background processing complete')
    })

    return NextResponse.json({ received: true })
}

// バックグラウンド処理（200応答後に実行）
async function processShopifyOrder(rawBody: string) {
    const payload = JSON.parse(rawBody)

    const orderId = String(payload.id)
    const customerEmail = payload.email || payload.customer?.email
    const lineItems = payload.line_items || []

    const supabase = createAdminClient()

    for (const item of lineItems) {
        const productId = String(item.product_id)
        const productName = item.title || 'Unknown Product'

        // 1. マッピング確認
        const { data: mapping, error: mappingError } = await supabase
            .from('mappings')
            .select('nft_template_id, contract_address')
            .eq('shopify_product_id', productId)
            .maybeSingle()

        console.log(`[Webhook] Mapping query for product ${productId}:`, JSON.stringify({ mapping, error: mappingError }))

        if (mappingError) {
            console.error(`[Webhook] Mapping query error:`, mappingError.message, mappingError.details)
        }

        if (!mapping || (!mapping.nft_template_id && !mapping.contract_address)) {
            console.log(`[Webhook] No mapping found for product: ${productName} (${productId})`)
            continue
        }

        // 1.5 テンプレート詳細取得
        let templateData = null;
        let contractAddressToUse = mapping.contract_address;

        if (mapping.nft_template_id) {
            const { data: tmpl } = await supabase
                .from('nft_templates')
                .select('*')
                .eq('id', mapping.nft_template_id)
                .single()
            templateData = tmpl;
            if (tmpl && tmpl.contract_address) {
                contractAddressToUse = tmpl.contract_address;
            }
        }

        if (!contractAddressToUse) {
            contractAddressToUse = process.env.NEXT_PUBLIC_COLLECTION_ID;
        }

        // 2. 冪等性チェック（二重ミント防止）
        const { data: existingLog } = await supabase
            .from('mint_logs')
            .select('id')
            .eq('shopify_order_id', orderId)
            .eq('shopify_product_id', productId)
            .eq('status', 'success')
            .single()

        if (existingLog) {
            console.log(`[Webhook] Already minted order ${orderId}, skipping.`)
            continue
        }

        // 3. ウォレットアドレスの決定
        let recipientWallet: string | null = null;
        const noteAttributes = payload.note_attributes || [];
        const walletAttr = noteAttributes.find((attr: any) => attr.name?.toLowerCase() === 'wallet_address');

        if (walletAttr && walletAttr.value) {
            recipientWallet = walletAttr.value;
        }

        // DBからメールでウォレットを検索（重複ウォレット防止）
        if (!recipientWallet && customerEmail) {
            const { data: userRecord } = await supabase
                .from('users')
                .select('walletAddress')
                .eq('email', customerEmail)
                .maybeSingle()

            if (userRecord?.walletAddress) {
                recipientWallet = userRecord.walletAddress;
                console.log(`[Webhook] Found existing wallet for ${customerEmail}: ${recipientWallet}`);
            } else {
                // ウォレットなし → Thirdweb Engine でバックエンドウォレットを自動生成
                try {
                    console.log(`[Webhook] Creating Engine Backend Wallet for ${customerEmail}...`)
                    const createUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/backend-wallet/create`;
                    const engineHeaders = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
                    };
                    const createBody = JSON.stringify({ label: `user-${customerEmail}` });
                    const res = await fetch(createUrl, { method: "POST", headers: engineHeaders, body: createBody });

                    if (res.ok) {
                        const data = await res.json();
                        const newWalletAddress = data.result.walletAddress;

                        // upsert で重複挿入を防止（同メールなら更新しない）
                        await supabase.from('users').upsert(
                            { email: customerEmail, walletAddress: newWalletAddress },
                            { onConflict: 'email', ignoreDuplicates: true }
                        );

                        recipientWallet = newWalletAddress;
                        console.log(`[Webhook] Successfully created and saved wallet: ${newWalletAddress}`);
                    } else {
                        throw new Error(await res.text());
                    }
                } catch (e: any) {
                    console.error("[Webhook] Engine Wallet Creation Failed:", e.message);
                }
            }
        }

        if (!recipientWallet) {
            console.error(`[Webhook] No wallet could be found or created for ${customerEmail}. Cannot mint.`)
            continue
        }

        // 4. NFTミント
        try {
            const isEmail = recipientWallet.includes('@');
            if (isEmail) {
                console.log("Recipient is still an email. Engine wallet creation probably failed.");
                throw new Error("Wallet creation failed.");
            }

            const metadata = {
                name: templateData ? templateData.name : productName,
                description: templateData ? templateData.description : "Minted via Shopify Webhook",
                image: templateData ? templateData.image_url : undefined,
                attributes: [
                    { trait_type: "Type", value: templateData ? templateData.type : "product" },
                    { trait_type: "Order ID", value: orderId }
                ]
            }

            const mintResult = await mintTo(
                process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon",
                contractAddressToUse!,
                recipientWallet,
                metadata
            )

            // 5. 成功ログ
            await supabase.from('mint_logs').insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: templateData ? templateData.name : productName,
                status: 'success',
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
                details: { mintResult, contractAddress: contractAddressToUse }
            })

            // 成功メール送信
            if (customerEmail) {
                await resend.emails.send({
                    from: 'N3 NFT System <updates@nomadresort.io>',
                    to: customerEmail,
                    subject: `Your NFT is ready!`,
                    html: `<p>Your NFT for ${productName} has been minted to ${recipientWallet}.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://n3-nanjo-nft.netlify.app'}">Log in to view your NFT</a></p>`
                })
            }

        } catch (error: any) {
            console.error('[Webhook] Minting FAILED:', error.message)

            await supabase.from('mint_logs').insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: templateData ? templateData.name : productName,
                status: 'error',
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
                error_message: error.message
            })

            if (process.env.ADMIN_EMAIL) {
                await resend.emails.send({
                    from: 'NFT System <noreply@resend.nomadresort.jp>',
                    to: process.env.ADMIN_EMAIL,
                    subject: `Minting Failed for Order #${payload.order_number}`,
                    html: `<p>Fix needed. Minting failed for product ${productName} (ID: ${productId}). Error: ${error.message}</p>`
                })
            }
        }
    }
}
