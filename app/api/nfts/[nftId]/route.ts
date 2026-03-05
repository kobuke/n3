import { NextRequest, NextResponse } from "next/server";
import { getNFTById } from "@/lib/thirdweb";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { resolveIpfsUrl, mergeUsageStatus } from "@/lib/nft-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nftId: string }> }
) {
  const { nftId } = await params;
  const contractAddress =
    _req.nextUrl.searchParams.get("contract") ||
    process.env.NEXT_PUBLIC_COLLECTION_ID;

  if (!contractAddress) {
    return NextResponse.json(
      { error: "Collection ID not configured" },
      { status: 500 }
    );
  }

  try {
    // 1. ブロックチェーンからNFT取得
    let nft: any;
    try {
      nft = await getNFTById(contractAddress, nftId);
    } catch (err: any) {
      console.error("fetch NFT failed:", err.message);
      return NextResponse.json({ error: "NFT not found" }, { status: 404 });
    }

    if (!nft) {
      return NextResponse.json({ error: "NFT not found" }, { status: 404 });
    }

    const supabase = createAdminClient();

    // 2. 使用ステータスの取得＆マージ
    const { data: usageLog } = await supabase
      .from("ticket_usages")
      .select("status, used_at")
      .eq("token_id", nftId)
      .ilike("contract_address", contractAddress)
      .eq("status", "used")
      .maybeSingle();

    let attributes = (nft.metadata?.attributes || []).map((a: any) => ({
      ...a,
    }));
    attributes = mergeUsageStatus(attributes, usageLog);

    const imageUrl = resolveIpfsUrl(nft.metadata?.image);

    const formattedNft: any = {
      tokenId: nft.id.toString(),
      contractAddress,
      name: nft.metadata?.name || `NFT #${nft.id.toString()}`,
      description: nft.metadata?.description || "",
      image: imageUrl,
      metadata: {
        name: nft.metadata?.name || "",
        description: nft.metadata?.description || "",
        image: imageUrl,
        attributes,
      },
    };

    // 3. 取得日の照合（ログインユーザーのミントログから）
    const session = await getSession();
    const walletAddress = session?.walletAddress;

    if (walletAddress) {
      const { data: mintLog } = await supabase
        .from("mint_logs")
        .select("created_at")
        .eq("token_id", nftId)
        .ilike("contract_address", contractAddress)
        .ilike("recipient_wallet", walletAddress)
        .eq("status", "success")
        .order("created_at", { ascending: true })
        .maybeSingle();

      if (mintLog) {
        formattedNft.acquiredAt = mintLog.created_at;
      }
    }

    return NextResponse.json(formattedNft);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT detail error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
