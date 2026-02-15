"use client";

import { useRouter } from "next/navigation";
import { Waves, LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AppHeaderProps {
  email?: string;
  walletAddress?: string;
  showLogout?: boolean;
}

export function AppHeader({
  email,
  walletAddress,
  showLogout = true,
}: AppHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    toast.success("ログアウトしました");
    router.push("/");
  }

  async function handleCopyAddress() {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      toast.success("アドレスをコピーしました");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Waves className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground tracking-tight leading-4">
              Nanjo NFT Wallet
            </span>
            {walletAddress && (
              <button
                onClick={handleCopyAddress}
                className="group flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5 hover:text-foreground transition-colors text-left"
                title="Copy address"
              >
                <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                <Copy className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-32">
              {email}
            </span>
          )}
          {showLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only">ログアウト</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
