"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Waves, Wallet, ArrowLeft, Sparkles, QrCode, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import liff from "@line/liff";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [lineId, setLineId] = useState<string | null>(null);
  const [liffLoading, setLiffLoading] = useState(true);

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
            toast.success("ログインしました！");
            const redirect = localStorage.getItem('redirectAfterLogin');
            if (redirect) {
              localStorage.removeItem('redirectAfterLogin');
              router.push(redirect);
            } else {
              router.push("/mypage");
            }
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

  // Handle LINE LIFF Initialization
  useEffect(() => {
    async function initLiff() {
      try {
        const sessionRes = await fetch("/api/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.authenticated) {
            const redirect = localStorage.getItem('redirectAfterLogin');
            if (redirect) {
              localStorage.removeItem('redirectAfterLogin');
              router.push(redirect);
            } else {
              router.push("/mypage");
            }
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setLiffLoading(false);
        return;
      }

      try {
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          const currentLineId = profile.userId;
          setLineId(currentLineId);

          const res = await fetch("/api/auth/line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lineId: currentLineId }),
          });

          const data = await res.json();
          if (res.ok && data.linked) {
            toast.success("LINEからログインしました");
            const redirect = localStorage.getItem('redirectAfterLogin');
            if (redirect) {
              localStorage.removeItem('redirectAfterLogin');
              router.push(redirect);
            } else {
              router.push("/mypage");
            }
          } else {
            setLiffLoading(false);
          }
        } else {
          if (liff.isInClient()) {
            liff.login();
          } else {
            setLiffLoading(false);
          }
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
        setLiffLoading(false);
      }
    }

    initLiff();
  }, [router]);

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
      toast.success("認証コードをメールに送信しました！");
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
        body: JSON.stringify({ otp: otpCode.trim(), lineId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "コードが正しくありません。もう一度確認してください。");
        return;
      }

      toast.success("ログイン成功！");
      const redirect = localStorage.getItem('redirectAfterLogin');
      if (redirect) {
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirect);
      } else {
        router.push("/mypage");
      }
    } catch {
      toast.error("ネットワークエラー。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (liffLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </main>
    );
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
              南城市デジタルチケット・証明書サービス
            </p>
          </div>
        </div>

        {/* Feature badges */}
        {!otpSent && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <QrCode className="w-3 h-3" /> QRチケット
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> デジタル記念品
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <Shield className="w-3 h-3" /> 安全・無料
            </div>
          </div>
        )}

        {/* Login card */}
        <Card className="w-full shadow-lg border-border/50 transition-all duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-foreground">
              {otpSent ? "メール認証" : "はじめる / ログイン"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {otpSent
                ? <>
                  <span className="font-medium text-foreground">{email}</span> に6桁の認証コードを送りました。<br />
                  メールbox（迷惑メールも）をご確認ください。
                </>
                : "メールアドレスを入力するだけで、すぐに始められます。"
              }
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">

            {/* OTP Verification Form */}
            {otpSent ? (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="text"
                    placeholder="例: 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="h-14 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoFocus
                    required
                    inputMode="numeric"
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    メールに届いた6桁の数字を入力してください
                  </p>
                </div>
                <Button type="submit" disabled={loading || otpCode.length < 6} className="h-12 text-base font-bold w-full">
                  {loading ? "認証中..." : "✓ 認証してログイン"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(""); }}
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-1 py-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  メールアドレスを変更する
                </button>
              </form>
            ) : (
              /* Initial Login Options */
              <div className="flex flex-col gap-5">

                {/* Email Login Section - PRIMARY */}
                <div className="flex flex-col gap-3">
                  <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="メールアドレスを入力"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 text-base"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading || !email} className="h-12 w-full text-base font-bold">
                      {loading ? "送信中..." : "メールで続ける →"}
                    </Button>
                  </form>
                  <p className="text-[11px] text-muted-foreground text-center">
                    ※ 登録不要。メールが届いたら6桁コードを入力するだけです。
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">暗号資産ウォレットをお持ちの方</span>
                  </div>
                </div>

                {/* Wallet Connection Section - SECONDARY */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => open()}
                    className="w-full h-10 gap-2 border-border/50 text-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    ウォレットで接続（上級者向け）
                  </Button>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center px-4">
          ログインすることで、お客様のデジタルチケットや記念品を安全に保管します。
        </p>
      </div>
    </main>
  );
}
