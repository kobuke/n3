/**
 * NFT種別の表示用キー（messages/[locale].json の NftTypes セクションに対応）
 */
export const NFT_TYPE_KEYS: Record<string, string> = {
  certificate: "certificate",
  more: "more",
  experience: "experience",
  asset: "asset",
  art: "art",
  other: "other",
  // 旧タイプの後方互換
  ticket: "ticket",
  tour: "tour",
  resident_card: "resident_card",
  artwork: "artwork",
  product: "product",
};

/**
 * NFT種別の表示用ラベル（後方互換用、基本は i18n キーの使用を推奨）
 * ※このオブジェクトは将来的に廃止し、コンポーネント側で t('NftTypes.xxx') を使うべきです。
 */
export const NFT_TYPE_LABELS = NFT_TYPE_KEYS;

/**
 * NFT詳細画面の属性ラベルキー
 */
export const NFT_ATTR_LABEL_KEYS: Record<string, string> = {
  Status: "Status",
  Type: "Type",
  Source: "Source",
  Transferable: "Transferable",
  Used_At: "Used_At",
  Event: "Event",
  Issued_At: "Issued_At",
  "Order ID": "Order ID",
};

/**
 * NFT詳細画面の属性値ラベルキー
 */
export const NFT_ATTR_VALUE_KEYS: Record<string, string> = {
  Unused: "Unused",
  Used: "Used",
  Yes: "Yes",
  No: "No",
  Airdrop: "Airdrop",
  LINE連携: "LINE連携",
  Purchase: "Purchase",
};
