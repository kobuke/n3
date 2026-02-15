"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Waves, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

// Extend Window interface for Ethereum provider
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!manualMode && !email.trim()) return;
    if (manualMode && !manualAddress.trim()) return;

    setLoading(true);
    try {
      const payload = manualMode
        ? { walletAddress: manualAddress.trim() }
        : { email: email.trim() };

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success("Welcome!");
      router.push("/mypage");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
      toast.error("MetaMask not detected. Try manual input.");
      return;
    }

    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      if (!address) {
        throw new Error("No account found");
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success("Wallet connected!");
      router.push("/mypage");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to connect wallet");
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
              Okinawa Resort Digital Ticket
            </p>
          </div>
        </div>

        {/* Login card */}
        <Card className="w-full shadow-lg border-border/50">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-foreground">
              {manualMode ? "ウォレットアドレス入力" : "ログイン"}
            </h2>
            <div className="text-sm text-muted-foreground space-y-4 mt-2">
              <p>
                {manualMode
                  ? "お手持ちのウォレットアドレス(0x...)を入力してください。"
                  : "NFT受け取りに使用したメールアドレスを入力するか、ウォレットを接続してください。"
                }
              </p>

              {!manualMode && (
                <div className="bg-muted/50 p-3 rounded-lg text-xs text-left space-y-2 border border-border/50 leading-relaxed">
                  <p className="font-medium text-foreground">ログイン方法の選び方:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>
                      <span className="font-semibold text-foreground">メールアドレスで受け取った方:</span>
                      <br />NFT購入時の登録メールアドレスを入力してください。
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">MetaMask等のウォレットで受け取った方:</span>
                      <br />「Connect Wallet」ボタンを使用してください。
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {!manualMode ? (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 text-base"
                    required
                    autoComplete="email"
                  />
                </div>
              ) : (
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="0x123...abc"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="pl-10 h-10 text-base font-mono"
                    required
                  />
                </div>
              )}

              <Button type="submit" disabled={loading || (manualMode ? !manualAddress.trim() : !email.trim())} className="h-10 text-sm font-medium w-full">
                {loading ? "Loading..." : (manualMode ? "View Tickets" : "Login with Email")}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleConnectWallet}
                disabled={loading}
                className="w-full h-10 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet (MetaMask)
              </Button>

              <button
                type="button"
                onClick={() => setManualMode(!manualMode)}
                className="text-xs text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-4 transition-colors text-center"
              >
                {manualMode ? "Back to Email Login" : "Enter Wallet Address Manually"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
          Your wallet is securely linked via Crossmint or direct connection.
        </p>
      </div>
    </main>
  );
}
