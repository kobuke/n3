"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import {
  ArrowLeft,
  Ticket,
  CheckCircle2,
  Clock,
  MapPin,
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

  const { data: session, isLoading: sessionLoading } = useSWR(
    "/api/session",
    fetcher
  );
  const { data: nft, isLoading: nftLoading } = useSWR(
    nftId ? `/api/nfts/${nftId}` : null,
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
          <Skeleton className="h-64 w-64 rounded-2xl" />
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
  // QRコードの値には、可能であれば内部ID (UUID) を優先的に使用して、バックエンドでの検索をスムーズにする
  const identifier = nft?.uuid || nftId;
  const qrValue = `${origin}/staff/scan?nftId=${identifier}`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={session.email} showLogout={false} />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/mypage")}
        >
          <ArrowLeft className="w-4 h-4" />
          マイチケットに戻る
        </Button>

        {/* Ticket Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized // IPFSなどの外部ドメイン画像を許可するために追加
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Ticket className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground text-balance">
              {name}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-6">
          <Badge
            variant={isUsed ? "secondary" : "default"}
            className={`text-sm px-3 py-1 ${isUsed ? "" : "bg-accent text-accent-foreground"
              }`}
          >
            {isUsed ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Used
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                未使用 - 利用可能
              </span>
            )}
          </Badge>
        </div>

        {/* Identifiers Section */}
        <Card className="mb-6 bg-muted/30 border-none shadow-none">
          <CardContent className="p-3 flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>Token ID: {nft?.tokenId || nftId}</span>
            {nft?.uuid && (
              <span className="truncate ml-4">UUID: {nft.uuid}</span>
            )}
          </CardContent>
        </Card>

        {/* QR Code Section */}
        {!isUsed ? (
          <Card className="shadow-lg border-border/50">
            <CardContent className="p-6 flex flex-col items-center gap-5">
              <p className="text-sm font-medium text-foreground text-center">
                このQRコードをスタッフに提示してください
              </p>

              <div className="bg-white p-4 rounded-2xl border border-border/30 shadow-inner">
                <QRCodeSVG
                  value={qrValue}
                  size={220}
                  level="H"
                  includeMargin
                  bgColor="transparent"
                  fgColor="#000000"
                  className="text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                会場入口で提示してください
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/30 opacity-70">
            <CardContent className="p-6 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground" />
              <p className="font-medium text-foreground">
                チケットは使用済みです
              </p>
              {usedAt && (
                <p className="text-sm text-muted-foreground">
                  使用日: {new Date(usedAt).toLocaleString("ja-JP")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attributes Section */}
        {attributes.length > 0 && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h2 className="text-sm font-semibold text-foreground mb-3">
              チケット詳細
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {attributes.map((attr) => (
                <div
                  key={attr.trait_type}
                  className="rounded-lg bg-muted/50 p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {attr.trait_type}
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                    {attr.value}
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
