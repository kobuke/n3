"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { LogOut } from "lucide-react";
import { useDisconnect } from "wagmi";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SbtCard } from "@/components/mypage/sbt-card";
import { AssetBalanceCard } from "@/components/mypage/asset-balance-card";
import { LevelProgressCard } from "@/components/mypage/level-progress-card";
import { CommunityLinksCard } from "@/components/mypage/community-links-card";
import { WalletInfoCard } from "@/components/mypage/wallet-info-card";
import { ActivityHistoryModal } from "@/components/mypage/activity-history-modal";
import { LanguageSwitcher } from "@/components/language-switcher";

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
  const t = useTranslations('MyPage');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const { disconnectAsync } = useDisconnect();
  const searchParams = useSearchParams();
  const [showAllActivities, setShowAllActivities] = useState(false);
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

  useEffect(() => {
    const discordResult = searchParams.get("discord");
    if (discordResult === "success") {
      const username = searchParams.get("username");
      toast.success(`${t('discord_success')} ${username ? `@${username}` : ""}`);
      router.replace("/mypage");
    } else if (discordResult === "error") {
      const reason = searchParams.get("reason");
      toast.error(`${tCommon('error')}: ${reason || "Discord connection failed"}`);
      router.replace("/mypage");
    }

    const lineResult = searchParams.get("line");
    if (lineResult === "success") {
      const name = searchParams.get("name");
      toast.success(`${t('line_success')} ${name || ""}`);
      router.replace("/mypage");
    } else if (lineResult === "error") {
      const reason = searchParams.get("reason");
      toast.error(`${tCommon('error')}: ${reason || "LINE connection failed"}`);
      router.replace("/mypage");
    }
  }, [searchParams, router, t, tCommon]);

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

  // Discordロールのバックグラウンド同期
  useEffect(() => {
    if (session?.authenticated && discordStatus?.linked) {
      fetch("/api/discord/sync", { method: "POST" }).catch(console.error);
    }
  }, [session?.authenticated, discordStatus?.linked]);

  const {
    data: nftData,
    isLoading: nftLoading,
    mutate: mutateNfts
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

  const { data: settingsData } = useSWR(
    session?.authenticated ? "/api/settings?keys=main_sbt_template_id,main_sbt_purchase_url" : null,
    fetcher
  );
  const mainSbtTemplateId = settingsData?.main_sbt_template_id || null;
  const mainSbtPurchaseUrl = settingsData?.main_sbt_purchase_url || null;

  const { data: mainSbtTemplateData } = useSWR(
    mainSbtTemplateId ? `/api/templates/${mainSbtTemplateId}` : null,
    fetcher
  );

  const { data: statsData } = useSWR(
    mainSbtTemplateId ? `/api/stats/sbt-holders?templateId=${mainSbtTemplateId}` : null,
    fetcher
  );
  const holdersCount = statsData?.holdersCount || 0;

  const handleRefresh = async () => {
    if (session?.authenticated) {
      try {
        await Promise.all([mutateNfts(), mutateActivities()]);
      } catch {
        // silently fail on refresh
      }
    }
  };

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

  async function handleLogout() {
    try {
      // マニュアルログアウトのフラグを立てる（自動再ログイン防止）
      localStorage.setItem('userLoggedOut', 'true');
      // Wallet接続を解除 (完了を待機)
      await disconnectAsync();
    } catch (e) {
      console.error("Disconnect error:", e);
    }
    await fetch("/api/logout", { method: "POST" });
    toast.success(t('logout_success'));
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader
        title={t('title')}
        onRefresh={handleRefresh}
        isRefreshing={nftLoading || activityLoading}
      />

      <main className="max-w-lg mx-auto px-4 py-6 font-sans">
        <div className="flex flex-col gap-6">

          {/* User ID Card (Digital Resident NFT) */}
          <SbtCard
            mainSbt={nfts.find((n: any) => n.templateId === mainSbtTemplateId)}
            mainSbtTemplate={mainSbtTemplateData}
            purchaseUrl={mainSbtPurchaseUrl}
            holdersCount={holdersCount}
          />

          {/* Asset Balance */}
          <AssetBalanceCard
            nftsCount={nfts.length}
            onShowActivities={() => setShowAllActivities(true)}
          />

          {/* Level Progress */}
          <LevelProgressCard />

          {/* Community Access */}
          <CommunityLinksCard
            discordStatus={discordStatus}
            lineStatus={lineStatus}
          />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Wallet Info */}
          <WalletInfoCard walletAddress={session?.walletAddress} email={session?.email} />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-4 text-[13px] font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] shadow-sm mt-2"
          >
            <LogOut className="h-4 w-4" />
            {tCommon('logout')}
          </button>

          {/* Activity Overlays (Hidden by default) */}
          {showAllActivities && (
            <ActivityHistoryModal
              onDismiss={() => setShowAllActivities(false)}
              isLoading={activityLoading}
              activities={activities}
            />
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
