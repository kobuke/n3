"use client";

import { use, Suspense, useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckinMogiri } from "@/components/checkin-mogiri";
import { toast } from "sonner";
import { 
  NFT_TYPE_KEYS, 
  NFT_ATTR_LABEL_KEYS, 
  NFT_ATTR_VALUE_KEYS 
} from "@/lib/nft-constants";

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
  const t = useTranslations('NftDetailPage');
  const tCommon = useTranslations('Common');
  const tTypes = useTranslations('NftTypes');
  const tAttrs = useTranslations('NftAttributes');
  const tValues = useTranslations('NftAttrValues');
  const tStatus = useTranslations('Common.status');

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
      if (!res.ok) throw new Error(data.error || t('toast.link_failed'));
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setTransferLink(`${origin}/claim?token=${data.token}`);
    } catch (err: any) {
      toast.error(err.message);
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
        <AppHeader title={t('title')} showBack onBack={() => router.push("/mypage/nfts")} />
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
  const categoryLabel = typeAttr ? (tTypes(NFT_TYPE_KEYS[typeAttr.value] || typeAttr.value)) : null;
  const isMogiriAllowed = typeAttr && ["experience", "asset", "more", "体験チケット", "デジタル資産", "モア"].includes(typeAttr.value);

  const isExpired = nft?.isExpired === true;
  const expiresAt = nft?.expiresAt;
  const shopifyProductUrl = nft?.shopifyProductUrl;

  const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, options || {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader
        title={t('title')}
        showBack
        onBack={() => router.push("/mypage/nfts")}
      />

      <main className="max-w-lg mx-auto px-4 py-4">
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
          {categoryLabel && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm border border-primary/20">
              {categoryLabel}
            </div>
          )}
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{name}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed whitespace-pre-wrap">{description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${isExpired
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : isUsed
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : "bg-primary/10 text-primary border-primary/20"
              }`}
          >
            {isExpired ? (
              <><AlertTriangle className="w-3.5 h-3.5" />{tStatus('expired')}</>
            ) : isUsed ? (
              <><CheckCircle2 className="w-3.5 h-3.5" />{tStatus('used')}</>
            ) : (
              <><Clock className="w-3.5 h-3.5" />{tStatus('available')}</>
            )}
          </div>
          {nft?.acquiredAt && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {t('acquired_at', { date: formatDate(nft.acquiredAt) })}
            </span>
          )}
          {expiresAt && (
            <span className={`flex items-center gap-1.5 text-xs ${isExpired ? "text-amber-500" : "text-slate-400"}`}>
              <Calendar className="w-3.5 h-3.5" />
              {isExpired 
                ? t('expired_at', { date: formatDate(expiresAt) })
                : t('expires_at', { date: formatDate(expiresAt) })
              }
            </span>
          )}
        </div>

        {isExpired ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center flex flex-col items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
            <p className="font-bold text-slate-700 text-base">{t('expired_msg')}</p>
            <p className="text-sm text-slate-500">{t('expired_desc')}</p>
            {shopifyProductUrl && (
              <a href={shopifyProductUrl} target="_blank" rel="noopener noreferrer" className="mt-2 w-full">
                <Button size="lg" className="w-full font-bold gap-2 bg-amber-500 hover:bg-amber-600">
                  <RefreshCw className="w-4 h-4" />
                  {t('renew')}
                </Button>
              </a>
            )}
          </div>
        ) : !isUsed ? (
          <>
            {isMogiriAllowed && (
              !showCheckin ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5 flex flex-col items-center gap-3 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <LogIn className="w-7 h-7 text-primary" />
                  </div>
                  <Button onClick={() => setShowCheckin(true)} size="lg" className="w-full font-bold mt-1 shadow-sm">
                    {t('use')}
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
              )
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                {t('transfer_title')}
              </h3>
              <p className="text-sm text-slate-400 mb-4">{t('transfer_desc')}</p>

              {transferLink ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <QRCodeSVG value={transferLink} size={150} level="Q" includeMargin bgColor="transparent" fgColor="#000000" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg break-all text-[10px] font-mono text-slate-400 border border-slate-200 text-center">
                    {transferLink}
                  </div>
                  <Button onClick={copyToClipboard} className="w-full flex items-center justify-center gap-2" variant={copied ? "secondary" : "default"}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? tCommon('copied') : t('copy_link')}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleCreateTransferLink} disabled={isTransferring} className="w-full" variant="default">
                  <Send className="w-4 h-4 mr-2" />
                  {isTransferring ? t('transfer_link_issued') : t('issue_transfer_link')}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center flex flex-col items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-base">{t('used_msg')}</p>
            {usedAt && (
              <p className="text-sm text-slate-400">
                {t('used_at', { date: formatDateTime(usedAt) })}
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">{t('contract_id')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 max-w-[150px] truncate">
                  {nft?.contractAddress || contract || t('unknown')}
                </span>
                {(nft?.contractAddress || contract) && (
                  <button
                    onClick={() => {
                      const address = nft?.contractAddress || contract;
                      if (address) {
                        navigator.clipboard.writeText(address);
                        toast.success(t('toast.contract_copied'));
                      }
                    }}
                    className="p-1.5 bg-slate-50 rounded-md shadow-sm border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">{t('token_id')}</span>
              <span className="text-[10px] font-mono text-slate-400">
                {nft?.tokenId || nftId}
              </span>
            </div>
            {nft?.uuid && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">{t('uuid')}</span>
                <span className="text-[10px] font-mono text-slate-400">{nft.uuid}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="border-t border-slate-200 mb-5" />
          <h2 className="text-sm font-bold text-slate-700 mb-4">{t('detail_info')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {nft?.acquiredAt && (
              <div className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col items-center text-center shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('acquired_at', { date: '' }).replace(': ', '')}</p>
                <p className="text-sm font-bold text-slate-800">{formatDateTime(nft.acquiredAt)}</p>
              </div>
            )}
            {attributes
              .filter((attr) => !["Status", "Used_At", "TemplateID", "templateId"].includes(attr.trait_type))
              .map((attr) => (
                <div key={attr.trait_type} className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col items-center text-center shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {tAttrs(NFT_ATTR_LABEL_KEYS[attr.trait_type] || attr.trait_type)}
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {tValues(NFT_ATTR_VALUE_KEYS[attr.value] || attr.value)}
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
