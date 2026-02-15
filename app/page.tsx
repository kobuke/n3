"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Waves, Wallet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  // Handle wallet connection success
  useEffect(() => {
    async function loginWithWallet() {
      if (isConnected && address) {
        setLoading(true);
        try {
          const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: address }),
          });

          if (res.ok) {
            toast.success("ウォレットが接続されました");
            router.push("/mypage");
          } else {
            const data = await res.json();
            toast.error(data.error || "ログインに失敗しました");
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    }

    loginWithWallet();
  }, [isConnected, address, router]);

  // Step 1: Send OTP
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "コード送信に失敗しました");
        return;
      }

      setOtpSent(true);
      toast.success("認証コードをメールに送信しました");
    } catch {
      toast.error("ネットワークエラー。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "無効なコードです");
        return;
      }

      toast.success("認証成功！");
      router.push("/mypage");
    } catch {
      toast.error("ネットワークエラー。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary/5" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/5" />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-primary/3" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo and branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Waves className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Nanjo NFT Wallet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              沖縄リゾート デジタルチケット
            </p>
          </div>
        </div>

        {/* Login card */}
        <Card className="w-full shadow-lg border-border/50 transition-all duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-foreground">
              {otpSent ? "メール認証" : "ログイン"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {otpSent
                ? `${email} に送信された6桁のコードを入力してください`
                : "ウォレットへのアクセス方法を選択してください"
              }
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">

            {/* OTP Verification Form */}
            {otpSent ? (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <Input
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="h-12 text-center text-xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                  required
                />
                <Button type="submit" disabled={loading || otpCode.length < 6} className="h-10 text-sm font-medium w-full">
                  {loading ? "認証中..." : "認証してログイン"}
                </Button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  別のメールアドレスを使用
                </button>
              </form>
            ) : (
              /* Initial Login Options */
              <div className="flex flex-col gap-6">

                {/* Email Login Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground">メールでログイン</span>
                    <p className="text-[10px] text-muted-foreground">メールでNFTを受け取った方向け</p>
                  </div>
                  <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-10 text-base"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading || !email} className="h-10 w-full" variant="secondary">
                      {loading ? "送信中..." : "メールで続行"}
                    </Button>
                  </form>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">または</span>
                  </div>
                </div>

                {/* Wallet Connection Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground">ウォレット接続</span>
                    <p className="text-[10px] text-muted-foreground">MetaMask、Rainbow など</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => open()}
                    className="w-full h-10 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
                  >
                    <Wallet className="w-4 h-4" />
                    ウォレットを接続
                  </Button>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
