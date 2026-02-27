import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const handler: Handler = async (event) => {
    console.log("[BG] process-shopify-order-background invoked");

    let rawBody: string;
    try {
        const parsed = JSON.parse(event.body || "{}");
        rawBody = parsed.rawBody;
        if (!rawBody) throw new Error("rawBody missing");
    } catch (e) {
        console.error("[BG] Failed to parse request body:", e);
        return { statusCode: 400, body: "Bad request" };
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const resend = new Resend(process.env.RESEND_API_KEY);

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        console.error("[BG] Failed to parse Shopify payload:", e);
        return { statusCode: 400, body: "Invalid payload" };
    }

    const orderId = String(payload.id);
    const customerEmail = payload.email || payload.customer?.email;
    const lineItems = payload.line_items || [];

    console.log(`[BG] Processing order ${orderId} for ${customerEmail}, ${lineItems.length} item(s)`);

    for (const item of lineItems) {
        const productId = String(item.product_id);
        const productName = item.title || "Unknown Product";

        // 1. マッピング確認
        const { data: mapping, error: mappingError } = await supabase
            .from("mappings")
            .select("nft_template_id, contract_address")
            .eq("shopify_product_id", productId)
            .maybeSingle();

        console.log(`[BG] Mapping for ${productId}:`, JSON.stringify({ mapping, error: mappingError }));

        if (!mapping || (!mapping.nft_template_id && !mapping.contract_address)) {
            console.log(`[BG] No mapping found for product: ${productName} (${productId})`);
            continue;
        }

        // 1.5 テンプレート詳細取得
        let templateData: any = null;
        let contractAddressToUse = mapping.contract_address;

        if (mapping.nft_template_id) {
            const { data: tmpl } = await supabase
                .from("nft_templates")
                .select("*")
                .eq("id", mapping.nft_template_id)
                .single();
            templateData = tmpl;
            if (tmpl?.contract_address) {
                contractAddressToUse = tmpl.contract_address;
            }
        }

        if (!contractAddressToUse) {
            contractAddressToUse = process.env.NEXT_PUBLIC_COLLECTION_ID;
        }

        console.log(`[BG] Using contract: ${contractAddressToUse}, template: ${templateData?.name || "none"}`);

        // 2. 冪等性チェック（二重ミント防止）
        const { data: existingLog } = await supabase
            .from("mint_logs")
            .select("id")
            .eq("shopify_order_id", orderId)
            .eq("shopify_product_id", productId)
            .eq("status", "success")
            .maybeSingle();

        if (existingLog) {
            console.log(`[BG] Already minted order ${orderId} for product ${productId}, skipping.`);
            continue;
        }

        // 3. ウォレットアドレスの決定
        let recipientWallet: string | null = null;
        const noteAttributes = payload.note_attributes || [];
        const walletAttr = noteAttributes.find(
            (attr: any) => attr.name?.toLowerCase() === "wallet_address"
        );

        if (walletAttr?.value) {
            recipientWallet = walletAttr.value;
            console.log(`[BG] Using wallet from order notes: ${recipientWallet}`);
        }

        // DBからメールでウォレットを検索（重複作成防止）
        if (!recipientWallet && customerEmail) {
            const { data: userRecord, error: userError } = await supabase
                .from("users")
                .select("walletAddress")
                .eq("email", customerEmail)
                .maybeSingle();

            console.log(`[BG] User lookup for ${customerEmail}:`, JSON.stringify({ userRecord, error: userError }));

            if (userRecord?.walletAddress) {
                recipientWallet = userRecord.walletAddress;
                console.log(`[BG] Found existing wallet: ${recipientWallet}`);
            } else {
                // ウォレットなし → Thirdweb Engine でバックエンドウォレットを自動生成
                try {
                    console.log(`[BG] Creating Engine Backend Wallet for ${customerEmail}...`);
                    const createUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/backend-wallet/create`;
                    const res = await fetch(createUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
                        },
                        body: JSON.stringify({ label: `user-${customerEmail}` }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const newWalletAddress = data.result.walletAddress;
                        console.log(`[BG] Engine wallet created: ${newWalletAddress}`);

                        // upsert で重複挿入を防止
                        await supabase.from("users").upsert(
                            { email: customerEmail, walletAddress: newWalletAddress },
                            { onConflict: "email", ignoreDuplicates: true }
                        );

                        recipientWallet = newWalletAddress;
                    } else {
                        const errText = await res.text();
                        throw new Error(`Engine wallet creation failed: ${errText}`);
                    }
                } catch (e: any) {
                    console.error("[BG] Engine Wallet Creation Failed:", e.message);
                }
            }
        }

        if (!recipientWallet || recipientWallet.includes("@")) {
            console.error(`[BG] No valid wallet for ${customerEmail}. Cannot mint.`);
            continue;
        }

        // 4. NFTミント
        console.log(`[BG] Minting NFT to ${recipientWallet}...`);
        try {
            const metadata = {
                name: templateData?.name || productName,
                description: templateData?.description || "Minted via Shopify Webhook",
                image: templateData?.image_url || undefined,
                attributes: [
                    { trait_type: "Type", value: templateData?.type || "product" },
                    { trait_type: "Order ID", value: orderId },
                ],
            };

            // Thirdweb Engine でミント
            const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
            const mintUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/contract/${chain}/${contractAddressToUse}/erc1155/mint-to`;
            console.log(`[BG] Calling mint endpoint: ${mintUrl}`);

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
                        metadata,
                        supply: "1",
                    },
                }),
            });

            const mintData = await mintRes.json();
            console.log(`[BG] Mint response:`, JSON.stringify(mintData));

            if (!mintRes.ok) {
                throw new Error(`Mint failed: ${JSON.stringify(mintData)}`);
            }

            // 5. 成功ログ
            await supabase.from("mint_logs").insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: templateData?.name || productName,
                status: "success",
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
                details: { mintData, contractAddress: contractAddressToUse },
            });

            console.log(`[BG] ✅ Mint SUCCESS for order ${orderId}`);

            // 成功メール送信
            if (customerEmail) {
                await resend.emails.send({
                    from: "N3 NFT System <updates@nomadresort.io>",
                    to: customerEmail,
                    subject: `Your NFT is ready!`,
                    html: `<p>Your NFT for ${templateData?.name || productName} has been minted to your wallet (${recipientWallet}).</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://n3-nanjo-nft.netlify.app"}">Log in to view your NFT</a></p>`,
                });
                console.log(`[BG] Confirmation email sent to ${customerEmail}`);
            }
        } catch (error: any) {
            console.error("[BG] ❌ Minting FAILED:", error.message);

            await supabase.from("mint_logs").insert({
                shopify_order_id: orderId,
                shopify_product_id: productId,
                product_name: templateData?.name || productName,
                status: "error",
                recipient_email: customerEmail,
                recipient_wallet: recipientWallet,
                error_message: error.message,
            });
        }
    }

    console.log(`[BG] Finished processing order ${orderId}`);
    return { statusCode: 200 };
};

export { handler };
