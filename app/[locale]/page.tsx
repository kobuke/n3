"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Mail, Waves, Wallet, ArrowLeft, Sparkles, QrCode, Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import liff from "@line/liff";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export default function LoginPage() {
  const t = useTranslations('LoginPage');
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);

  const [lineId, setLineId] = useState<string | null>(null);
  const [liffLoading, setLiffLoading] = useState(true);

  const router = useRouter();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [redirectReason, setRedirectReason] = useState<string | null>(null);

  const redirectAfterLogin = useCallback(() => {
    const redirect = localStorage.getItem('redirectAfterLogin');
    if (redirect) {
      localStorage.removeItem('redirectAfterLogin');
      router.push(redirect as any);
    } else {
      router.push("/mypage/nfts");
    }
  }, [router]);

  useEffect(() => {
    const reason = localStorage.getItem('redirectAfterLoginReason');
    if (reason) {
      setRedirectReason(reason);
      localStorage.removeItem('redirectAfterLoginReason');
    }
  }, []);

  // Handle wallet connection success
  const handleWalletLogin = useCallback(async (targetAddress?: string) => {
    const activeAddress = targetAddress || address;
    if (!activeAddress) return;

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: activeAddress }),
      });

      if (res.ok) {
        localStorage.removeItem('userLoggedOut');
        toast.success(t('toast.login_success'));
        redirectAfterLogin();
      } else {
        const data = await res.json();
        toast.error(data.error || t('toast.login_failed'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('toast.network_error'));
    } finally {
      setLoading(false);
    }
  }, [address, redirectAfterLogin, t]);

  useEffect(() => {
    // ページ読み込み時の自動ログイン試行: ログアウト済みフラグがある場合はスキップ
    const isLoggedOut = localStorage.getItem('userLoggedOut') === 'true';
    if (isLoggedOut) return;

    if (isConnected && address) {
      handleWalletLogin(address);
    }
  }, [isConnected, address, handleWalletLogin]);

  // Handle LINE LIFF Initialization
  useEffect(() => {
    async function initLiff() {
      try {
        const sessionRes = await fetch("/api/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.authenticated) {
            redirectAfterLogin();
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

        // 手動ログアウト済みフラグがある場合は自動ログイン関連の処理をすべてスキップ
        const isLoggedOut = localStorage.getItem('userLoggedOut') === 'true';
        if (isLoggedOut) {
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineId(profile.userId);
          }
          setLiffLoading(false);
          return;
        }

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
            toast.success(t('toast.line_login_success'));
            redirectAfterLogin();
          } else {
            setLiffLoading(false);
          }
        } else {
          // ログアウト済みフラグがない場合のみ、LINE内ブラウザで自動ログインを実行
          if (liff.isInClient() && !isLoggedOut) {
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
  }, [router, t, redirectAfterLogin]);

  async function handlePasskeyLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    localStorage.removeItem('userLoggedOut');
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        toast.error(options.error || t('login_card.passkey_not_found'));
        return;
      }

      const assertion = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(verifyData.error || t('login_card.passkey_failed'));
        return;
      }

      toast.success(t('toast.login_success'));
      redirectAfterLogin();
    } catch (error) {
      console.error(error);
      toast.error(t('login_card.passkey_failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterPasskey() {
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        toast.error(options.error || t('login_card.passkey_failed'));
        return;
      }

      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(verifyData.error || t('login_card.passkey_failed'));
        return;
      }

      toast.success(t('login_card.passkey_registered'));
      redirectAfterLogin();
    } catch (error) {
      console.error(error);
      toast.error(t('login_card.passkey_failed'));
    } finally {
      setLoading(false);
    }
  }


  // Step 1: Send OTP
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    // ユーザーが明示的に入力を開始したのでログアウトフラグを解除
    localStorage.removeItem('userLoggedOut');

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('toast.otp_failed'));
        return;
      }

      setOtpSent(true);
      toast.success(t('toast.otp_sent'));
    } catch {
      toast.error(t('toast.network_error'));
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
        toast.error(data.error || t('toast.otp_invalid'));
        return;
      }

      localStorage.removeItem('userLoggedOut');
      toast.success(t('toast.login_success'));
      if (data.passkeyEnabled) {
        redirectAfterLogin();
      } else {
        setShowPasskeySetup(true);
      }
    } catch {
      toast.error(t('toast.network_error'));
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
        {/* Redirect reason banner */}
        {redirectReason === 'quest_checkin' && (
          <div className="w-full flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <QrCode className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">{t('redirect_reason.quest_checkin_title')}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t('redirect_reason.quest_checkin_desc')}</p>
            </div>
          </div>
        )}

        {/* Logo and branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Waves className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Feature badges */}
        {!otpSent && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <QrCode className="w-3 h-3" /> {t('features.qr')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> {t('features.digital')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <Shield className="w-3 h-3" /> {t('features.safe')}
            </div>
          </div>
        )}

        {/* Login card */}
        <Card className="w-full shadow-lg border-border/50 transition-all duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-foreground">
              {showPasskeySetup ? t('login_card.passkey_title') : otpSent ? t('login_card.otp_title') : t('login_card.title')}
            </h2>
            <div className="text-sm text-muted-foreground">
              {showPasskeySetup
                ? t('login_card.passkey_desc')
                : otpSent
                ? t.rich('login_card.otp_description', {
                  email: email,
                  br: () => <br />
                })
                : t('login_card.description')
              }
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">

            {/* OTP Verification Form */}
            {showPasskeySetup ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                  <KeyRound className="mx-auto mb-3 w-8 h-8 text-primary" />
                  <h3 className="text-base font-bold text-foreground">{t('login_card.passkey_title')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('login_card.passkey_desc')}</p>
                </div>
                <Button onClick={handleRegisterPasskey} disabled={loading} className="h-12 w-full text-base font-bold gap-2">
                  <KeyRound className="w-4 h-4" />
                  {loading ? t('login_card.verifying') : t('login_card.passkey_setup_button')}
                </Button>
                <Button variant="ghost" onClick={redirectAfterLogin} className="h-10 w-full text-sm">
                  {t('login_card.passkey_skip')}
                </Button>
              </div>
            ) : otpSent ? (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="text"
                    placeholder={t('login_card.otp_placeholder')}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="h-14 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoFocus
                    required
                    inputMode="numeric"
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    {t('login_card.otp_hint')}
                  </p>
                </div>
                <Button type="submit" disabled={loading || otpCode.length < 6} className="h-12 text-base font-bold w-full">
                  {loading ? t('login_card.verifying') : t('login_card.submit_otp')}
                </Button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(""); }}
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-1 py-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  {t('login_card.change_email')}
                </button>
              </form>
            ) : (
              /* Initial Login Options */
              <div className="flex flex-col gap-5">

                {/* Passkey Login Section - PRIMARY */}
                <div className="flex flex-col gap-3">
                  <form onSubmit={handlePasskeyLogin} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder={t('login_card.email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 text-base"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading || !email} className="h-12 w-full text-base font-bold gap-2">
                      <KeyRound className="w-4 h-4" />
                      {loading ? t('login_card.verifying') : t('login_card.passkey_button')}
                    </Button>
                  </form>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {t('login_card.passkey_desc')}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">{t('login_card.recovery_section')}</span>
                  </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
                  <Button type="submit" disabled={loading || !email} variant="secondary" className="h-11 w-full text-sm font-bold">
                    {loading ? t('login_card.sending') : t('login_card.submit_email')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {t('login_card.email_recovery_hint')}
                  </p>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">{t('login_card.wallet_section')}</span>
                  </div>
                </div>

                {/* Wallet Connection Section - SECONDARY */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isConnected && address) {
                        // すでに接続済みの場合は、フラグを無視して直接ログインを試行
                        handleWalletLogin(address);
                      } else {
                        // 未接続の場合は、ユーザーの意思で接続を開始するのでフラグをクリア
                        localStorage.removeItem('userLoggedOut');
                        open();
                      }
                    }}
                    className="w-full h-10 gap-2 border-border/50 text-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    {t('login_card.wallet_connect')}
                  </Button>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center px-4">
          {t('login_card.footer')}
        </p>
      </div>
    </main>
  );
}
