import { NextRequest, NextResponse } from "next/server";
import { getNFTsForWallet } from "@/lib/thirdweb";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import {
  resolveIpfsUrl,
  mergeUsageStatus,
  extractTemplateId,
} from "@/lib/nft-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. ウォレットアドレスの取得（セッション優先、なければDBから検索）
    const session = await getSession();
    let walletAddress = session?.walletAddress;

    if (!walletAddress) {
      const { data: user } = await supabase
        .from("users")
        .select("walletaddress")
        .eq("email", email)
        .maybeSingle();

      walletAddress = user?.walletaddress || null;
      if (!walletAddress) {
        return NextResponse.json({ nfts: [] });
      }
    }

    // 2. コントラクトアドレスの収集
    const { data: templates } = await supabase
      .from("nft_templates")
      .select("contract_address")
      .not("contract_address", "is", null)
      .not("contract_address", "eq", "");

    const contractAddresses = new Set<string>();
    templates?.forEach((t) => {
      if (t.contract_address) contractAddresses.add(t.contract_address);
    });
    const envCollection = process.env.NEXT_PUBLIC_COLLECTION_ID;
    if (envCollection) contractAddresses.add(envCollection);

    if (contractAddresses.size === 0) {
      return NextResponse.json({ nfts: [] });
    }

    // 3. 関連データの一括取得（使用ログ、譲渡、ミントログ、配布請求、クエスト進行からのメタデータ）
    const [usagesResult, transfersResult, mintLogsResult, claimsResult, questProgressResult] =
      await Promise.all([
        supabase
          .from("ticket_usages")
          .select("token_id, contract_address, used_at, status")
          .eq("wallet_address", walletAddress)
          .eq("status", "used"),
        supabase
          .from("transfer_links")
          .select("tokenid")
          .eq("giveraddress", walletAddress)
          .eq("status", "CLAIMED"),
        supabase
          .from("mint_logs")
          .select("token_id, contract_address, template_id, created_at")
          .ilike("recipient_wallet", walletAddress)
          .eq("status", "success"),
        supabase
          .from("airdrop_claims")
          .select("template_id, created_at")
          .eq("wallet_address", walletAddress),
        supabase
          .from("user_quest_progress")
          .select("quest_id, pending_metadata, quests(base_nft_template_id)")
          .eq("user_wallet", walletAddress)
          .not("pending_metadata", "is", null)
      ]);

    // 使用ログのMap化
    const usagesMap = new Map<string, any>();
    usagesResult.data?.forEach((u) => {
      usagesMap.set(`${u.contract_address.toLowerCase()}-${u.token_id}`, u);
    });

    // 譲渡済みトークンID
    const hiddenTokenIds = new Set(
      transfersResult.data?.map((t) => t.tokenid) || []
    );

    // ミントログのMap化
    const mintLogsMap = new Map<string, string>();
    mintLogsResult.data?.forEach((ml) => {
      if (ml.token_id && ml.contract_address) {
        mintLogsMap.set(
          `${ml.contract_address.toLowerCase()}-${ml.token_id}`,
          ml.created_at
        );
      }
    });

    // 配布請求のMap化
    const claimsMap = new Map<string, string>();
    claimsResult.data?.forEach((c) => {
      claimsMap.set(c.template_id, c.created_at);
    });

    // pending_metadata のMap化 (Key: Template ID)
    const pendingMetadataMap = new Map<string, any>();
    questProgressResult.data?.forEach((qp) => {
      const templateId = (qp.quests as any)?.base_nft_template_id;
      if (templateId && qp.pending_metadata) {
        // 最も新しい（もしくは任意の順番の）進行状況が上書きされる
        pendingMetadataMap.set(templateId, qp.pending_metadata);
      }
    });

    // 4. ブロックチェーンからNFT取得＆ローカルデータのマージ
    const allNfts: any[] = [];
    for (const contractAddress of contractAddresses) {
      try {
        const ownedNfts = await getNFTsForWallet(
          contractAddress,
          walletAddress
        );

        for (const nft of ownedNfts) {
          const nftIdStr = nft.id.toString();

          // 譲渡済みは非表示
          if (hiddenTokenIds.has(nftIdStr)) continue;

          let metadata = nft.metadata || {};
          let attributes = ((metadata as any).attributes || []).map(
            (a: any) => ({ ...a })
          );

          const templateIdFromAttr = extractTemplateId(attributes);

          // キャッシュ遅延対策: `user_quest_progress` に `pending_metadata` があれば優先的に使用（上書き）
          if (templateIdFromAttr && pendingMetadataMap.has(templateIdFromAttr)) {
            const pending = pendingMetadataMap.get(templateIdFromAttr);
            const pendingTokenId = (pending?.attributes || []).find((a: any) => a.trait_type === "LastUpdatedTokenID")?.value;

            // 自分自身のTokenIDに対する更新データがある場合のみ上書きする
            if (pendingTokenId === nftIdStr) {
              metadata = pending;
              attributes = ((metadata as any).attributes || []).map(
                (a: any) => ({ ...a })
              );
            }
          }

          // 使用ステータスのマージ
          const usageLog = usagesMap.get(
            `${contractAddress.toLowerCase()}-${nftIdStr}`
          );
          attributes = mergeUsageStatus(attributes, usageLog);

          // 取得日の照合（Webhookによりtoken_idが保存されるようになったため、正確に照合可能）
          let acquiredAt = mintLogsMap.get(
            `${contractAddress.toLowerCase()}-${nftIdStr}`
          );

          if (!acquiredAt) {
            // mintLogsに存在しない場合（過去のデータ等）のフォールバックとして、
            // airdrop_claims を参照するのみに留める
            const templateId = extractTemplateId(attributes);
            if (templateId) {
              acquiredAt = claimsMap.get(templateId);
            }
          }

          const imageUrl = resolveIpfsUrl((metadata as any).image);

          allNfts.push({
            id: nftIdStr,
            tokenId: nftIdStr,
            contractAddress,
            name:
              (metadata as any).name || `Ticket #${nftIdStr}`,
            description: (metadata as any).description || "",
            image: imageUrl,
            acquiredAt: acquiredAt || null,
            supply: (nft as any).supply
              ? Number((nft as any).supply)
              : (nft as any).quantityOwned
                ? Number((nft as any).quantityOwned)
                : 1,
            metadata: {
              name: (metadata as any).name,
              description: (metadata as any).description,
              image: imageUrl,
              attributes,
            },
          });
        }
      } catch (contractErr: any) {
        console.warn(
          `[NFT] Failed to fetch from ${contractAddress}:`,
          contractErr.message
        );
      }
    }

    return NextResponse.json({ nfts: allNfts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
