import { createAdminClient } from '@/lib/supabase/server'
import { verifyShopifyWebhook } from '@/lib/shopify'
import { mintTo } from '@/lib/thirdweb'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// Here we simulate generating a wallet on thirdweb engine for a new user
// In a real production setup, if using embedded wallets via Engine/Auth, 
// you would call your embedded wallet creation endpoint.
// For now, we will assume backend wallet mints directly to email via engine if possible,
// or we create a dummy wallet address if they don't have one and we can't create one.
// The best approach using thirdweb is utilizing embedded wallets (email -> wallet).

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
    const hmac = request.headers.get('X-Shopify-Hmac-Sha256')
    const rawBody = await request.text()

    if (!verifyShopifyWebhook(hmac, rawBody, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
        console.error('[Webhook] HMAC verification FAILED')
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    const orderId = String(payload.id)
    const customerEmail = payload.email || payload.customer?.email
    const lineItems = payload.line_items || []

    const supabase = createAdminClient()

    for (const item of lineItems) {
        const productId = String(item.product_id)
        const productName = item.title || 'Unknown Product'

        // 1. Check Mapping (Now using nft_template_id)
        const { data: mapping } = await supabase
            .from('mappings')
            .select('nft_template_id, contract_address')
            .eq('shopify_product_id', productId)
            .maybeSingle()

        if (!mapping || (!mapping.nft_template_id && !mapping.contract_address)) {
            console.log(`[Webhook] No mapping found for product: ${productName} (${productId})`)
            continue
        }

        // 1.5 Fetch Template Details if exists
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
            contractAddressToUse = process.env.NEXT_PUBLIC_COLLECTION_ID; // Fallback
        }

        // 2. Idempotency Check
        const { data: existingLog } = await supabase
            .from('mint_logs')
            .select('id')
            .eq('shopify_order_id', orderId)
            .eq('shopify_product_id', productId)
            .eq('status', 'success')
            .single()

        if (existingLog) continue

        // 3. Determine Wallet Address
        // Check if user provided wallet in order notes/attributes
        let recipientWallet = null;
        const noteAttributes = payload.note_attributes || [];
        const walletAttr = noteAttributes.find((attr: any) => attr.name?.toLowerCase() === 'wallet_address');

        if (walletAttr && walletAttr.value) {
            recipientWallet = walletAttr.value;
        }

        // If no wallet in order, check DB by email
        if (!recipientWallet && customerEmail) {
            const { data: userRecord } = await supabase
                .from('users')
                .select('walletAddress')
                .eq('email', customerEmail)
                .single()

            if (userRecord?.walletAddress) {
                recipientWallet = userRecord.walletAddress;
            } else {
                // AUTO-CREATE WALLET VIA THIRDWEB ENGINE
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

                        // Save the new user and their wallet to Supabase
                        await supabase.from('users').insert({
                            email: customerEmail,
                            walletAddress: newWalletAddress
                        });

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

        // 4. Mint NFT
        try {
            const metadata = {
                name: templateData ? templateData.name : productName,
                description: templateData ? templateData.description : "Minted via Shopify Webhook",
                image: templateData ? templateData.image_url : undefined,
                attributes: [
                    { trait_type: "Type", value: templateData ? templateData.type : "product" },
                    { trait_type: "Order ID", value: orderId }
                ]
            }

            // actualWallet is the actual hex address (either user's attached wallet or the newly created backend wallet)
            const isEmail = recipientWallet.includes('@');
            let actualWallet = recipientWallet;

            if (isEmail) {
                // If it's still an email at this point, wallet creation failed.
                console.log("Recipient is still an email. Engine wallet creation probably failed.");
                throw new Error("Waller creation failed. Contacting user via email.");
            }

            const mintResult = await mintTo(
                process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon",
                contractAddressToUse!,
                actualWallet,
                metadata
            )

            // 5. Log Success
            await supabase.from('mint_logs').insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: templateData ? templateData.name : productName,
                status: 'success',
                recipient_email: customerEmail,
                recipient_wallet: actualWallet,
                details: { mintResult, contractAddress: contractAddressToUse }
            })

            // Email success to user
            if (customerEmail) {
                await resend.emails.send({
                    from: 'N3 NFT System <updates@nomadresort.io>',
                    to: customerEmail,
                    subject: `Your NFT is ready!`,
                    html: `<p>Your NFT for ${productName} has been minted to ${actualWallet}.</p>`
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

            // For emails without wallets, send instructional email
            if (recipientWallet?.includes('@')) {
                await resend.emails.send({
                    from: 'N3 Support <support@nomadresort.io>',
                    to: customerEmail,
                    subject: `Claim your NFT for ${productName}`,
                    html: `<p>Thank you for your purchase! To receive your NFT, please click <a href="${process.env.NEXT_PUBLIC_APP_URL}/">here</a> to log in and create your wallet to claim it.</p>`
                })
            } else if (process.env.ADMIN_EMAIL) {
                await resend.emails.send({
                    from: 'NFT System <noreply@resend.nomadresort.jp>',
                    to: process.env.ADMIN_EMAIL,
                    subject: `Minting Failed for Order #${payload.order_number}`,
                    html: `<p>Fix needed. Minting failed for product ${productName} (ID: ${productId}). Error: ${error.message}</p>`
                })
            }
        }
    }

    return NextResponse.json({ received: true })
}
