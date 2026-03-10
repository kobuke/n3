/**
 * SBT（Soulbound Token）有効期限に関するヘルパー関数
 *
 * 有効期限の計算・判定ロジックを一元管理し、
 * APIルートやバックグラウンド関数から共通して利用する。
 */

export interface SbtExpiryInfo {
    /** 有効期限のISO文字列（無期限の場合はnull） */
    expiresAt: string | null;
    /** 現在時刻を基準に有効期限が切れているか */
    isExpired: boolean;
    /** 更新購入用のShopify商品ページURL */
    shopifyProductUrl: string | null;
}

/**
 * ミント日時とテンプレートの有効期限設定から有効期限情報を算出する。
 *
 * @param acquiredAt - NFTの配布日時（ISOString）
 * @param template   - nft_templates テーブルのレコード（validity_days, shopify_product_url を含む）
 * @returns SbtExpiryInfo
 */
export function computeExpiryInfo(
    acquiredAt: string | null | undefined,
    template: {
        validity_days?: number | null;
        shopify_product_url?: string | null;
    } | null | undefined
): SbtExpiryInfo {
    if (!template?.validity_days || !acquiredAt) {
        return {
            expiresAt: null,
            isExpired: false,
            shopifyProductUrl: template?.shopify_product_url ?? null,
        };
    }

    const expDate = new Date(acquiredAt);
    expDate.setDate(expDate.getDate() + template.validity_days);

    return {
        expiresAt: expDate.toISOString(),
        isExpired: new Date() > expDate,
        shopifyProductUrl: template.shopify_product_url ?? null,
    };
}

/**
 * validity_days が設定されたテンプレートに対して、
 * ミント時にオンチェーンメタデータへ埋め込む Expires_At の値を算出する。
 *
 * @param mintedAt     - ミント日時（省略時は現在時刻）
 * @param validityDays - 有効日数（nullの場合はundefinedを返す）
 * @returns ISO文字列（無効な場合はundefined）
 */
export function computeMintExpiresAt(
    validityDays: number | null | undefined,
    mintedAt: Date = new Date()
): string | undefined {
    if (!validityDays) return undefined;
    const exp = new Date(mintedAt);
    exp.setDate(exp.getDate() + validityDays);
    return exp.toISOString();
}
