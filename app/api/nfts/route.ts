import { NextRequest, NextResponse } from "next/server";
import { getNFTsForWallet, getNFTById } from "@/lib/thirdweb";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import {
  resolveIpfsUrl,
  mergeUsageStatus,
  extractTemplateId,
  computeDynamicMetadata
} from "@/lib/nft-helpers";
import { computeExpiryInfo } from "@/lib/sbt";

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

    // 2. コントラクトアドレスの収集 + テンプレート情報の一括取得
    const { data: templates } = await supabase
      .from("nft_templates")
      .select("id, name, contract_address, validity_days, shopify_product_url, is_transferable")
      .not("contract_address", "is", null)
      .not("contract_address", "eq", "");

    const contractAddresses = new Set<string>();
    const templateMap = new Map<string, any>();
    templates?.forEach((t) => {
      if (t.contract_address) contractAddresses.add(t.contract_address);
      templateMap.set(t.id, t);
    });
    const envCollection = process.env.NEXT_PUBLIC_COLLECTION_ID;
    if (envCollection) contractAddresses.add(envCollection);

    if (contractAddresses.size === 0) {
      return NextResponse.json({ nfts: [] });
    }

    // 3. 関連データの一括取得とブロックチェーンからのNFT取得をすべて並列実行して待ち時間を短縮
    const [usagesResult, transfersResult, mintLogsResult, claimsResult, questProgressResult, ...nftFetchResults] =
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
          .select("token_id, contract_address, template_id, created_at, transaction_hash")
          .ilike("recipient_wallet", walletAddress)
          .eq("status", "success"),
        supabase
          .from("airdrop_claims")
          .select("template_id, created_at")
          .eq("wallet_address", walletAddress),
        supabase
          .from("user_quest_progress")
          .select(`
            token_id,
            location_id,
            quest_id,
            quests (
                base_nft_template_id,
                clear_metadata_uri,
                quest_locations ( id, order_index, levelup_metadata_uri )
            )
          `)
          .eq("user_wallet", walletAddress),
        ...Array.from(contractAddresses).map(contractAddress =>
          getNFTsForWallet(contractAddress, walletAddress!)
            .then(ownedNfts => ({ contractAddress, ownedNfts }))
            .catch(err => {
              console.warn(`[NFT] Failed to fetch from ${contractAddress}:`, err.message);
              return { contractAddress, ownedNfts: [] };
            })
        )
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

    // ミントログのMap化（取得日 + テンプレートID）
    const mintLogsMap = new Map<string, { created_at: string; template_id: string | null }>();
    mintLogsResult.data?.forEach((ml) => {
      if (ml.token_id && ml.contract_address) {
        mintLogsMap.set(
          `${ml.contract_address.toLowerCase()}-${ml.token_id}`,
          { created_at: ml.created_at, template_id: ml.template_id }
        );
      }
    });

    // 配布請求のMap化
    const claimsMap = new Map<string, string>();
    claimsResult.data?.forEach((c) => {
      claimsMap.set(c.template_id, c.created_at);
    });

    // user_quest_progressのデータ (動的メタデータ計算用)
    const progressList = questProgressResult.data || [];

    // 4. ローカルデータのマージ
    const allNfts: any[] = [];
    for (const { contractAddress, ownedNfts } of nftFetchResults) {
      if (!ownedNfts) continue;
      for (const nft of ownedNfts) {
        const nftIdStr = nft.id.toString();

        // 譲渡済みは非表示
        if (hiddenTokenIds.has(nftIdStr)) continue;

        let metadata = nft.metadata || {};
        // クエスト進行に応じた動的メタデータの適用
        metadata = computeDynamicMetadata(metadata, progressList as any, nftIdStr);

        let attributes = ((metadata as any).attributes || []).map(
          (a: any) => ({ ...a })
        );

        // 使用ステータスのマージ
        const usageLog = usagesMap.get(
          `${contractAddress.toLowerCase()}-${nftIdStr}`
        );
        attributes = mergeUsageStatus(attributes, usageLog);

        // 取得日の照合（Webhookによりtoken_idが保存されるようになったため、正確に照合可能）
        const mintLogKey = `${contractAddress.toLowerCase()}-${nftIdStr}`;
        const mintLogEntry = mintLogsMap.get(mintLogKey);
        let acquiredAt = mintLogEntry?.created_at;
        const mintTemplateId = mintLogEntry?.template_id || null;

        if (!acquiredAt) {
          // mintLogsに存在しない場合（過去のデータ等）のフォールバックとして、
          // airdrop_claims を参照するのみに留める
          const templateId = extractTemplateId(attributes);
          if (templateId) {
            acquiredAt = claimsMap.get(templateId);
          }
        }

        // 有効期限の計算
        const resolvedTemplateId = mintTemplateId || extractTemplateId(attributes);
        const tmpl = resolvedTemplateId ? templateMap.get(resolvedTemplateId) : null;
        const { expiresAt, isExpired, shopifyProductUrl } = computeExpiryInfo(acquiredAt, tmpl);

        const imageUrl = resolveIpfsUrl((metadata as any).image);

        allNfts.push({
          id: nftIdStr,
          tokenId: nftIdStr,
          contractAddress,
          templateId: resolvedTemplateId,
          name:
            (metadata as any).name || `Ticket #${nftIdStr}`,
          description: (metadata as any).description || "",
          image: imageUrl,
          acquiredAt: acquiredAt || null,
          expiresAt,
          isExpired,
          shopifyProductUrl,
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
    }

    // 5. getOwnedNFTs が取りこぼしたトークンをフォールバック個別取得
    // mint_logsにtoken_idが確定済みなのにブロックチェーン取得結果にないケース
    // (例: nextTokenIdToMintのタイミング問題で最新mintが範囲外になる) に対処
    const confirmedKeys = new Set(
      allNfts.map((n) => `${n.contractAddress.toLowerCase()}-${n.tokenId}`)
    );
    const missedLogs = (mintLogsResult.data || []).filter(
      (ml) =>
        ml.token_id &&
        ml.contract_address &&
        !hiddenTokenIds.has(ml.token_id) &&
        !confirmedKeys.has(`${ml.contract_address.toLowerCase()}-${ml.token_id}`)
    );
    if (missedLogs.length > 0) {
      const fallbackResults = await Promise.all(
        missedLogs.map(async (ml) => {
          try {
            const nft = await getNFTById(ml.contract_address, ml.token_id!);
            return { ml, nft };
          } catch {
            return null;
          }
        })
      );
      for (const result of fallbackResults) {
        if (!result?.nft) continue;
        const { ml, nft } = result;
        const nftIdStr = ml.token_id!;
        let metadata = nft.metadata || {};
        metadata = computeDynamicMetadata(metadata, progressList as any, nftIdStr);
        let attributes = ((metadata as any).attributes || []).map((a: any) => ({ ...a }));
        const usageLog = usagesMap.get(`${ml.contract_address.toLowerCase()}-${nftIdStr}`);
        attributes = mergeUsageStatus(attributes, usageLog);
        const tmpl = ml.template_id ? templateMap.get(ml.template_id) : null;
        const { expiresAt, isExpired, shopifyProductUrl } = computeExpiryInfo(ml.created_at, tmpl);
        const imageUrl = resolveIpfsUrl((metadata as any).image);
        allNfts.push({
          id: nftIdStr,
          tokenId: nftIdStr,
          contractAddress: ml.contract_address,
          templateId: ml.template_id,
          name: (metadata as any).name || `Ticket #${nftIdStr}`,
          description: (metadata as any).description || "",
          image: imageUrl,
          acquiredAt: ml.created_at,
          expiresAt,
          isExpired,
          shopifyProductUrl,
          supply: 1,
          metadata: {
            name: (metadata as any).name,
            description: (metadata as any).description,
            image: imageUrl,
            attributes,
          },
        });
        confirmedKeys.add(`${ml.contract_address.toLowerCase()}-${nftIdStr}`);
      }
    }

    // 6. チェーン未反映のpendingミントをカードとして追加
    // mintLogsResult から直近30分分をクライアント側でフィルタリング（別DBクエリ不要）
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const recentMintLogs = (mintLogsResult.data || []).filter(
      (ml) => ml.created_at >= thirtyMinutesAgo
    );
    for (const pending of recentMintLogs) {
      // transaction_hashもtoken_idも無いエントリはSBT重複スキップなので表示しない
      if (!pending.transaction_hash && !pending.token_id) continue;
      // すでにチェーンで確認済みのトークンはスキップ
      if (
        pending.token_id &&
        confirmedKeys.has(`${pending.contract_address.toLowerCase()}-${pending.token_id}`)
      ) {
        continue;
      }
      const tmpl = pending.template_id ? templateMap.get(pending.template_id) : null;
      allNfts.push({
        id: pending.token_id ?? `pending-${pending.created_at}`,
        tokenId: pending.token_id ?? null,
        contractAddress: pending.contract_address,
        templateId: pending.template_id,
        name: tmpl?.name ?? "処理中...",
        description: "",
        image: null,
        acquiredAt: pending.created_at,
        expiresAt: null,
        isExpired: false,
        shopifyProductUrl: null,
        supply: 1,
        isPending: true,
        metadata: {
          name: tmpl?.name ?? "処理中...",
          description: "",
          image: null,
          attributes: [],
        },
      });
    }

    return NextResponse.json({ nfts: allNfts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
