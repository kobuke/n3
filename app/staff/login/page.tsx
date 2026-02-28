"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, Waves, ScanLine, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function StaffLoginPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      if (!res.ok) {
        toast.error("シークレットキーが正しくありません");
        setLoading(false);
        return;
      }

      toast.success("スタッフモードに切り替わりました");
      router.push("/staff/dashboard");
      router.refresh();
    } catch {
      toast.error("ログインエラー");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary/5" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/5" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-8 h-8 text-background" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              スタッフポータル
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Waves className="w-3.5 h-3.5" />
              Nanjo NFT Wallet
            </p>
          </div>
        </div>

        <Card className="w-full shadow-lg border-border/50">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              スタッフ認証
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              管理者用ダッシュボードやスキャナーにアクセスするにはスタッフシークレットを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secret">スタッフシークレットキー</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="secret"
                    type="password"
                    placeholder="シークレットキーを入力"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="pl-10 h-12 text-base"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !secret.trim()}
                className="w-full h-12 text-base font-medium gap-2"
              >
                {loading ? (
                  "認証中..."
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    認証する
                  </>
                )}
              </Button>
            </form>

            <div className="flex items-center gap-3 p-4 text-sm rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 mt-6 md:mt-4">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <p className="leading-relaxed text-xs font-medium">
                このエリアは権限を与えられたスタッフ専用です。<br />不正なアクセスの記録はサーバーに保存されます。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
