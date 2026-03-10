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
            .select("nft_template_id, nft_template_ids, contract_address")
            .eq("shopify_product_id", productId)
            .maybeSingle();

        console.log(`[BG] Mapping for ${productId}:`, JSON.stringify({ mapping, error: mappingError }));

        const templateIdsToProcess = (mapping && mapping.nft_template_ids && mapping.nft_template_ids.length > 0)
            ? mapping.nft_template_ids
            : (mapping?.nft_template_id ? [mapping.nft_template_id] : [null]);

        if (!mapping || (templateIdsToProcess[0] === null && !mapping.contract_address)) {
            console.log(`[BG] No mapping found for product: ${productName} (${productId})`);
            continue;
        }

        // 2. ウォレットアドレスの決定（アイテムごとにキャッシュ可能だがここでは都度チェック）
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
                .select("walletaddress")
                .eq("email", customerEmail)
                .maybeSingle();

            console.log(`[BG] User lookup for ${customerEmail}:`, JSON.stringify({ userRecord, error: userError }));

            if (userRecord?.walletaddress) {
                recipientWallet = userRecord.walletaddress;
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
                        const { error: upsertError } = await supabase.from("users").upsert(
                            { email: customerEmail, walletaddress: newWalletAddress },
                            { onConflict: "email", ignoreDuplicates: true }
                        );
                        if (upsertError) {
                            console.error("[BG] Failed to save wallet to DB:", upsertError.message);
                        }

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

        // 3. 各テンプレートごとにMint処理
        for (const templateId of templateIdsToProcess) {
            // 冪等性チェック（二重ミント防止）
            const checkQuery = supabase
                .from("mint_logs")
                .select("id")
                .eq("shopify_order_id", orderId)
                .eq("shopify_product_id", productId)
                .eq("status", "success");

            if (templateId) {
                checkQuery.eq("template_id", templateId);
            } else {
                checkQuery.is("template_id", null);
            }

            const { data: existingLog } = await checkQuery.maybeSingle();

            if (existingLog) {
                console.log(`[BG] Already minted template ${templateId} for order ${orderId}, skipping.`);
                continue;
            }

            // テンプレート詳細取得
            let templateData: any = null;
            let contractAddressToUse = mapping.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;

            if (templateId) {
                const { data: tmpl } = await supabase
                    .from("nft_templates")
                    .select("*")
                    .eq("id", templateId)
                    .single();
                templateData = tmpl;
                if (tmpl?.contract_address) {
                    contractAddressToUse = tmpl.contract_address;
                }
            }

            console.log(`[BG] Using contract: ${contractAddressToUse}, template: ${templateData?.name || "none"}`);

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
                        { trait_type: "TemplateID", value: templateId || undefined },
                    ],
                };

                const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
                const mintUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/contract/${chain}/${contractAddressToUse}/erc1155/mint-to`;

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
                });

                const mintData = await mintRes.json();
                if (!mintRes.ok) {
                    throw new Error(`Mint failed: ${JSON.stringify(mintData)}`);
                }

                const txHash = mintData.result?.queueId || null;

                // 成功ログ
                const { error: insertSuccessError } = await supabase.from("mint_logs").insert({
                    shopify_order_id: orderId,
                    shopify_product_id: productId,
                    product_name: templateData?.name || productName,
                    status: "success",
                    recipient_email: customerEmail,
                    recipient_wallet: recipientWallet,
                    transaction_hash: txHash,
                    contract_address: contractAddressToUse,
                    template_id: templateId || null
                });

                if (insertSuccessError) {
                    console.error("[BG] ⚠️ Failed to insert success log:", insertSuccessError.message);
                } else {
                    console.log(`[BG] ✅ Mint SUCCESS for order ${orderId}, template ${templateId}`);
                }

                if (customerEmail) {
                    const appUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
                        ? process.env.NEXT_PUBLIC_APP_URL
                        : 'https://n3-nanjo-nft.netlify.app';

                    const nftName = templateData?.name || productName;

                    await resend.emails.send({
                        from: "なんじょうNFT <updates@resend.nomadresort.jp>",
                        to: customerEmail,
                        subject: `【なんじょうNFT】お受け取り準備が整いました！`,
                        html: `
                            <!DOCTYPE html>
                            <html lang="ja">
                            <head>
                                <meta charset="UTF-8">
                                <style>
                                    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; color: #333; }
                                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                                    .hero-image { width: 100%; height: auto; display: block; border-bottom: 1px solid #eee; }
                                    .content { padding: 40px 30px; text-align: center; }
                                    .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #1a1a1a; }
                                    .message { font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 30px; text-align: left; }
                                    .highlight { font-weight: bold; color: #1a8fc4; }
                                    .btn { display: inline-block; padding: 14px 32px; background-color: #1a8fc4; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; }
                                    .footer { padding: 25px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #fafafa; border-top: 1px solid #f3f4f6; }
                                    .address-box { margin-top: 15px; padding: 10px; background-color: #f9fafb; border-radius: 6px; font-family: monospace; font-size: 11px; color: #6b7280; word-break: break-all; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <!-- プロダクション環境では公開URLに置き換えてください -->
                                    <img src="https://n3-nanjo-nft.netlify.app/images/email-hero.webp" alt="Nanjo City" class="hero-image">
                                    <div class="content">
                                        <h1 class="title">NFTが届きました！</h1>
                                        <div class="message">
                                            南城市「N3」NFTシステムをご利用いただきありがとうございます。<br><br>
                                            ご購入いただいた <span class="highlight">「${nftName}」</span> のNFTが、お客様のウォレットへ配布されました。<br><br>
                                            下記のボタンよりマイページにログインして、取得したNFTをご確認ください。
                                        </div>
                                        <div class="btn-wrapper">
                                            <a href="${appUrl}" class="btn">マイページで確認する</a>
                                        </div>
                                        <div class="address-box">
                                            受取ウォレット: ${recipientWallet}
                                        </div>
                                    </div>
                                    <div class="footer">
                                        <p><strong>南城市デジタル住民・貢献プラットフォーム「N3」</strong></p>
                                        <p>※このメールは送信専用です。</p>
                                        <p>© Nanjo City NFT Project. All rights reserved.</p>
                                    </div>
                                </div>
                            </body>
                            </html>`,
                    });
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
                    template_id: templateId || null
                });
            }
        }
    }

    console.log(`[BG] Finished processing order ${orderId}`);
    return { statusCode: 200 };
};

export { handler };
