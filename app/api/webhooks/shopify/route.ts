import { createAdminClient } from '@/lib/supabase/server'
import { verifyShopifyWebhook } from '@/lib/shopify'
import { mintNFT } from '@/lib/crossmint'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
    console.log('[Webhook] ===== Shopify Webhook Received =====')

    const hmac = request.headers.get('X-Shopify-Hmac-Sha256')
    const rawBody = await request.text()

    console.log('[Webhook] HMAC header present:', !!hmac)
    console.log('[Webhook] Body length:', rawBody.length)
    console.log('[Webhook] SHOPIFY_WEBHOOK_SECRET set:', !!process.env.SHOPIFY_WEBHOOK_SECRET)

    if (!verifyShopifyWebhook(hmac, rawBody, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
        console.error('[Webhook] HMAC verification FAILED')
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
    }

    console.log('[Webhook] HMAC verification PASSED')

    const payload = JSON.parse(rawBody)

    // We are interested in orders/paid. 
    const orderId = String(payload.id)
    const customerEmail = payload.email || payload.customer?.email
    const lineItems = payload.line_items || []

    console.log(`[Webhook] Order ID: ${orderId}, Email: ${customerEmail}, Items: ${lineItems.length}`)

    const noteAttributes = payload.note_attributes || []
    const walletAttribute = noteAttributes.find((attr: any) => attr.name === 'Wallet Address' || attr.name === 'wallet_address')
    const recipientWallet = walletAttribute ? walletAttribute.value : null

    const supabase = createAdminClient()

    for (const item of lineItems) {
        const productId = String(item.product_id)
        const productName = item.title || 'Unknown Product'

        console.log(`[Webhook] Processing item: ${productName} (Product ID: ${productId})`)

        // 1. Check Mapping
        const { data: mapping, error: mappingError } = await supabase
            .from('mappings')
            .select('*')
            .eq('shopify_product_id', productId)
            .single()

        if (mappingError || !mapping) {
            console.log(`[Webhook] No mapping found for product ${productId}. Error:`, mappingError?.message)
            continue
        }

        console.log(`[Webhook] Mapping found: ${productId} -> ${mapping.crossmint_template_id}`)

        // 1.5. Idempotency Check: Don't mint if already successful
        const { data: existingLog } = await supabase
            .from('mint_logs')
            .select('id')
            .eq('shopify_order_id', orderId)
            .eq('shopify_product_id', productId)
            .eq('status', 'success')
            .single()

        if (existingLog) {
            console.log(`[Webhook] Order ${orderId} product ${productId} already minted. Skipping.`)
            continue
        }

        // 2. Mint NFT
        try {
            console.log(`[Webhook] Minting NFT for ${customerEmail || recipientWallet}...`)
            const mintResult = await mintNFT(
                mapping.crossmint_template_id,
                customerEmail,
                recipientWallet
            )

            console.log(`[Webhook] Mint SUCCESS:`, JSON.stringify(mintResult))

            // 3. Log Success
            await supabase.from('mint_logs').insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: productName,
                status: 'success',
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
            })

            console.log(`[Webhook] Logged success to mint_logs`)

        } catch (error: any) {
            console.error('[Webhook] Minting FAILED:', error.message)

            // 4. Log Error
            await supabase.from('mint_logs').insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: productName,
                status: 'error',
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
                error_message: error.message
            })

            // 5. Send Notification via Resend
            if (process.env.ADMIN_EMAIL) {
                await resend.emails.send({
                    from: 'NFT Minting System <noreply@resend.nomadresort.jp>',
                    to: process.env.ADMIN_EMAIL,
                    subject: `Minting Failed for Order #${payload.order_number}`,
                    html: `<p>Minting failed for product ${productName} (ID: ${productId}). Error: ${error.message}</p>`
                })
            }
        }
    }

    console.log('[Webhook] ===== Webhook Processing Complete =====')
    return NextResponse.json({ received: true })
}

