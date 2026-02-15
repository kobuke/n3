"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Waves,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ScanLine,
  RotateCcw,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";

type ScanState =
  | { mode: "scanning" }
  | { mode: "confirming"; nftId: string }
  | { mode: "processing"; nftId: string }
  | { mode: "success"; nftId: string; usedAt: string }
  | { mode: "already_used"; nftId: string; nft?: any }
  | { mode: "error"; message: string };

export default function StaffScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <StaffScanContent />
    </Suspense>
  );
}

function StaffScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ScanState>({ mode: "scanning" });
  const [staffSecret, setStaffSecret] = useState<string | null>(null);

  useEffect(() => {
    const secret = sessionStorage.getItem("staff_secret");
    if (!secret) {
      router.push("/staff");
      return;
    }
    setStaffSecret(secret);

    // Check if nftId is in URL (from QR link)
    const nftIdParam = searchParams.get("nftId");
    if (nftIdParam) {
      setState({ mode: "confirming", nftId: nftIdParam });
    }
  }, [router, searchParams]);

  const extractNftId = useCallback((scannedData: string): string | null => {
    try {
      const url = new URL(scannedData);
      return url.searchParams.get("nftId");
    } catch {
      // If not a URL, try to use as raw nftId
      if (scannedData && scannedData.length > 5) {
        return scannedData;
      }
      return null;
    }
  }, []);

  const handleScan = useCallback(
    (result: string) => {
      const nftId = extractNftId(result);
      if (nftId) {
        setState({ mode: "confirming", nftId });
      } else {
        toast.error("Invalid QR code");
        setState({ mode: "scanning" });
      }
    },
    [extractNftId]
  );

  async function handleUseTicket(nftId: string) {
    if (!staffSecret) return;

    setState({ mode: "processing", nftId });

    try {
      const res = await fetch("/api/use-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId, staffSecret }),
      });

      const data = await res.json();

      if (res.status === 403) {
        sessionStorage.removeItem("staff_secret");
        toast.error("Invalid staff secret. Please login again.");
        router.push("/staff");
        return;
      }

      if (res.status === 409) {
        setState({ mode: "already_used", nftId, nft: data.nft });
        return;
      }

      if (!res.ok) {
        setState({ mode: "error", message: data.error || "Unknown error" });
        return;
      }

      setState({ mode: "success", nftId, usedAt: data.usedAt });
    } catch {
      setState({ mode: "error", message: "Network error. Please try again." });
    }
  }

  function resetScanner() {
    setState({ mode: "scanning" });
    // Remove nftId from URL
    router.replace("/staff/scan");
  }

  if (!staffSecret) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Staff Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-foreground text-background">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-semibold text-sm tracking-tight">
              Staff Scanner
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-80">
            <Waves className="w-3.5 h-3.5" />
            Nanjo NFT
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Scanning Mode */}
        {state.mode === "scanning" && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">Scan Ticket</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Point the camera at a customer's QR code
              </p>
            </div>
            <QrScanner onScan={handleScan} active />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ScanLine className="w-4 h-4" />
              Waiting for QR code...
            </div>
          </div>
        )}

        {/* Confirming Mode */}
        {state.mode === "confirming" && (
          <div className="flex flex-col items-center gap-6">
            <Card className="w-full shadow-lg border-border/50">
              <CardContent className="p-6 flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground">
                    Confirm Ticket Use
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Mark this ticket as used? This action cannot be undone.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {state.nftId}
                </Badge>
                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={resetScanner}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleUseTicket(state.nftId)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Use Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Mode */}
        {state.mode === "processing" && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Processing ticket...
            </p>
          </div>
        )}

        {/* Success Mode */}
        {state.mode === "success" && (
          <div className="flex flex-col items-center gap-6">
            <Card className="w-full shadow-lg border-accent/30 bg-accent/5">
              <CardContent className="p-8 flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-accent" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">
                    Ticket Verified
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    The ticket has been marked as used successfully.
                  </p>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  <p>Used at: {new Date(state.usedAt).toLocaleString("ja-JP")}</p>
                  <p className="font-mono mt-1 opacity-60">{state.nftId}</p>
                </div>
              </CardContent>
            </Card>
            <Button onClick={resetScanner} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Scan Next Ticket
            </Button>
          </div>
        )}

        {/* Already Used Mode */}
        {state.mode === "already_used" && (
          <div className="flex flex-col items-center gap-6">
            <Card className="w-full shadow-lg border-destructive/30 bg-destructive/5">
              <CardContent className="p-8 flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-destructive" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">
                    Already Used
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    This ticket has already been used and cannot be used again.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-destructive/30 text-destructive"
                >
                  {state.nftId}
                </Badge>
              </CardContent>
            </Card>
            <Button onClick={resetScanner} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Scan Next Ticket
            </Button>
          </div>
        )}

        {/* Error Mode */}
        {state.mode === "error" && (
          <div className="flex flex-col items-center gap-6">
            <Card className="w-full shadow-lg border-destructive/30 bg-destructive/5">
              <CardContent className="p-8 flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Error</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {state.message}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Button onClick={resetScanner} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
