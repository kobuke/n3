/**
 * NFT関連のヘルパー関数
 *
 * NFTの属性マージ、IPFS URL変換、日付フォーマットなど
 * 複数のAPIルートで共通して使用されるロジックを一元管理する。
 */

// ----- 型定義 -----

export interface NFTAttribute {
    trait_type: string;
    value: string;
}

export interface UsageLog {
    status: string;
    used_at: string;
    token_id?: string;
    contract_address?: string;
}

// ----- IPFS URL変換 -----

/**
 * IPFS URLを公開HTTPゲートウェイURLに変換する。
 * 例: "ipfs://Qm..." → "https://ipfs.io/ipfs/Qm..."
 */
export function resolveIpfsUrl(url: string | undefined | null): string {
    if (!url) return "";
    if (url.startsWith("ipfs://")) {
        return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return url;
}

// ----- 属性マージ（使用済みステータスの反映） -----

/**
 * NFTの属性配列にチケット使用ステータスをマージする。
 * ディープコピー済みの属性配列を受け取り、使用ログがあれば
 * Status=Used と Used_At を追加/更新して返す。
 */
export function mergeUsageStatus(
    attributes: NFTAttribute[],
    usageLog: UsageLog | null | undefined
): NFTAttribute[] {
    if (!usageLog) return attributes;

    const hasStatus = attributes.some((a) => a.trait_type === "Status");
    if (!hasStatus) {
        attributes.push({ trait_type: "Status", value: "Used" });
        attributes.push({ trait_type: "Used_At", value: usageLog.used_at });
    } else {
        const statusAttr = attributes.find((a) => a.trait_type === "Status");
        if (statusAttr) statusAttr.value = "Used";
        const usedAtAttr = attributes.find((a) => a.trait_type === "Used_At");
        if (usedAtAttr) usedAtAttr.value = usageLog.used_at;
        else attributes.push({ trait_type: "Used_At", value: usageLog.used_at });
    }

    return attributes;
}

// ----- テンプレートID抽出 -----

/**
 * NFTの属性配列から TemplateID を抽出する。
 * メタデータに埋め込まれた TemplateID / templateId のいずれにも対応。
 */
export function extractTemplateId(attributes: NFTAttribute[]): string | null {
    const attr = attributes.find(
        (a) => a.trait_type === "TemplateID" || a.trait_type === "templateId"
    );
    return attr?.value || null;
}

// ----- 表示用フィルター -----

/** ユーザーに表示すべきでない内部管理用の属性名リスト */
const HIDDEN_ATTRIBUTES = new Set([
    "Status",
    "Used_At",
    "TemplateID",
    "templateId",
]);

/**
 * 内部管理用の属性（Status, Used_At, TemplateID など）を除外した
 * 表示用の属性リストを返す。
 */
export function getDisplayAttributes(attributes: NFTAttribute[]): NFTAttribute[] {
    return attributes.filter((a) => !HIDDEN_ATTRIBUTES.has(a.trait_type));
}

// ----- mint_logs 挿入用ヘルパー -----

export interface MintLogEntry {
    recipient_wallet: string;
    contract_address: string;
    token_id?: string | null;
    template_id?: string | null;
    status: "success" | "error";
    metadata?: any;
    transaction_hash?: string | null;
    shopify_order_id?: string;
    product_name?: string;
    recipient_email?: string;
    error_message?: string;
}

/**
 * mint_logs に挿入するためのデータオブジェクトを生成する。
 * 各ミントルートから呼び出すことで、カラム名の統一を保証する。
 */
export function buildMintLogEntry(params: {
    walletAddress: string;
    contractAddress: string;
    tokenId?: string | null;
    templateId?: string | null;
    transactionHash?: string | null;
    source: string;
    productName?: string;
    email?: string;
}): MintLogEntry {
    return {
        recipient_wallet: params.walletAddress,
        contract_address: params.contractAddress,
        token_id: params.tokenId || null,
        template_id: params.templateId || null,
        status: "success",
        transaction_hash: params.transactionHash || null,
        shopify_order_id: params.source,
        product_name: params.productName,
        recipient_email: params.email,
    };
}
