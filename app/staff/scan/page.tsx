"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
  | { mode: "confirming"; nftId: string; walletAddress: string }
  | { mode: "processing"; nftId: string; walletAddress: string }
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
  const [state, setState] = useState<ScanState>(() => {
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const nftIdParam = searchParams?.get("nftId");
    const walletAddressParam = searchParams?.get("walletAddress");
    return nftIdParam && walletAddressParam
      ? { mode: "confirming", nftId: nftIdParam, walletAddress: walletAddressParam }
      : { mode: "scanning" };
  });

  const extractParams = useCallback((scannedData: string): { nftId: string; walletAddress: string } | null => {
    try {
      const url = new URL(scannedData);
      const nftId = url.searchParams.get("nftId");
      const walletAddress = url.searchParams.get("walletAddress");
      if (nftId && walletAddress) {
        return { nftId, walletAddress };
      }
      return null;
    } catch {
      // Legacy fallback or just raw string (won't work if backend requires walletAddress)
      return null;
    }
  }, []);

  const handleScan = useCallback(
    (result: string) => {
      const params = extractParams(result);
      if (params) {
        setState({ mode: "confirming", nftId: params.nftId, walletAddress: params.walletAddress });
      } else {
        toast.error("Invalid QR code formatting");
        setState({ mode: "scanning" });
      }
    },
    [extractParams]
  );

  async function handleUseTicket(nftId: string, walletAddress: string) {
    setState({ mode: "processing", nftId, walletAddress });

    try {
      const res = await fetch("/api/use-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId, walletAddress }),
      });

      const data = await res.json();

      if (res.status === 403) {
        toast.error("認証エラー。再度ログインしてください。");
        router.push("/staff/login");
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
      setState({ mode: "error", message: "ネットワークエラーです。再度お試しください。" });
    }
  }

  function resetScanner() {
    setState({ mode: "scanning" });
    router.replace("/staff/scan");
  }

  return (
    <div className="flex flex-col">
      <main className="max-w-lg mx-auto px-4 py-6 w-full">
        {/* Scanning Mode */}
        {state.mode === "scanning" && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">チケットスキャン</h1>
              <p className="text-sm text-muted-foreground mt-1">
                お客様のQRコードにカメラを向けてください
              </p>
            </div>
            <QrScanner onScan={handleScan} active />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ScanLine className="w-4 h-4" />
              QRコードを待機中...
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
                    チケット使用の確認
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    このチケットを使用済みにしますか？この操作は取り消せません。
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
                    キャンセル
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleUseTicket(state.nftId, state.walletAddress)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    使用する
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
              処理中...
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
                    使用完了
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    チケットが正常に使用済みになりました。
                  </p>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  <p>使用日時: {new Date(state.usedAt).toLocaleString("ja-JP")}</p>
                  <p className="font-mono mt-1 opacity-60">{state.nftId}</p>
                </div>
              </CardContent>
            </Card>
            <Button onClick={resetScanner} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              次のチケットをスキャン
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
                    使用済み
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    このチケットは既に使用済みです。再度使用することはできません。
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
              次のチケットをスキャン
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
                  <h2 className="text-xl font-bold text-foreground">エラー</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {state.message}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Button onClick={resetScanner} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              再試行
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
