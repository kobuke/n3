"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Gift,
  Undo2,
  Check,
  XCircle,
  CheckCircle2,
  Activity as ActivityIcon,
  LogOut,
  ChevronRight,
  Copy,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  }, [searchParams, router]);

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
    await fetch("/api/logout", { method: "POST" });
    toast.success("ログアウトしました");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader
        title="マイページ"
        onRefresh={handleRefresh}
        isRefreshing={nftLoading || activityLoading}
      />

      <main className="max-w-lg mx-auto px-4 py-6 font-sans">
        <div className="flex flex-col gap-6">

          {/* User ID Card (Digital Resident NFT) */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#e0f2fe] to-white p-6 shadow-sm border border-slate-100/50">
            {/* Main Image */}
            <div className="relative mb-6">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2600&auto=format&fit=crop"
                  alt="Digital Resident"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
              <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#0EA5E9] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
                プラチナ
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col">
              <span className="mb-1 text-[11px] font-bold tracking-wider text-[#0EA5E9]">Web3 アイデンティティ</span>
              <h2 className="mb-4 text-2xl font-bold text-slate-900 tracking-tight">デジタル住民NFT</h2>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <img className="inline-block size-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=1" alt="" />
                    <img className="inline-block size-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=2" alt="" />
                    <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#0EA5E9] text-[10px] font-bold text-white">
                      +2.4k
                    </div>
                  </div>
                </div>
                <button className="rounded-full bg-[#0EA5E9] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:bg-[#0284C7] active:scale-95 transition-all">
                  詳細を見る
                </button>
              </div>
            </div>
          </div>

          {/* Asset Balance */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">保有するNFT</h3>
              <button
                onClick={() => setShowAllActivities(true)}
                className="flex items-center text-[12px] font-bold text-[#0EA5E9] transition-opacity hover:opacity-80"
              >
                履歴 <ChevronRight className="ml-0.5 w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f0f9ff]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#0EA5E9]">
                  <path d="M4 6H20C21.1 6 22 6.9 22 8V10C20.9 10 20 10.9 20 12C20 13.1 20.9 14 22 14V16C22 17.1 21.1 18 20 18H4C2.9 18 2 17.1 2 16V14C3.1 14 4 13.1 4 12C4 10.9 3.1 10 2 10V8C2 6.9 2.9 6 4 6Z" fill="currentColor" />
                  <circle cx="8" cy="12" r="1.5" fill="white" />
                  <circle cx="12" cy="12" r="1.5" fill="white" />
                  <circle cx="16" cy="12" r="1.5" fill="white" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-tight mb-0.5 tracking-tight">
                  {nfts.length} 枚のチケット
                </div>
                <div className="text-[12px] text-slate-400 font-medium">ウォレット内で確認済み</div>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">レベル進捗</h3>
              <span className="text-[11px] font-bold text-slate-400">ダイヤモンドまで 75%</span>
            </div>

            <Progress value={75} className="mb-3 h-2.5" />

            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
              <span className="text-slate-400 uppercase">プラチナ</span>
              <span className="text-[#0EA5E9] uppercase">ダイヤモンド</span>
            </div>
          </div>

          {/* Community Access */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-slate-900 px-1">コミュニティ連携</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Discord */}
              <a
                href={discordStatus?.linked ? undefined : "/api/auth/discord"}
                className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white py-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-colors ${discordStatus?.linked ? "cursor-default" : "hover:bg-slate-50 cursor-pointer"}`}
              >
                <div className={`flex size-12 items-center justify-center rounded-full ${discordStatus?.linked ? 'bg-[#5865F2]/10' : 'bg-[#5865F2]/10'}`}>
                  <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </div>
                <span className="text-[13px] font-bold text-slate-700 mt-1">Discord</span>
                {discordStatus?.linked ? (
                  <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />連携済み
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">未連携</span>
                )}
              </a>

              {/* LINE */}
              <a
                href={lineStatus?.linked ? undefined : "/api/auth/line/connect"}
                className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white py-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-colors ${lineStatus?.linked ? "cursor-default" : "hover:bg-slate-50 cursor-pointer"}`}
              >
                <div className={`flex size-12 items-center justify-center rounded-full ${lineStatus?.linked ? 'bg-[#00B900]/10' : 'bg-[#00B900]/10'}`}>
                  <svg className="w-6 h-6 text-[#00B900]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <span className="text-[13px] font-bold text-slate-700 mt-1">LINE</span>
                {lineStatus?.linked ? (
                  <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />連携済み
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">未連携</span>
                )}
              </a>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">ウォレットアドレス</h3>
            </div>
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-mono truncate mr-2">
                {session?.walletAddress || "未接続"}
              </span>
              {session?.walletAddress && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.walletAddress);
                    toast.success("ウォレットアドレスをコピーしました");
                  }}
                  className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            <p className="mt-3 text-[10px] text-slate-400">
              OpenSeaなどでご自身の保有するNFTを確認する際に使用してください。
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-4 text-[13px] font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] shadow-sm mt-2"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>

          {/* Activity Overlays (Hidden by default) */}
          {showAllActivities && (
            <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[100] flex flex-col bg-slate-50 animate-in slide-in-from-bottom-full duration-300 pb-20 overflow-y-auto shadow-2xl">
              {/* Activity Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
                <h2 className="text-base font-bold text-slate-900">受け取り履歴</h2>
                <button
                  onClick={() => setShowAllActivities(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                {activityLoading ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="mt-10 flex flex-col items-center justify-center text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
                      <ActivityIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2">履歴はまだありません</h3>
                    <p className="text-xs text-slate-400 max-w-[240px]">
                      チケットや記念品を受け取ると、ここに履歴が表示されます。
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activities.map((act) => {
                      let IconComp = CheckCircle2;
                      let iconBg = "bg-green-500/10";
                      let iconColor = "text-green-500";

                      if (act.type === "received") { IconComp = Gift; iconBg = "bg-[#0EA5E9]/10"; iconColor = "text-[#0EA5E9]"; }
                      else if (act.type === "mint") { IconComp = Gift; iconBg = "bg-blue-500/10"; iconColor = "text-blue-500"; }
                      else if (act.type === "transfer") {
                        IconComp = Undo2;
                        if (act.status === "failed" || act.status === "EXPIRED" || act.status === "CANCELLED") {
                          IconComp = XCircle; iconBg = "bg-slate-100"; iconColor = "text-slate-400";
                        } else { iconBg = "bg-orange-500/10"; iconColor = "text-orange-500"; }
                      } else if (act.type === "use") { IconComp = Check; iconBg = "bg-red-500/10"; iconColor = "text-red-500"; }

                      return (
                        <div key={act.id} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                          <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                            <IconComp className={`w-5 h-5 ${iconColor}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-start justify-between gap-2">
                              <h4 className="text-[13px] font-bold text-slate-900">{act.title}</h4>
                              <span className="shrink-0 text-[10px] font-medium text-slate-400">
                                {new Date(act.date).toLocaleDateString("ja-JP")}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-slate-500">{act.description}</p>
                            {act.status === "pending" && (
                              <p className="mt-1 text-[10px] font-medium text-amber-500">※相手の受け取り待ち</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
