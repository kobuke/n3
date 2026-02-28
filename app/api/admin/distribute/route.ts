import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()
        const staffSecret = cookieStore.get("nanjo_staff_secret")?.value

        if (staffSecret !== process.env.STAFF_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { templateId, emails } = body

        if (!templateId || !emails || !Array.isArray(emails)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Fetch template
        const { data: templateData, error: templateError } = await supabase
            .from("nft_templates")
            .select("*")
            .eq("id", templateId)
            .single()

        if (templateError || !templateData) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 })
        }

        const contractAddress = templateData.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID

        if (!contractAddress) {
            return NextResponse.json({ error: "No contract configuration found" }, { status: 500 })
        }

        const results = []

        // Process each email sequentially or in parallel
        for (const email of emails) {
            // Check user existance
            const { data: userRecord } = await supabase
                .from("users")
                .select("walletaddress")
                .eq("email", email.trim())
                .maybeSingle()

            if (!userRecord || !userRecord.walletaddress) {
                results.push({ email, status: "error", message: "User not found or no wallet attached" })
                continue
            }

            const recipientWallet = userRecord.walletaddress

            // Prepare metadata
            const metadata = {
                name: templateData.name,
                description: templateData.description || "Minted via Staff Airdrop",
                image: templateData.image_url || undefined,
                attributes: [
                    { trait_type: "Type", value: templateData.type || "airdrop" },
                    { trait_type: "Source", value: "Manual Distribution" }
                ],
            }

            // Mint
            const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon"
            const mintUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/contract/${chain}/${contractAddress}/erc1155/mint-to`

            try {
                const mintRes = await fetch(mintUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
                        "x-backend-wallet-address": process.env.THIRDWEB_ENGINE_BACKEND_WALLET!,
                    },
                    body: JSON.stringify({
                        receiver: recipientWallet,
                        metadataWithSupply: {
                            metadata: metadata,
                            supply: "1",
                        },
                    }),
                })

                const mintData = await mintRes.json()

                if (!mintRes.ok) {
                    throw new Error(mintData.error?.message || "Mint engine failed")
                }

                const txHash = mintData.result?.queueId || null

                // Save log
                const dummyOrderId = `manual-airdrop-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                await supabase.from("mint_logs").insert({
                    shopify_order_id: dummyOrderId,
                    shopify_product_id: null, // manual
                    product_name: templateData.name,
                    status: "success",
                    recipient_email: email,
                    recipient_wallet: recipientWallet,
                    transaction_hash: txHash,
                })

                results.push({
                    email,
                    status: "success",
                    message: "Successfully minted and distributed!"
                })

            } catch (err: any) {
                console.error("Airdrop error for", email, err)

                const dummyOrderId = `manual-airdrop-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                await supabase.from("mint_logs").insert({
                    shopify_order_id: dummyOrderId,
                    shopify_product_id: null,
                    product_name: templateData.name,
                    status: "error",
                    recipient_email: email,
                    recipient_wallet: recipientWallet,
                    error_message: err.message,
                })

                results.push({ email, status: "error", message: err.message })
            }
        }

        return NextResponse.json({ success: true, results })

    } catch (e: any) {
        console.error("Distribute API Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
