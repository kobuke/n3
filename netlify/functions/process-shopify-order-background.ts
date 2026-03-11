import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { sendNftDeliveryEmail } from "../../lib/email";
import { mintTo, updateTokenMetadata } from "../../lib/thirdweb";
import { buildMintLogEntry } from "../../lib/nft-helpers";
import { computeMintExpiresAt } from "../../lib/sbt";

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

    // --- ウォレットアドレスの決定（注文につき1回のみ実行） ---
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
        console.log(`[BG] Finished processing order ${orderId} (skipped, no wallet)`);
        return { statusCode: 200 };
    }
    // -----------------------------------------------------------

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

            // --- SBT 再購入による有効期限延長 ---
            // テンプレートがSBT（譲渡不可）かつ validity_days が設定されている場合、
            // 既に同じテンプレートのNFTを持っていれば新規ミントせずに期限リセットを行う
            if (templateData && !templateData.is_transferable && templateData.validity_days && templateId) {
                const { data: existingMint } = await supabase
                    .from("mint_logs")
                    .select("id, token_id")
                    .ilike("recipient_wallet", recipientWallet)
                    .eq("template_id", templateId)
                    .eq("status", "success")
                    .order("created_at", { ascending: false })
                    .maybeSingle();

                if (existingMint) {
                    console.log(`[BG] SBT Renewal detected: template ${templateId}, existing mint ${existingMint.id}`);

                    // mint_logs の created_at を現在日時に更新（期限リセット）
                    const now = new Date();
                    const newExpiresAt = new Date(now);
                    newExpiresAt.setDate(newExpiresAt.getDate() + templateData.validity_days);

                    await supabase
                        .from("mint_logs")
                        .update({ created_at: now.toISOString() })
                        .eq("id", existingMint.id);

                    // オンチェーンメタデータの Expires_At を更新
                    if (existingMint.token_id) {
                        try {
                            const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
                            await updateTokenMetadata(chain, contractAddressToUse, existingMint.token_id, {
                                attributes: [
                                    { trait_type: "Expires_At", value: newExpiresAt.toISOString() },
                                ],
                            });
                            console.log(`[BG] ✅ On-chain Expires_At updated to ${newExpiresAt.toISOString()}`);
                        } catch (metaErr: any) {
                            console.error(`[BG] ⚠️ Failed to update on-chain metadata:`, metaErr.message);
                        }
                    }

                    // 更新ログを記録
                    await supabase.from("mint_logs").insert({
                        shopify_order_id: orderId,
                        shopify_product_id: productId,
                        product_name: templateData.name,
                        status: "success",
                        recipient_email: customerEmail,
                        recipient_wallet: recipientWallet,
                        token_id: existingMint.token_id,
                        contract_address: contractAddressToUse,
                        template_id: templateId,
                        metadata: { action: "renewal", renewed_mint_id: existingMint.id, new_expires_at: newExpiresAt.toISOString() },
                    });

                    if (customerEmail) {
                        await sendNftDeliveryEmail({
                            to: customerEmail,
                            nftName: `${templateData.name}（更新）`,
                            recipientWallet,
                        });
                    }

                    console.log(`[BG] ✅ SBT Renewal SUCCESS: "${templateData.name}" for ${customerEmail}`);
                    continue; // 新規ミントをスキップ
                }
            }

            // 4. NFTミント
            console.log(`[BG] Minting NFT to ${recipientWallet}...`);
            try {
                // 有効期限の計算（SBTテンプレートで validity_days が設定されている場合）
                const mintedAt = new Date();
                const expiresAtStr = computeMintExpiresAt(templateData?.validity_days, mintedAt);

                const metadataAttributes: any[] = [
                    { trait_type: "Type", value: templateData?.type || "product" },
                    { trait_type: "Order ID", value: orderId },
                    { trait_type: "TemplateID", value: templateId || undefined },
                ];
                if (expiresAtStr) {
                    metadataAttributes.push({ trait_type: "Expires_At", value: expiresAtStr });
                }

                const metadata = {
                    name: templateData?.name || productName,
                    description: templateData?.description || "Minted via Shopify Webhook",
                    image: templateData?.image_url || undefined,
                    attributes: metadataAttributes,
                };

                const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
                const mintData = await mintTo(chain, contractAddressToUse, recipientWallet, metadata);
                const txHash = mintData.result?.queueId || null;

                // 成功ログ
                const logEntry = buildMintLogEntry({
                    walletAddress: recipientWallet,
                    contractAddress: contractAddressToUse,
                    templateId: templateId || null,
                    transactionHash: txHash,
                    source: orderId,
                    productName: templateData?.name || productName,
                    email: customerEmail,
                });
                // shopifyのログに固有のカラムを追加
                (logEntry as any).shopify_product_id = productId;

                const { error: insertSuccessError } = await supabase.from("mint_logs").insert(logEntry);

                if (insertSuccessError) {
                    console.error("[BG] ⚠️ Failed to insert success log:", insertSuccessError.message);
                } else {
                    console.log(`[BG] ✅ Mint SUCCESS for order ${orderId}, template ${templateId}`);
                }

                // ✉️ メール送信はon-chain確定後（Engine Webhook）に行うため、ここでは送らない
            } catch (error: any) {
                console.error("[BG] ❌ Minting FAILED:", error.message);

                const errorLogEntry = buildMintLogEntry({
                    walletAddress: recipientWallet,
                    contractAddress: contractAddressToUse,
                    templateId: templateId || null,
                    source: orderId,
                    productName: templateData?.name || productName,
                    email: customerEmail,
                });
                errorLogEntry.status = "error";
                errorLogEntry.error_message = error.message;
                (errorLogEntry as any).shopify_product_id = productId;

                await supabase.from("mint_logs").insert(errorLogEntry);
            }
        }
    }

    console.log(`[BG] Finished processing order ${orderId}`);
    return { statusCode: 200 };
};

export { handler };
