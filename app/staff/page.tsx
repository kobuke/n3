"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function StaffLoginPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;

    setLoading(true);
    // Store staff secret in sessionStorage (client-side only, not accessible by regular users)
    sessionStorage.setItem("staff_secret", secret.trim());
    toast.success("Staff mode activated");
    router.push("/staff/scan");
    setLoading(false);
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
              Staff Portal
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Waves className="w-3.5 h-3.5" />
              Nanjo NFT Wallet
            </p>
          </div>
        </div>

        <Card className="w-full shadow-lg border-border/50">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-foreground">
              Staff Authentication
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the staff secret to access the ticket scanner
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Staff secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pl-10 h-12 text-base"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !secret.trim()}
                className="h-12 text-base font-medium gap-2"
              >
                {loading ? "Authenticating..." : (
                  <>
                    Open Scanner
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
          This area is restricted to authorized staff only. The secret is verified server-side on each scan.
        </p>
      </div>
    </main>
  );
}
