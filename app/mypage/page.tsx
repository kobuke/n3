"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Ticket, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  const {
    data: nftData,
    error: nftError,
    isLoading: nftLoading,
    mutate,
  } = useSWR(
    session?.authenticated ? `/api/nfts?email=${session.email}` : null,
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        email={session.email}
        walletAddress={session.walletAddress}
      />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Page title */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">マイチケット</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            更新
          </Button>
        </div>

        {/* Collection Warning Alert */}
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            ※このページでは、指定されたコレクション（Nanjo NFT）のチケットのみが表示されます。お客様のウォレットにあるその他のNFTは表示されません。
          </p>
        </div>

        {!nftLoading && nfts.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {nfts.length}枚のチケットが見つかりました
          </p>
        )}

        {/* Loading state */}
        {nftLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty state (No wallet / No NFTs) */}
        {!nftLoading && (!nfts || nfts.length === 0) && (
          <div className="rounded-xl border border-border/50 bg-card p-10 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Ticket className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">チケットがありません</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              ウォレットに紐づく NFT チケットが発行されるか、ここにウォレットを接続すると表示されます。
            </p>
          </div>
        )}


        {/* NFT List */}
        {!nftLoading && !nftError && nfts.length > 0 && (
          <div className="flex flex-col gap-4">
            {nfts.map((nft: any) => {
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

        {/* Discord Integration Section */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Discord連携</h3>
              <p className="text-xs text-muted-foreground">
                Discordアカウントを連携して限定ロールを取得
              </p>
            </div>
          </div>

          {discordStatus?.linked ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                連携済み: <strong>@{discordStatus.discordUsername}</strong>
              </span>
            </div>
          ) : (
            <a
              href="/api/auth/discord"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discordを連携する
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
