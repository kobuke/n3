"use client";

import { use, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import {
  Ticket,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Calendar,
  LogIn,
  Send,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckinMogiri } from "@/components/checkin-mogiri";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

const TYPE_LABELS: Record<string, string> = {
  certificate: "証明書",
  more: "モア",
  experience: "体験チケット",
  asset: "デジタル資産",
  art: "アート",
  other: "その他",
  ticket: "チケット",
  tour: "ツアーパス",
  resident_card: "デジタル住民証",
  artwork: "アート作品",
  product: "その他",
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ nftId: string }>;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <TicketDetailContent params={params} />
    </Suspense>
  );
}

function TicketDetailContent({
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
  const [showCheckin, setShowCheckin] = useState(false);

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

  const { data: session, isLoading: sessionLoading } = useSWR("/api/session", fetcher);
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
      <div className="min-h-screen bg-slate-50">
        <AppHeader title="NFT詳細" showBack onBack={() => router.push("/mypage/nfts")} />
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
  const attributes: Array<{ trait_type: string; value: string }> = meta.attributes ?? [];
  const statusAttr = attributes.find((a) => a.trait_type === "Status");
  const status = statusAttr?.value ?? "Unused";
  const isUsed = status === "Used";
  const usedAt = attributes.find((a) => a.trait_type === "Used_At")?.value;
  const typeAttr = attributes.find((a) => a.trait_type === "Type" || a.trait_type === "type");
  const categoryLabel = typeAttr ? (TYPE_LABELS[typeAttr.value] ?? typeAttr.value) : null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const identifier = nft?.uuid || nftId;
  const qrValue = `${origin}/staff/scan?nftId=${identifier}&walletAddress=${session.walletAddress}${contract ? `&contract=${contract}` : ""}`;

  const ATTR_LABELS: Record<string, string> = {
    Status: "ステータス",
    Type: "種別",
    Source: "取得方法",
    Transferable: "譲渡",
    Used_At: "使用日時",
    Event: "イベント",
    Issued_At: "発行日",
    "Order ID": "注文ID",
  };
  const ATTR_VALUES: Record<string, string> = {
    Unused: "未使用",
    Used: "使用済み",
    Yes: "可能",
    No: "不可",
    Airdrop: "配布（QRコード）",
    LINE連携: "LINE連携",
    Purchase: "購入",
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader
        title="NFT詳細"
        showBack
        onBack={() => router.push("/mypage/nfts")}
      />

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* NFT Image with category badge */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-200 mb-5 shadow-sm border border-slate-100">
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
              <Ticket className="w-16 h-16 text-slate-300" />
            </div>
          )}
          {/* Category badge */}
          {categoryLabel && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm border border-primary/20">
              {categoryLabel}
            </div>
          )}
        </div>

        {/* Title + description */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{name}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Status badge + acquired date */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${isUsed
              ? "bg-slate-100 text-slate-500 border-slate-200"
              : "bg-primary/10 text-primary border-primary/20"
              }`}
          >
            {isUsed ? (
              <><CheckCircle2 className="w-3.5 h-3.5" />使用済み</>
            ) : (
              <><Clock className="w-3.5 h-3.5" />未使用 - 利用可能</>
            )}
          </div>
          {nft?.acquiredAt && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              取得日: {new Date(nft.acquiredAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Check-in / mogiri section — existing logic preserved */}
        {!isUsed ? (
          <>
            {!showCheckin ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5 flex flex-col items-center gap-3 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <LogIn className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-slate-700 text-center">
                  会場入り口でチケットを提示して入場できます
                </p>
                <Button
                  onClick={() => setShowCheckin(true)}
                  size="lg"
                  className="w-full font-bold mt-1 shadow-sm"
                >
                  チェックインする
                </Button>
              </div>
            ) : (
              <div className="mb-5 animate-in fade-in zoom-in-95 duration-300">
                <CheckinMogiri
                  nftId={nftId}
                  contractAddress={contract || process.env.NEXT_PUBLIC_COLLECTION_ID || ""}
                  walletAddress={session?.walletAddress || ""}
                  onComplete={() => window.location.reload()}
                  onCancel={() => setShowCheckin(false)}
                />
              </div>
            )}

            {/* Transfer section */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                チケットを譲渡する
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                専用リンクを発行して、他の人へチケットを譲渡できます。
              </p>

              {transferLink ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <QRCodeSVG
                      value={transferLink}
                      size={150}
                      level="Q"
                      includeMargin
                      bgColor="transparent"
                      fgColor="#000000"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg break-all text-[10px] font-mono text-slate-400 border border-slate-200 text-center">
                    {transferLink}
                  </div>
                  <Button
                    onClick={copyToClipboard}
                    className="w-full flex items-center justify-center gap-2"
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
                  variant="default"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isTransferring ? "発行処理中..." : "譲渡リンクを発行する"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center flex flex-col items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-base">チケットは使用済みです</p>
            {usedAt && (
              <p className="text-sm text-slate-400">
                使用日時: {new Date(usedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </div>
        )}

        {/* Identifier */}
        <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono px-2 mb-6">
          <span>ID: {nft?.tokenId || nftId}</span>
          {nft?.uuid && <span className="truncate ml-4">UUID: {nft.uuid.substring(0, 8)}...</span>}
        </div>

        {/* Attributes Grid */}
        <div>
          <div className="border-t border-slate-200 mb-5" />
          <h2 className="text-sm font-bold text-slate-700 mb-4">チケット詳細情報</h2>
          <div className="grid grid-cols-2 gap-3">
            {nft?.acquiredAt && (
              <div className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col items-center text-center shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">取得日時</p>
                <p className="text-sm font-bold text-slate-800">
                  {new Date(nft.acquiredAt).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            {attributes
              .filter((attr) => !["Status", "Used_At", "TemplateID", "templateId"].includes(attr.trait_type))
              .map((attr) => (
                <div
                  key={attr.trait_type}
                  className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col items-center text-center shadow-sm"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {ATTR_LABELS[attr.trait_type] || attr.trait_type}
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {ATTR_VALUES[attr.value] || attr.value}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
