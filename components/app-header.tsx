"use client";

import { useRouter } from "next/navigation";
import { Bell, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface AppHeaderProps {
  title?: string;
  email?: string;
  walletAddress?: string;
  showLogout?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AppHeader({
  title = "マイページ",
  showBack = false,
  onBack,
  onRefresh,
  isRefreshing = false,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto w-full">
        {/* Left: back button or empty placeholder */}
        <div className="flex size-10 shrink-0 items-center justify-center">
          {showBack ? (
            <button
              onClick={handleBack}
              className="flex items-center justify-center rounded-full size-10 hover:bg-slate-100 transition-colors text-slate-700"
              aria-label="戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : onRefresh ? (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center rounded-full size-10 hover:bg-slate-100 transition-colors text-slate-700"
              aria-label="更新"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          ) : null}
        </div>

        {/* Center: title */}
        <h2 className="text-slate-900 text-base font-bold leading-tight tracking-tight flex-1 text-center">
          {title}
        </h2>

        {/* Right: notification bell */}
        <div className="flex w-10 items-center justify-end">
          <Link href="/mypage/notifications">
            <button
              className="flex items-center justify-center rounded-full size-10 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="通知"
            >
              <Bell className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
