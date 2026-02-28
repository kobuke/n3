"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import {
  ArrowLeft,
  Ticket,
  CheckCircle2,
  Clock,
  MapPin,
  Share2,
  Copy,
  Check,
  QrCode,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ nftId: string }>;
}) {
  const { nftId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const contract = searchParams.get("contract");

  const [isTransferring, setIsTransferring] = useState(false);
  const [transferLink, setTransferLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Swipe detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe) {
      router.push("/mypage");
    }
  };

  const handleCreateTransferLink = async () => {
    try {
      setIsTransferring(true);
      const res = await fetch("/api/transfer/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId, contractAddress: contract }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "リンクの発行に失敗しました");

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setTransferLink(`${origin}/claim?token=${data.token}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transferLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: session, isLoading: sessionLoading } = useSWR(
    "/api/session",
    fetcher
  );
  const { data: nft, isLoading: nftLoading } = useSWR(
    nftId ? `/api/nfts/${nftId}${contract ? `?contract=${contract}` : ""}` : null,
    fetcher
  );

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) {
      router.push("/");
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading || nftLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showLogout={false} />
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session?.authenticated) return null;

  const meta = nft?.metadata ?? nft ?? {};
  const name = meta.name ?? "NFT Ticket";
  const description = meta.description;
  const image = meta.image;
  const attributes: Array<{ trait_type: string; value: string }> =
    meta.attributes ?? [];
  const statusAttr = attributes.find((a) => a.trait_type === "Status");
  const status = statusAttr?.value ?? "Unused";
  const isUsed = status === "Used";
  const usedAt = attributes.find((a) => a.trait_type === "Used_At")?.value;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const identifier = nft?.uuid || nftId;
  const qrValue = `${origin}/staff/scan?nftId=${identifier}&walletAddress=${session.walletAddress}${contract ? `&contract=${contract}` : ""}`;

  // Japanese labels for common attribute types
  const ATTR_LABELS: Record<string, string> = {
    "Status": "ステータス",
    "Type": "種別",
    "Source": "取得方法",
    "Transferable": "譲渡",
    "Used_At": "使用日時",
    "Event": "イベント",
    "Issued_At": "発行日",
  };
  const ATTR_VALUES: Record<string, string> = {
    "Unused": "未使用",
    "Used": "使用済み",
    "Yes": "可能",
    "No": "不可",
    "Airdrop": "配布（QRコード）",
    "LINE連携": "LINE連携",
    "Purchase": "購入",
  };

  return (
    <div
      className="min-h-screen bg-background pb-10 overflow-x-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <AppHeader email={session.email} showLogout={false} />

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/mypage")}
        >
          <ArrowLeft className="w-4 h-4" />
          マイチケットに戻る
        </Button>

        {/* Large NFT Image Image */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted mb-5 shadow-sm border border-border/50">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 600px) 100vw, 600px"
              priority
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Ticket Title and Subtitle */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            {name}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-6">
          <Badge
            variant={isUsed ? "secondary" : "default"}
            className={`text-sm px-4 py-1.5 ${isUsed ? "" : "bg-accent text-accent-foreground"
              }`}
          >
            {isUsed ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                使用済み
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4" />
                未使用 - 利用可能
              </span>
            )}
          </Badge>
        </div>

        {/* QR Code Section */}
        {!isUsed ? (
          <>
            <Card className="shadow-lg border-border/50 mb-6 bg-gradient-to-b from-card to-muted/20">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                {!showQr ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                      <QrCode className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground text-center">
                      会場入り口でQRコードを提示して入場できます
                    </p>
                    <Button onClick={() => setShowQr(true)} size="lg" className="w-full font-bold mt-2 shadow-sm">
                      入場用QRコードを表示する
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
                    <p className="text-sm font-bold text-foreground text-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-full mb-1">
                      このQRコードをスタッフに提示
                    </p>
                    <div className="bg-white p-5 rounded-3xl border-4 border-primary/20 shadow-xl">
                      <QRCodeSVG
                        value={qrValue}
                        size={240}
                        level="H"
                        includeMargin={false}
                        bgColor="transparent"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <MapPin className="w-4 h-4" />
                      会場入口で提示してください
                    </div>
                    <Button variant="ghost" className="text-muted-foreground" onClick={() => setShowQr(false)}>
                      QRコードを隠す
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transfer Section */}
            <Card className="shadow-sm border-border/50 mb-6">
              <CardContent className="p-5 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">チケットを譲渡する</h3>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-2">
                  チケットを他の人に譲渡するための<br />専用リンクを発行します。
                </p>

                {transferLink ? (
                  <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-center p-3 bg-white rounded-xl border border-border/30 shadow-sm">
                      <QRCodeSVG
                        value={transferLink}
                        size={150}
                        level="Q"
                        includeMargin
                        bgColor="transparent"
                        fgColor="#000000"
                        className="text-foreground"
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-lg break-all text-[10px] font-mono text-muted-foreground border border-border/50 text-center">
                      {transferLink}
                    </div>
                    <Button
                      onClick={copyToClipboard}
                      className="w-full flex items-center justify-center gap-2 font-medium"
                      variant={copied ? "secondary" : "default"}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "コピーしました" : "リンクをコピー"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateTransferLink}
                    disabled={isTransferring}
                    className="w-full"
                    variant="outline"
                  >
                    {isTransferring ? "発行処理中..." : "譲渡リンクを発行する"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-border/30 opacity-70 mb-6 bg-muted/20">
            <CardContent className="p-8 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground text-lg">
                チケットは使用済みです
              </p>
              {usedAt && (
                <p className="text-sm text-muted-foreground">
                  使用日時: {new Date(usedAt).toLocaleString("ja-JP")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Identifier Section moved down */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono px-2 opacity-50">
          <span>ID: {nft?.tokenId || nftId}</span>
          {nft?.uuid && <span className="truncate ml-4">UUID: {nft.uuid.substring(0, 8)}...</span>}
        </div>

        {/* Attributes Section */}
        {attributes.length > 0 && (
          <div className="mt-6">
            <Separator className="mb-5" />
            <h2 className="text-sm font-bold text-foreground mb-4 px-1">
              チケット詳細情報
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {attributes
                .filter(attr => !['Status', 'Used_At'].includes(attr.trait_type))
                .map((attr) => (
                  <div
                    key={attr.trait_type}
                    className="rounded-xl bg-card border border-border/40 p-3 flex flex-col justify-center items-center text-center shadow-sm"
                  >
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {ATTR_LABELS[attr.trait_type] || attr.trait_type}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {ATTR_VALUES[attr.value] || attr.value}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
