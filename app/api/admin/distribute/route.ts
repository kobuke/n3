import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffAuth } from '@/lib/staff-auth'
import { mintTo } from '@/lib/thirdweb'
import { computeMintExpiresAt } from '@/lib/sbt'

export async function POST(req: NextRequest) {
    const authError = await requireStaffAuth(req);
    if (authError) return authError;

    try {

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
        for (const input of emails) {
            const rawInput = input.trim()
            let recipientWallet = ""
            let recipientEmail: string | null = null

            const isWalletInput = rawInput.toLowerCase().startsWith('0x') && rawInput.length === 42

            if (isWalletInput) {
                recipientWallet = rawInput
            } else {
                recipientEmail = rawInput
                // Check user existance
                const { data: userRecord } = await supabase
                    .from("users")
                    .select("walletaddress")
                    .eq("email", rawInput.toLowerCase())
                    .maybeSingle()

                if (!userRecord || !userRecord.walletaddress) {
                    results.push({ email: rawInput, status: "error", message: "User not found or no wallet attached" })
                    continue
                }
                recipientWallet = userRecord.walletaddress
            }

            // Prepare metadata
            const mintedAt = new Date()
            const metadataAttributes: any[] = [
                { trait_type: "Type", value: templateData.type || "airdrop" },
                { trait_type: "Source", value: "Manual Distribution" },
                { trait_type: "TemplateID", value: templateId },
            ]
            const expiresAtStr = computeMintExpiresAt(templateData.validity_days, mintedAt)
            if (expiresAtStr) {
                metadataAttributes.push({ trait_type: "Expires_At", value: expiresAtStr })
            }

            const metadata = {
                name: templateData.name,
                description: templateData.description || "Minted via Staff Airdrop",
                image: templateData.image_url || undefined,
                attributes: metadataAttributes,
            }

            // Mint via lib/thirdweb.ts
            const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon"
            try {
                const mintData = await mintTo(chain, contractAddress, recipientWallet, metadata)
                const queueId = mintData.result?.queueId || null
                let minedTokenId = null;

                // Polling for transaction status (up to 12 seconds)
                if (queueId) {
                    for (let i = 0; i < 6; i++) {
                        await new Promise(r => setTimeout(r, 2000));
                        const statusRes = await fetch(`https://${process.env.THIRDWEB_ENGINE_URL}/transaction/status/${queueId}`, {
                            headers: { Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}` }
                        });
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            const status = statusData.result?.status;
                            if (status === "mined") {
                                minedTokenId = statusData.result?.tokenId;
                                break;
                            } else if (status === "errored") {
                                throw new Error(`Transaction reverted on-chain: ${statusData.result.errorMessage || 'Unknown error'}`);
                            }
                        }
                    }
                }

                // Save log
                const dummyOrderId = `manual-airdrop-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                await supabase.from("mint_logs").insert({
                    shopify_order_id: dummyOrderId,
                    shopify_product_id: null, // manual
                    product_name: templateData.name,
                    status: "success",
                    recipient_email: recipientEmail || "",
                    recipient_wallet: recipientWallet,
                    transaction_hash: queueId,
                    token_id: minedTokenId?.toString() || null,
                    contract_address: contractAddress,
                    template_id: templateId,
                })


                results.push({
                    email: rawInput,
                    status: "success",
                    message: "Successfully minted and distributed!"
                })

            } catch (err: any) {
                console.error("Airdrop error for", rawInput, err)

                const dummyOrderId = `manual-airdrop-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                await supabase.from("mint_logs").insert({
                    shopify_order_id: dummyOrderId,
                    shopify_product_id: null,
                    product_name: templateData.name,
                    status: "error",
                    recipient_email: recipientEmail || "",
                    recipient_wallet: recipientWallet,
                    error_message: err.message,
                })

                results.push({ email: rawInput, status: "error", message: err.message })
            }
        }

        return NextResponse.json({ success: true, results })

    } catch (e: any) {
        console.error("Distribute API Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
