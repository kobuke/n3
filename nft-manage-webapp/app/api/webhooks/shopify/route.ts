import { createAdminClient } from '@/lib/supabase/server'
import { verifyShopifyWebhook } from '@/lib/shopify'
import { mintNFT } from '@/lib/crossmint'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
    const hmac = request.headers.get('X-Shopify-Hmac-Sha256')
    const rawBody = await request.text()

    if (!verifyShopifyWebhook(hmac, rawBody, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // We are interested in orders/paid. 
    const orderId = String(payload.id)
    const customerEmail = payload.email || payload.customer?.email
    const lineItems = payload.line_items || []

    const noteAttributes = payload.note_attributes || []
    const walletAttribute = noteAttributes.find((attr: any) => attr.name === 'Wallet Address' || attr.name === 'wallet_address')
    const recipientWallet = walletAttribute ? walletAttribute.value : null

    const supabase = createAdminClient()

    for (const item of lineItems) {
        const productId = String(item.product_id)
        const productName = item.title || 'Unknown Product'

        // 1. Check Mapping
        const { data: mapping, error: mappingError } = await supabase
            .from('mappings')
            .select('*')
            .eq('shopify_product_id', productId)
            .single()

        if (mappingError || !mapping) {
            console.log(`No mapping found for product ${productId}`)
            continue
        }

        // 1.5. Idempotency Check: Don't mint if already successful
        const { data: existingLog } = await supabase
            .from('mint_logs')
            .select('id')
            .eq('shopify_order_id', orderId)
            .eq('shopify_product_id', productId)
            .eq('status', 'success')
            .single()

        if (existingLog) {
            console.log(`Order ${orderId} product ${productId} already minted. Skipping.`)
            continue
        }

        // 2. Mint NFT
        try {
            const mintResult = await mintNFT(
                mapping.crossmint_template_id,
                customerEmail,
                recipientWallet
            )

            // 3. Log Success
            await supabase.from('mint_logs').insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: productName,
                status: 'success',
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
                // Store mint result details if needed
            })

        } catch (error: any) {
            console.error('Minting failed:', error)

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
                    from: 'NFT Minting System <noreply@resend.dev>', // Update with your domain
                    to: process.env.ADMIN_EMAIL,
                    subject: `Minting Failed for Order #${payload.order_number}`,
                    html: `<p>Minting failed for product ${productName} (ID: ${productId}). Error: ${error.message}</p>`
                })
            }
        }
    }

    return NextResponse.json({ received: true })
}
