"use client";

import { mutate } from "swr";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Ticket } from "lucide-react";
import { NFT_TYPE_LABELS } from "@/lib/nft-constants";
import { useTranslations } from "next-intl";

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
  expiresAt?: string | null;
  isExpired?: boolean;
  rawNft?: any;
}

export function TicketCard({
  nftId,
  name,
  image,
  description,
  attributes = [],
  contractAddress,
  acquiredAt,
  expiresAt,
  isExpired = false,
  rawNft,
}: TicketCardProps) {
  const t = useTranslations('Common.status');
  const tNfts = useTranslations('MyNFTsPage');
  const statusAttr = attributes.find((a) => a.trait_type === "Status");
  const status = statusAttr?.value ?? "Unused";
  const isUsed = status === "Used";
  const isInactive = isUsed || isExpired;
  const typeAttr = attributes.find((a) => a.trait_type === "Type" || a.trait_type === "type");

  const href = contractAddress
    ? `/mypage/${nftId}?contract=${contractAddress}` as const
    : `/mypage/${nftId}` as const;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const typeLabel = typeAttr ? (NFT_TYPE_LABELS[typeAttr.value] ?? typeAttr.value) : null;

  const handlePrefetch = () => {
    if (!rawNft) return;
    const cacheKey = contractAddress
      ? `/api/nfts/${nftId}?contract=${contractAddress}`
      : `/api/nfts/${nftId}`;
    mutate(cacheKey, rawNft, { revalidate: true });
  };

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 group"
      onClick={handlePrefetch}
      onMouseEnter={handlePrefetch}
    >
      <div
        className={`relative p-1.5 bg-gradient-to-br from-[#1392ec] to-[#a5d8ff] rounded-[1.1rem] shadow-lg shadow-[#1392ec]/5 group-hover:shadow-[#1392ec]/20 transition-all ${isInactive ? "opacity-75 grayscale-[0.3]" : ""
          }`}
      >
        <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-slate-100">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isInactive ? "grayscale" : ""
                }`}
              sizes="(max-width: 600px) 100vw, 600px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-10 h-10 text-slate-300" />
            </div>
          )}
        </div>
      </div>
      <div className="px-1">
        <div className="flex justify-between items-start mb-1 gap-1">
          <p className="text-slate-900 text-sm font-bold truncate">{name}</p>
          {isExpired ? (
            <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{t('expired')}</span>
          ) : isUsed ? (
            <span className="shrink-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{t('used')}</span>
          ) : (
            <span className="shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{t('valid')}</span>
          )}
        </div>
        <p className="text-slate-500 text-[11px] font-medium">
          {tNfts('acquired_at', { date: acquiredAt ? formatDate(acquiredAt) : "-" })}
        </p>
      </div>
    </Link>
  );
}
