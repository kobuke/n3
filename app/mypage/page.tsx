"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  RefreshCw,
  Gift,
  Undo2,
  Check,
  XCircle,
  CheckCircle2,
  Activity as ActivityIcon,
  LogOut,
  CheckCheck,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export default function MyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <MyPageContent />
    </Suspense>
  );
}

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("items");
  const lineAirdropTriggered = useRef(false);

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
  } = useSWR("/api/session", fetcher);

  const { data: discordStatus } = useSWR(
    session?.authenticated ? "/api/discord/status" : null,
    fetcher
  );

  const { data: lineStatus } = useSWR(
    session?.authenticated ? "/api/line/status" : null,
    fetcher
  );

  // Handle Discord callback query params
  useEffect(() => {
    const discordResult = searchParams.get("discord");
    if (discordResult === "success") {
      const username = searchParams.get("username");
      toast.success(`Discord連携完了！ ${username ? `@${username}` : ""}`);
      router.replace("/mypage");
    } else if (discordResult === "error") {
      const reason = searchParams.get("reason");
      toast.error(`Discord連携エラー: ${reason || "不明なエラー"}`);
      router.replace("/mypage");
    }

    const lineResult = searchParams.get("line");
    if (lineResult === "success") {
      const name = searchParams.get("name");
      toast.success(`LINE連携完了！ ${name || ""}`);
      router.replace("/mypage");
    } else if (lineResult === "error") {
      const reason = searchParams.get("reason");
      toast.error(`LINE連携エラー: ${reason || "不明なエラー"}`);
      router.replace("/mypage");
    }

    // query param でタブを切り替え
    const tab = searchParams.get("tab");
    if (tab === "nfts") setActiveTab("items");
  }, [searchParams, router]);

  // LINE browser auto-airdrop
  useEffect(() => {
    if (!session?.authenticated || lineAirdropTriggered.current) return;
    const isLineBrowser = /Line\//i.test(navigator.userAgent);
    if (!isLineBrowser) return;

    lineAirdropTriggered.current = true;
    fetch("/api/airdrop/line", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.message) toast.success(data.message);
      })
      .catch(() => { });
  }, [session?.authenticated]);

  const {
    data: nftData,
    error: nftError,
    isLoading: nftLoading,
    mutate: mutateNfts,
  } = useSWR(
    session?.authenticated ? `/api/nfts?email=${session.email}` : null,
    fetcher
  );

  const {
    data: activityData,
    isLoading: activityLoading,
    mutate: mutateActivities,
  } = useSWR(
    session?.authenticated ? `/api/users/activities` : null,
    fetcher
  );

  useEffect(() => {
    if (!sessionLoading && (sessionError || !session?.authenticated)) {
      router.push("/");
    }
  }, [session, sessionError, sessionLoading, router]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.authenticated) return null;

  const nfts: any[] = nftData?.nfts ?? [];
  const activities: any[] = activityData?.activities ?? [];

  const getCategory = (nft: any) => {
    const attributes = nft.metadata?.attributes || nft.attributes || [];
    const typeAttr = attributes.find((a: any) => a.trait_type === "Type" || a.trait_type === "type");
    if (typeAttr && typeAttr.value) {
      const val = String(typeAttr.value).toLowerCase();
      if (val === "certificate" || val === "resident_card") return "certificate";
      if (val === "more" || val === "ticket") return "more";
      if (val === "experience" || val === "tour") return "experience";
      if (val === "asset") return "asset";
      if (val === "art" || val === "artwork") return "art";
      if (val === "other" || val === "product") return "other";
      if (["certificate", "more", "experience", "asset", "art", "other"].includes(val)) return val;
    }
    const name = (nft.name || nft.metadata?.name || "").toLowerCase();
    if (name.includes("証明") || name.includes("住民") || name.includes("市民") || name.includes("名誉")) return "certificate";
    if (name.includes("体験") || name.includes("ツアー") || name.includes("観察") || name.includes("エイサー")) return "experience";
    if (name.includes("資産") || name.includes("オーナー") || name.includes("泡盛")) return "asset";
    if (name.includes("アート")) return "art";
    if (name.includes("モア") || name.includes("チケット") || name.includes("おすそ分け") || name.includes("クーポン") || name.includes("セレモニー")) return "more";
    return "other";
  };

  const filteredNfts = nfts.filter((nft) => {
    if (categoryFilter === "all") return true;
    return getCategory(nft) === categoryFilter;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([mutateNfts(), mutateActivities()]);
      toast.success("情報を更新しました");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setIsRefreshing(false);
    }
  };

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    toast.success("ログアウトしました");
    router.push("/");
  }

  const CATEGORY_FILTERS = [
    { key: "all", label: `すべて${nfts.length > 0 ? ` (${nfts.length})` : ""}` },
    { key: "certificate", label: "証明書" },
    { key: "more", label: "モア" },
    { key: "experience", label: "体験チケット" },
    { key: "asset", label: "デジタル資産" },
    { key: "art", label: "アート" },
    { key: "other", label: "その他" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader title={activeTab === "items" ? "NFTコレクション" : "マイページ"} />

      <main className="max-w-lg mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border border-slate-200 rounded-xl p-1">
            <TabsTrigger value="items" className="rounded-lg text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white">
              NFT一覧
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white">
              プロフィール
            </TabsTrigger>
          </TabsList>

          {/* ===== NFT一覧タブ ===== */}
          <TabsContent value="items" className="focus-visible:outline-none">
            {/* Refresh button */}
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-1.5 h-8 bg-white border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "更新中" : "更新"}
              </Button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto gap-2 mb-5 pb-1 -mx-4 px-4 hide-scrollbar">
              {CATEGORY_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex h-9 shrink-0 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors whitespace-nowrap ${categoryFilter === key
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Loading */}
            {nftLoading && (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
              </div>
            )}

            {/* Empty state */}
            {!nftLoading && (!filteredNfts || filteredNfts.length === 0) && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <CheckCheck className="w-7 h-7 text-slate-400" />
                </div>
                {categoryFilter === "all" ? (
                  <>
                    <h3 className="font-semibold text-slate-700 text-sm">まだアイテムがありません</h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
                      イベントに参加したり、スタッフからQRコードを受け取ると、ここにデジタルチケットや記念品が表示されます。
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-slate-700 text-sm">このカテゴリにはアイテムがありません</h3>
                    <button
                      className="text-xs text-primary underline underline-offset-2"
                      onClick={() => setCategoryFilter("all")}
                    >
                      すべてのアイテムを表示する
                    </button>
                  </>
                )}
              </div>
            )}

            {/* NFT List */}
            {!nftLoading && !nftError && filteredNfts.length > 0 && (
              <div className="flex flex-col gap-3">
                {filteredNfts.map((nft: any) => {
                  const id = nft.id ?? nft.tokenId ?? nft.nftId;
                  const meta = nft.metadata ?? {};
                  return (
                    <TicketCard
                      key={`${nft.contractAddress}-${id}`}
                      nftId={id}
                      name={meta.name ?? nft.name ?? "NFT Ticket"}
                      image={meta.image ?? nft.image}
                      description={meta.description ?? nft.description}
                      attributes={meta.attributes ?? []}
                      contractAddress={nft.contractAddress}
                      acquiredAt={nft.acquiredAt}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== プロフィールタブ ===== */}
          <TabsContent value="profile" className="focus-visible:outline-none">
            {/* Asset Balance Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 text-sm font-bold">NFT保有数</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-900 text-lg font-bold">
                    {nftLoading ? "..." : `${nfts.length} 件`}
                  </p>
                  <p className="text-slate-400 text-xs">ウォレット内のNFT</p>
                </div>
              </div>
            </div>

            {/* Activity History (recent 3) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 text-sm font-bold">受け取り履歴</h3>
                <button
                  className="text-primary text-xs font-bold flex items-center gap-0.5"
                  onClick={() => setActiveTab("activity")}
                >
                  すべて表示
                </button>
              </div>
              {activityLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">履歴はまだありません</p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 3).map((act) => {
                    let iconBg = "bg-green-500/10";
                    let iconColor = "text-green-500";
                    let Icon = CheckCircle2;
                    if (act.type === "received" || act.type === "mint") {
                      Icon = Gift; iconBg = "bg-indigo-500/10"; iconColor = "text-indigo-500";
                    } else if (act.type === "transfer") {
                      Icon = Undo2; iconBg = "bg-orange-500/10"; iconColor = "text-orange-500";
                    } else if (act.type === "use") {
                      Icon = Check; iconBg = "bg-red-500/10"; iconColor = "text-red-500";
                    }
                    return (
                      <div key={act.id} className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{act.title}</p>
                          <p className="text-[10px] text-slate-400">{new Date(act.date).toLocaleDateString("ja-JP")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Community Access: Discord + LINE */}
            <h3 className="text-slate-800 text-sm font-bold mb-3">コミュニティ連携</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Discord */}
              <a
                href={discordStatus?.linked ? undefined : "/api/auth/discord"}
                className={`bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shadow-sm transition-colors ${discordStatus?.linked ? "cursor-default" : "hover:bg-slate-50 active:bg-slate-100"}`}
              >
                <div className="size-11 rounded-full bg-[#5865F2]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-700">Discord</p>
                {discordStatus?.linked ? (
                  <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5">
                    <CheckCheck className="w-3 h-3" />連携済み
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">未連携</span>
                )}
              </a>

              {/* LINE */}
              <a
                href={lineStatus?.linked ? undefined : "/api/auth/line/connect"}
                className={`bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shadow-sm transition-colors ${lineStatus?.linked ? "cursor-default" : "hover:bg-slate-50 active:bg-slate-100"}`}
              >
                <div className="size-11 rounded-full bg-[#06C755]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#06C755]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-700">LINE</p>
                {lineStatus?.linked ? (
                  <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5">
                    <CheckCheck className="w-3 h-3" />連携済み
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">未連携</span>
                )}
              </a>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 text-slate-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-[0.98] transition-all mt-2"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </TabsContent>

          {/* ===== 受け取り履歴タブ ===== */}
          <TabsContent value="activity" className="focus-visible:outline-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-800 font-bold text-sm">受け取り履歴</h2>
              <ActivityIcon className="w-4 h-4 text-slate-400" />
            </div>
            {activityLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <ActivityIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">受け取り履歴はまだありません</h3>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  チケットや記念品を受け取ると、ここに履歴が表示されます。
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activities.map((act) => {
                  let Icon = CheckCircle2;
                  let iconBg = "bg-green-500/10";
                  let iconColor = "text-green-500";

                  if (act.type === "received") { Icon = Gift; iconBg = "bg-indigo-500/10"; iconColor = "text-indigo-500"; }
                  else if (act.type === "mint") { Icon = Gift; iconBg = "bg-blue-500/10"; iconColor = "text-blue-500"; }
                  else if (act.type === "transfer") {
                    Icon = Undo2;
                    if (act.status === "failed" || act.status === "EXPIRED" || act.status === "CANCELLED") {
                      Icon = XCircle; iconBg = "bg-muted"; iconColor = "text-muted-foreground";
                    } else { iconBg = "bg-orange-500/10"; iconColor = "text-orange-500"; }
                  } else if (act.type === "use") { Icon = Check; iconBg = "bg-red-500/10"; iconColor = "text-red-500"; }

                  return (
                    <div key={act.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-4 shadow-sm">
                      <div className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-slate-800">{act.title}</h4>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(act.date).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{act.description}</p>
                        {act.status === "pending" && (
                          <p className="text-[10px] text-yellow-600 mt-1">※相手の受け取り待ち</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
