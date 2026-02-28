"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Ticket, RefreshCw, AlertCircle, CheckCircle2, Activity as ActivityIcon, LayoutList, Check, Gift, Undo2, XCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
  const lineAirdropTriggered = useRef(false);

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
  } = useSWR("/api/session", fetcher);

  // Discord connection status
  const { data: discordStatus } = useSWR(
    session?.authenticated ? "/api/discord/status" : null,
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
        if (data.ok && data.message) {
          toast.success(data.message);
        }
      })
      .catch(() => { /* silent fail */ });
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
    mutate: mutateActivities
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
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
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
    const name = (nft.name || nft.metadata?.name || "").toLowerCase();

    // 証明書・自身専用のSBT関連
    if (name.includes("市民") || name.includes("証明") || name.includes("住民") || name.includes("アート") || name.includes("支援") || name.includes("ドネーション") || name.includes("名誉")) {
      return "cert";
    }
    // チケット・通貨・特典系（譲渡可能）
    if (name.includes("モア") || name.includes("チケット") || name.includes("おすそ分け") || name.includes("クーポン") || name.includes("セレモニー") || name.includes("観察") || name.includes("エイサー") || name.includes("泡盛")) {
      return "ticket";
    }
    return "other";
  };

  const filteredNfts = nfts.filter((nft) => {
    if (categoryFilter === "all") return true;
    return getCategory(nft) === categoryFilter;
  });

  const handleRefresh = () => {
    mutateNfts();
    mutateActivities();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        email={session.email}
        walletAddress={session.walletAddress}
      />

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">マイページ</h1>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
            <RefreshCw className="w-3.5 h-3.5" />更新
          </Button>
        </div>

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="items" className="gap-2 font-medium">
              <LayoutList className="w-4 h-4" />保有アイテム
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 font-medium">
              <ActivityIcon className="w-4 h-4" />履歴
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="focus-visible:outline-none">
            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto gap-2 mb-5 pb-1 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className="rounded-full text-xs h-8 whitespace-nowrap"
              >
                すべて {nfts.length > 0 && `(${nfts.length})`}
              </Button>
              <Button
                variant={categoryFilter === "ticket" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("ticket")}
                className="rounded-full text-xs h-8 whitespace-nowrap"
              >
                チケット・特典
              </Button>
              <Button
                variant={categoryFilter === "cert" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("cert")}
                className="rounded-full text-xs h-8 whitespace-nowrap"
              >
                証明書・アート
              </Button>
              <Button
                variant={categoryFilter === "other" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("other")}
                className="rounded-full text-xs h-8 whitespace-nowrap"
              >
                その他
              </Button>
            </div>

            {/* Loading state */}
            {nftLoading && (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!nftLoading && (!filteredNfts || filteredNfts.length === 0) && (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">該当するアイテムがありません</h3>
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
                      key={id}
                      nftId={id}
                      name={meta.name ?? nft.name ?? "NFT Ticket"}
                      image={meta.image ?? nft.image}
                      description={meta.description ?? nft.description}
                      attributes={meta.attributes ?? []}
                      contractAddress={nft.contractAddress}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="focus-visible:outline-none">
            {activityLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ActivityIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">履歴はありません</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activities.map((act) => {
                  let Icon = CheckCircle2;
                  let iconColor = "text-green-500 bg-green-500/10";

                  if (act.type === 'received') {
                    Icon = Gift;
                    iconColor = "text-indigo-500 bg-indigo-500/10";
                  } else if (act.type === 'mint') {
                    Icon = Gift;
                    iconColor = "text-blue-500 bg-blue-500/10";
                  } else if (act.type === 'transfer') {
                    Icon = Undo2;
                    if (act.status === 'failed' || act.status === 'EXPIRED' || act.status === 'CANCELLED') {
                      Icon = XCircle;
                      iconColor = "text-muted-foreground bg-muted";
                    } else if (act.status === 'pending' || act.status === 'ACTIVE') {
                      iconColor = "text-yellow-500 bg-yellow-500/10";
                    } else {
                      iconColor = "text-orange-500 bg-orange-500/10";
                    }
                  } else if (act.type === 'use') {
                    Icon = Check;
                    iconColor = "text-red-500 bg-red-500/10";
                  }

                  return (
                    <div key={act.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-4 shadow-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="font-medium text-sm text-foreground">{act.title}</h4>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(act.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{act.description}</p>
                        {act.status === 'pending' && <p className="text-[10px] text-yellow-600 mt-1">※相手の受け取り待ち</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Discord Integration Section - Simplified */}
        <div className="mt-10 pt-6 border-t border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#5865F2]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Discord連携</h3>
              <p className="text-xs text-muted-foreground">限定ロールを取得</p>
            </div>
          </div>

          {discordStatus?.linked ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-xs text-foreground">連携済み: <strong>@{discordStatus.discordUsername}</strong></span>
            </div>
          ) : (
            <a href="/api/auth/discord" className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium transition-colors">
              Discordを連携する
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
