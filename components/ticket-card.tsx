"use client";

import Image from "next/image";
import Link from "next/link";
import { Ticket, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface TicketCardProps {
  nftId: string;
  name: string;
  image?: string;
  description?: string;
  attributes?: NFTAttribute[];
  contractAddress?: string;
  acquiredAt?: string;
}

const TYPE_LABELS: Record<string, string> = {
  certificate: "証明書",
  more: "モア",
  experience: "体験チケット",
  asset: "デジタル資産",
  art: "アート",
  other: "その他",
  // 旧タイプの後方互換
  ticket: "チケット",
  tour: "ツアーパス",
  resident_card: "デジタル住民証",
  artwork: "アート作品",
  product: "その他",
};

export function TicketCard({
  nftId,
  name,
  image,
  description,
  attributes = [],
  contractAddress,
  acquiredAt,
}: TicketCardProps) {
  const statusAttr = attributes.find((a) => a.trait_type === "Status");
  const status = statusAttr?.value ?? "Unused";
  const isUsed = status === "Used";
  const usedAt = attributes.find((a) => a.trait_type === "Used_At")?.value;
  const typeAttr = attributes.find((a) => a.trait_type === "Type" || a.trait_type === "type");

  const href = contractAddress
    ? `/mypage/${nftId}?contract=${contractAddress}`
    : `/mypage/${nftId}`;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const typeLabel = typeAttr ? (TYPE_LABELS[typeAttr.value] ?? typeAttr.value) : null;

  return (
    <Link href={href} className="block group">
      <div
        className={`rounded-xl overflow-hidden border bg-white transition-all duration-200 ${isUsed
            ? "opacity-70 grayscale-[0.4] border-slate-100 shadow-sm"
            : "border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          }`}
      >
        {/* 16:9 Thumbnail */}
        <div className="relative w-full aspect-[16/9] bg-slate-100">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isUsed ? "grayscale" : ""
                }`}
              sizes="(max-width: 600px) 100vw, 600px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-10 h-10 text-slate-300" />
            </div>
          )}
          {/* 使用状態バッジ */}
          <div className="absolute top-2 right-2">
            {isUsed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                <CheckCircle2 className="w-3 h-3" />
                使用済み
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <ShieldCheck className="w-3 h-3" />
                有効
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              {acquiredAt && (
                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider mb-0.5">
                  取得日: {formatDate(acquiredAt)}
                </p>
              )}
              <h3 className="text-slate-900 text-base font-bold leading-tight">{name}</h3>
            </div>
            {typeLabel && (
              <span className="flex-shrink-0 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                {typeLabel}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50">
            <div className="flex items-center text-slate-500 text-xs">
              {isUsed && usedAt ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span>使用日: {formatDate(usedAt)}</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span>未使用</span>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant={isUsed ? "ghost" : "default"}
              className={`h-8 text-xs px-3 ${isUsed
                  ? "text-slate-500 bg-slate-100"
                  : "bg-primary text-white shadow-sm shadow-primary/20"
                }`}
            >
              詳細を見る
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
