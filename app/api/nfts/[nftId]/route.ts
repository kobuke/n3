import { NextRequest, NextResponse } from "next/server";
import { getNFTById } from "@/lib/thirdweb";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { resolveIpfsUrl, mergeUsageStatus, computeDynamicMetadata } from "@/lib/nft-helpers";

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

    const session = await getSession();
    const walletAddress = session?.walletAddress;

    const supabase = createAdminClient();

    // 2. 超重要：キャッシュ遅延対策（動的メタデータ計算）
    // Thirdwebのキャッシュが更新されるまでの間、Supabaseに保存した最新のクエスト進行状況を優先する
    const { data: progressMetadata } = await supabase
      .from("user_quest_progress")
      .select(`
        location_id,
        quest_id,
        quests (
            base_nft_template_id,
            clear_metadata_uri,
            quest_locations ( id, order_index, levelup_metadata_uri )
        )
      `)
      .eq("user_wallet", walletAddress || "");

    let finalMetadata = nft.metadata || {};
    if (progressMetadata && progressMetadata.length > 0) {
      finalMetadata = computeDynamicMetadata(finalMetadata, progressMetadata as any);
    }

    // 3. 使用ステータスの取得＆マージ
    const { data: usageLog } = await supabase
      .from("ticket_usages")
      .select("status, used_at")
      .eq("token_id", nftId)
      .ilike("contract_address", contractAddress)
      .eq("status", "used")
      .maybeSingle();

    let attributes = (finalMetadata.attributes || []).map((a: any) => ({
      ...a,
    }));
    attributes = mergeUsageStatus(attributes, usageLog);

    const imageUrl = resolveIpfsUrl(finalMetadata.image);

    const formattedNft: any = {
      tokenId: nft.id.toString(),
      contractAddress,
      name: finalMetadata.name || `NFT #${nft.id.toString()}`,
      description: finalMetadata.description || "",
      image: imageUrl,
      metadata: {
        name: finalMetadata.name || "",
        description: finalMetadata.description || "",
        image: imageUrl,
        attributes,
      },
    };

    // 3. 取得日の照合（ログインユーザーのミントログから）
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
