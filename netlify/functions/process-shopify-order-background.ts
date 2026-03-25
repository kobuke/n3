import type { Handler } from "@netlify/functions";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendNftDeliveryEmail, sendSbtDuplicateEmail } from "../../lib/email";
import { mintTo, updateTokenMetadata } from "../../lib/thirdweb";
import { buildMintLogEntry, MintLogEntry } from "../../lib/nft-helpers";
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

    // --- ウォレットアドレスの決定 ---
    let recipientWallet: string | null = await resolveRecipientWallet(supabase, payload, customerEmail, lineItems);

    if (!recipientWallet || recipientWallet.includes("@")) {
        console.error(`[BG] No valid wallet for ${customerEmail}. Cannot mint.`);
        console.log(`[BG] Finished processing order ${orderId} (skipped, no wallet)`);
        return { statusCode: 200 };
    }

    // --- 各商品の処理 ---
    for (const item of lineItems) {
        const productId = String(item.product_id);
        const productName = item.title || "Unknown Product";

        // マッピング取得
        const { data: mapping } = await supabase
            .from("mappings")
            .select("nft_template_id, nft_template_ids, contract_address")
            .eq("shopify_product_id", productId)
            .limit(1)
            .maybeSingle();

        if (!mapping) {
            console.log(`[BG] No mapping found for product: ${productName} (${productId})`);
            continue;
        }

        const templateIdsToProcess = (mapping.nft_template_ids && mapping.nft_template_ids.length > 0)
            ? mapping.nft_template_ids
            : (mapping.nft_template_id ? [mapping.nft_template_id] : [null]);

        for (const templateId of templateIdsToProcess) {
            await processTemplateMint({
                supabase,
                orderId,
                productId,
                productName,
                customerEmail,
                recipientWallet,
                templateId,
                mappingContract: mapping.contract_address
            });
        }
    }

    console.log(`[BG] Finished processing order ${orderId}`);
    return { statusCode: 200 };
};

/**
 * 個別のNFTテンプレートのミント処理（冪等性チェック含む）
 */
async function processTemplateMint(params: {
    supabase: SupabaseClient;
    orderId: string;
    productId: string;
    productName: string;
    customerEmail: string;
    recipientWallet: string;
    templateId: string | null;
    mappingContract: string | null;
}) {
    const { supabase, orderId, productId, productName, customerEmail, recipientWallet, templateId, mappingContract } = params;

    // 1. テンプレート詳細の取得
    let templateData: any = null;
    let contractAddressToUse = mappingContract || process.env.NEXT_PUBLIC_COLLECTION_ID || "";

    if (templateId) {
        const { data: tmpl } = await supabase.from("nft_templates").select("*").eq("id", templateId).single();
        templateData = tmpl;
        if (tmpl?.contract_address) contractAddressToUse = tmpl.contract_address;
    }

    // 2. 冪等性チェック（二重ミント防止）
    const { data: existingLogs } = await supabase
        .from("mint_logs")
        .select("id, status")
        .eq("shopify_order_id", orderId)
        .eq("shopify_product_id", productId)
        .filter("template_id", templateId ? "eq" : "is", templateId)
        .limit(1);

    if (existingLogs && existingLogs.length > 0) {
        const status = existingLogs[0].status;
        if (["success", "pending"].includes(status)) {
            console.log(`[BG] Skip: Already exists (status: ${status}) for template ${templateId}, order ${orderId}`);
            return;
        }
    }

    // 3. 処理開始ロック（pendingステータスで先行挿入）
    const logEntry = buildMintLogEntry({
        walletAddress: recipientWallet,
        contractAddress: contractAddressToUse,
        templateId,
        source: orderId,
        productName: templateData?.name || productName,
        email: customerEmail,
    });
    (logEntry as any).shopify_product_id = productId;
    logEntry.status = "pending";

    const { data: lockRow, error: lockErr } = await supabase.from("mint_logs").insert(logEntry).select("id").single();
    if (lockErr) {
        console.error("[BG] Failed to create pending lock:", lockErr.message);
        // 他のプロセスが先に作成した可能性があるため、一応戻る
        return;
    }
    const lockId = lockRow.id;

    try {
        // 4. SBT 重複チェック / 期間延長ロジック
        if (templateData && !templateData.is_transferable && templateId) {
            const { data: existingMint } = await supabase
                .from("mint_logs")
                .select("id, token_id")
                .ilike("recipient_wallet", recipientWallet)
                .eq("template_id", templateId)
                .eq("status", "success")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingMint) {
                if (templateData.validity_days) {
                    await handleSbtRenewal(supabase, lockId, existingMint, templateData, customerEmail, recipientWallet, contractAddressToUse, orderId, productId);
                } else {
                    await handleSbtSkip(supabase, lockId, templateData, customerEmail);
                }
                return;
            }
        }

        // 5. 新規ミント実行
        console.log(`[BG] Minting new NFT for ${customerEmail}...`);
        const mintedAt = new Date();
        const expiresAtStr = computeMintExpiresAt(templateData?.validity_days, mintedAt);

        const metadata = {
            name: templateData?.name || productName,
            description: templateData?.description || "Minted via Shopify Webhook",
            image: templateData?.image_url || undefined,
            attributes: [
                { trait_type: "Type", value: templateData?.type || "product" },
                { trait_type: "Order ID", value: orderId },
                { trait_type: "TemplateID", value: templateId || undefined },
                ...(expiresAtStr ? [{ trait_type: "Expires_At", value: expiresAtStr }] : [])
            ],
        };

        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
        const mintResult = await mintTo(chain, contractAddressToUse, recipientWallet, metadata);
        const txHash = mintResult.result?.queueId || null;

        // 成功ステータスへ更新
        await supabase.from("mint_logs").update({
            status: "success",
            transaction_hash: txHash,
            token_id: null // TokenIDはWebhook(Engine)側で後ほど埋められる
        }).eq("id", lockId);

        // クォータ（supply）の更新
        if (templateId) {
            await supabase.rpc("increment_nft_template_supply", { p_template_id: templateId });
        }

        console.log(`[BG] ✅ Mint success queued: ${txHash}`);

    } catch (error: any) {
        console.error("[BG] ❌ Mint processing failed:", error.message);
        await supabase.from("mint_logs").update({
            status: "error",
            error_message: error.message
        }).eq("id", lockId);
    }
}

/**
 * SBTの有効期限延長処理
 */
async function handleSbtRenewal(supabase: SupabaseClient, lockId: string, existingMint: any, templateData: any, customerEmail: string, recipientWallet: string, contractAddress: string, orderId: string, productId: string) {
    console.log(`[BG] SBT Renewal: template ${templateData.id}`);
    const now = new Date();
    const newExpiresAt = new Date(now);
    newExpiresAt.setDate(newExpiresAt.getDate() + templateData.validity_days);

    // 既存レコードのタイムスタンプ更新（期限の起点を現在にする）
    await supabase.from("mint_logs").update({ created_at: now.toISOString() }).eq("id", existingMint.id);

    // オンチェーンメタデータ更新
    if (existingMint.token_id) {
        try {
            const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";
            await updateTokenMetadata(chain, contractAddress, existingMint.token_id, {
                attributes: [{ trait_type: "Expires_At", value: newExpiresAt.toISOString() }]
            });
            console.log(`[BG] On-chain Expires_At updated.`);
        } catch (e: any) {
            console.error(`[BG] Failed to update on-chain metadata:`, e.message);
        }
    }

    // ロックしたレコードを更新ログとして成功扱いに書き換える
    await supabase.from("mint_logs").update({
        status: "success",
        token_id: existingMint.token_id,
        metadata: { action: "renewal", renewed_mint_id: existingMint.id, new_expires_at: newExpiresAt.toISOString() }
    }).eq("id", lockId);

    if (customerEmail) {
        await sendNftDeliveryEmail({ to: customerEmail, nftName: `${templateData.name}（更新）`, recipientWallet });
    }
}

/**
 * 重複SBTのスキップ処理
 */
async function handleSbtSkip(supabase: SupabaseClient, lockId: string, templateData: any, customerEmail: string) {
    console.log(`[BG] SBT already owned: ${templateData.id}, skipping.`);
    
    await supabase.from("mint_logs").update({
        status: "success",
        metadata: { action: "skipped_duplicate_sbt" }
    }).eq("id", lockId);

    if (customerEmail) {
        await sendSbtDuplicateEmail({ to: customerEmail, nftName: templateData.name });
    }
}

/**
 * ペイロード等からウォレットアドレスを特定する
 */
async function resolveRecipientWallet(supabase: SupabaseClient, payload: any, email: string, lineItems: any[]): Promise<string | null> {
    // 1. 手動入力（Note Attributes / Properties）の探索
    let wallet: string | null = null;
    const sources = [
        ...(payload.note_attributes || []),
        ...lineItems.flatMap(i => i.properties || [])
    ];

    for (const attr of sources) {
        const name = String(attr.name || "").toLowerCase();
        const value = String(attr.value || "").trim();
        if ((name.includes("wallet") || name.includes("ウォレット") || value.match(/^0x[a-fA-F0-9]{40}$/i)) && value.length > 0) {
            wallet = value;
            break;
        }
    }

    if (wallet) {
        console.log(`[BG] Manual wallet detected: ${wallet}`);
        if (email) {
            await supabase.from("users").upsert({ email, walletaddress: wallet }, { onConflict: "email" });
        }
        return wallet;
    }

    // 2. DBから既存ユーザーを検索
    if (email) {
        const { data: user } = await supabase.from("users").select("walletaddress").eq("email", email).limit(1).maybeSingle();
        if (user?.walletaddress) return user.walletaddress;

        // 3. 第三者のエンジンウォレットを自動生成
        try {
            console.log(`[BG] Creating Engine Wallet for ${email}...`);
            const res = await fetch(`https://${process.env.THIRDWEB_ENGINE_URL}/backend-wallet/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({ label: `user-${email}` }),
            });

            if (res.ok) {
                const data = await res.json();
                const newWallet = data.result.walletAddress;
                await supabase.from("users").upsert({ email, walletaddress: newWallet }, { onConflict: "email" });
                return newWallet;
            }
        } catch (e: any) {
            console.error("[BG] Wallet generation failed:", e.message);
        }
    }

    return null;
}

export { handler };
