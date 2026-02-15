"use client";

import { useRouter } from "next/navigation";
import { Waves, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AppHeaderProps {
  email?: string;
  showLogout?: boolean;
}

export function AppHeader({ email, showLogout = true }: AppHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Waves className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">
            Nanjo NFT Wallet
          </span>
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
              <span className="sr-only sm:not-sr-only">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
