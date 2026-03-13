/**
 * NFT種別の表示用ラベル
 */
export const NFT_TYPE_LABELS: Record<string, string> = {
  certificate: "証明書",
  more: "モア",
  experience: "体験チケット",
  asset: "デジタル資産",
  art: "アート",
  other: "その他",
  // 旧タイプの後方互換
  ticket: "チケット",
  tour: "ツアーパス",
  resident_card: "デジタル住民証",
  artwork: "アート作品",
  product: "その他",
};

/**
 * NFT詳細画面の属性ラベル
 */
export const NFT_ATTR_LABELS: Record<string, string> = {
  Status: "ステータス",
  Type: "種別",
  Source: "取得方法",
  Transferable: "譲渡",
  Used_At: "使用日時",
  Event: "イベント",
  Issued_At: "発行日",
  "Order ID": "注文ID",
};

/**
 * NFT詳細画面の属性値ラベル
 */
export const NFT_ATTR_VALUES: Record<string, string> = {
  Unused: "利用可能",
  Used: "使用済み",
  Yes: "可能",
  No: "不可",
  Airdrop: "配布（QRコード）",
  LINE連携: "LINE連携",
  Purchase: "購入",
};
