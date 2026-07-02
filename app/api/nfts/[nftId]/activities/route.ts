import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { buildNftActivityHistory } from "@/lib/nft-activity-history";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nftId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nftId } = await params;
    const contractAddress =
      req.nextUrl.searchParams.get("contract") ||
      process.env.NEXT_PUBLIC_COLLECTION_ID;

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Collection ID not configured" },
        { status: 500 }
      );
    }

    const walletAddress = session.walletAddress;
    const supabase = createAdminClient();

    const [mintsResult, usagesResult, transfersResult] = await Promise.all([
      supabase
        .from("mint_logs")
        .select("id, product_name, status, created_at, transaction_hash, shopify_order_id")
        .eq("token_id", nftId)
        .ilike("contract_address", contractAddress)
        .ilike("recipient_wallet", walletAddress)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("ticket_usages")
        .select("id, token_id, status, used_at, transaction_hash")
        .eq("token_id", nftId)
        .ilike("contract_address", contractAddress)
        .ilike("wallet_address", walletAddress)
        .order("used_at", { ascending: false })
        .limit(10),
      supabase
        .from("transfer_links")
        .select("id, tokenid, status, created_at, transaction_hash")
        .eq("tokenid", nftId)
        .ilike("giveraddress", walletAddress)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (mintsResult.error || usagesResult.error || transfersResult.error) {
      console.error("NFT activities query error:", {
        mints: mintsResult.error?.message,
        usages: usagesResult.error?.message,
        transfers: transfersResult.error?.message,
      });
      return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
    }

    return NextResponse.json({
      activities: buildNftActivityHistory({
        mints: mintsResult.data || [],
        usages: usagesResult.data || [],
        transfers: transfersResult.data || [],
        limit: 10,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT activities error:", message);
    return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
  }
}
