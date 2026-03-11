import { NextRequest, NextResponse } from "next/server";
import { getNFTById } from "@/lib/thirdweb";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { resolveIpfsUrl, mergeUsageStatus, computeDynamicMetadata, extractTemplateId } from "@/lib/nft-helpers";
import { computeExpiryInfo } from "@/lib/sbt";

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
    const session = await getSession();
    const walletAddress = session?.walletAddress;
    const supabase = createAdminClient();

    // 1. 各種データを並列で取得し、レスポンスタイムを大幅に短縮
    const [nftResult, progressMetadataResult, usageLogResult, mintLogResult] = await Promise.allSettled([
      getNFTById(contractAddress, nftId),
      walletAddress
        ? supabase
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
          .eq("user_wallet", walletAddress)
        : Promise.resolve({ data: null }),
      supabase
        .from("ticket_usages")
        .select("status, used_at")
        .eq("token_id", nftId)
        .ilike("contract_address", contractAddress)
        .eq("status", "used")
        .maybeSingle(),
      walletAddress
        ? supabase
          .from("mint_logs")
          .select("created_at, template_id")
          .eq("token_id", nftId)
          .ilike("contract_address", contractAddress)
          .ilike("recipient_wallet", walletAddress)
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (nftResult.status === "rejected" || !nftResult.value) {
      console.error(
        "fetch NFT failed:",
        nftResult.status === "rejected" ? nftResult.reason : "Not found"
      );
      return NextResponse.json({ error: "NFT not found" }, { status: 404 });
    }

    const nft: any = nftResult.value;
    const progressMetadata: any =
      progressMetadataResult.status === "fulfilled"
        ? progressMetadataResult.value.data
        : null;
    const usageLog: any =
      usageLogResult.status === "fulfilled" ? usageLogResult.value.data : null;
    const mintLog: any =
      mintLogResult.status === "fulfilled" ? mintLogResult.value.data : null;

    // 2. 超重要：キャッシュ遅延対策（動的メタデータ計算）
    let finalMetadata = nft.metadata || {};
    if (progressMetadata && progressMetadata.length > 0) {
      finalMetadata = computeDynamicMetadata(finalMetadata, progressMetadata as any);
    }

    // 3. 使用ステータスの取得＆マージ
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

    // 4. 取得日・有効期限の照合（ログインユーザーのミントログから）
    if (walletAddress) {

      if (mintLog) {
        formattedNft.acquiredAt = mintLog.created_at;

        // 有効期限の計算
        const resolvedTemplateId = mintLog.template_id || extractTemplateId(attributes);
        if (resolvedTemplateId) {
          const { data: tmpl } = await supabase
            .from("nft_templates")
            .select("validity_days, shopify_product_url")
            .eq("id", resolvedTemplateId)
            .maybeSingle();

          const { expiresAt, isExpired, shopifyProductUrl } = computeExpiryInfo(mintLog.created_at, tmpl);
          if (expiresAt) formattedNft.expiresAt = expiresAt;
          if (isExpired) formattedNft.isExpired = isExpired;
          if (shopifyProductUrl) formattedNft.shopifyProductUrl = shopifyProductUrl;
        }
      }
    }

    return NextResponse.json(formattedNft);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT detail error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
