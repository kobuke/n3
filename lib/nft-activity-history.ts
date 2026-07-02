export type NftActivityType = "mint" | "received" | "use" | "transfer";
export type NftActivityStatus = "success" | "pending" | "failed";

type MintLog = {
  id: string | number;
  product_name: string | null;
  status: string | null;
  created_at: string;
  transaction_hash: string | null;
  shopify_order_id: string | null;
};

type UsageLog = {
  id: string | number;
  token_id: string | null;
  status: string | null;
  used_at: string;
  transaction_hash: string | null;
};

type TransferLog = {
  id: string | number;
  tokenid: string | null;
  status: string | null;
  created_at: string;
  transaction_hash: string | null;
};

export type NftActivity = {
  id: string;
  type: NftActivityType;
  status: NftActivityStatus;
  title: string;
  description: string;
  date: number;
  txHash: string | null;
};

export function normalizeActivityStatus(status: string | null): NftActivityStatus {
  if (status === "pending" || status === "ACTIVE") return "pending";
  if (status === "error" || status === "failed" || status === "EXPIRED" || status === "CANCELLED") {
    return "failed";
  }
  return "success";
}

export function buildNftActivityHistory({
  mints = [],
  usages = [],
  transfers = [],
  limit = 10,
}: {
  mints?: MintLog[];
  usages?: UsageLog[];
  transfers?: TransferLog[];
  limit?: number;
}): NftActivity[] {
  const activities: NftActivity[] = [];

  mints.forEach((mint) => {
    const isTransferClaim = mint.shopify_order_id?.startsWith("transfer-claim-") ?? false;
    activities.push({
      id: `mint-${mint.id}`,
      type: isTransferClaim ? "received" : "mint",
      status: normalizeActivityStatus(mint.status),
      title: isTransferClaim ? "チケットを受け取りました" : "チケットを獲得しました",
      description: mint.product_name || "NFT Ticket",
      date: new Date(mint.created_at).getTime(),
      txHash: mint.transaction_hash,
    });
  });

  usages.forEach((usage) => {
    activities.push({
      id: `use-${usage.id}`,
      type: "use",
      status: normalizeActivityStatus(usage.status),
      title: "チケットを使用しました",
      description: `Token ID: ${usage.token_id || "-"}`,
      date: new Date(usage.used_at).getTime(),
      txHash: usage.transaction_hash,
    });
  });

  transfers.forEach((transfer) => {
    let title = "譲渡リンクを作成しました";
    if (transfer.status === "CLAIMED") title = "チケットを譲渡しました";
    if (transfer.status === "CANCELLED") title = "譲渡がキャンセルされました";
    if (transfer.status === "EXPIRED") title = "譲渡リンクが期限切れになりました";

    activities.push({
      id: `transfer-${transfer.id}`,
      type: "transfer",
      status: normalizeActivityStatus(transfer.status),
      title,
      description: `Token ID: ${transfer.tokenid || "-"}`,
      date: new Date(transfer.created_at).getTime(),
      txHash: transfer.transaction_hash,
    });
  });

  return activities
    .filter((activity) => Number.isFinite(activity.date))
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
}
