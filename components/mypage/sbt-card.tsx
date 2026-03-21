"use client";

import { useRouter } from "@/i18n/routing";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SbtCardProps {
  mainSbt?: any;
  mainSbtTemplate?: any;
  purchaseUrl?: string | null;
  holdersCount: number;
}

export function SbtCard({ mainSbt, mainSbtTemplate, purchaseUrl, holdersCount }: SbtCardProps) {
  const t = useTranslations('SbtCard');
  const router = useRouter();

  let mainSbtImage = null;
  let mainSbtName = mainSbtTemplate?.name || "---";
  let mainSbtRank: string | null = null;
  let hasMainSbt = false;

  if (mainSbt) {
    hasMainSbt = true;
    mainSbtImage = mainSbt.image || mainSbtTemplate?.image_url;
    mainSbtName = mainSbt.name || mainSbtTemplate?.name || "---";

    // attributes から Rank を探す
    const attrs = mainSbt.metadata?.attributes || [];
    const rankAttr = attrs.find(
      (a: any) =>
        a.trait_type === "Rank" ||
        a.trait_type === "rank" ||
        a.trait_type === "ランク"
    );
    if (rankAttr) {
      mainSbtRank = rankAttr.value;
    }
  }

  const formatHolders = (num: number) => {
    if (num >= 1000) return `+${(num / 1000).toFixed(1)}k`;
    return `${num}`;
  };

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#e0f2fe] to-white p-6 shadow-sm border border-slate-100/50">
      {/* Main Image */}
      <div className="relative mb-6">
        <div className={`flex items-center justify-center aspect-[16/9] w-full overflow-hidden rounded-2xl ${hasMainSbt && mainSbtImage ? 'bg-black' : 'bg-slate-300/80 border border-slate-200'}`}>
          {hasMainSbt && mainSbtImage ? (
            <img
              src={mainSbtImage}
              alt={mainSbtName}
              className="h-full w-full object-cover opacity-90"
            />
          ) : (
            <>
              {/* Unowned state overlay: gray background + Purchase Button */}
              {!hasMainSbt && purchaseUrl && (
                <a
                  href={purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-md hover:scale-105 active:scale-95 transition-all z-10"
                >
                  <Link2 className="w-4 h-4" />
                  {t('view_detail')}
                </a>
              )}
            </>
          )}
        </div>
        {mainSbtRank && (
          <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#0EA5E9] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
            {mainSbtRank}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col">
        <h2 className="mb-4 text-2xl font-bold text-slate-900 tracking-tight">
          {mainSbtName}
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex -space-x-2 relative">
              <img
                className="inline-block size-8 rounded-full border-2 border-white"
                src="https://i.pravatar.cc/100?img=1"
                alt=""
              />
              <img
                className="inline-block size-8 rounded-full border-2 border-white"
                src="https://i.pravatar.cc/100?img=2"
                alt=""
              />
            </div>
            <div className="flex h-8 px-3 items-center justify-center rounded-full border-2 border-white bg-[#0EA5E9] text-[10px] font-bold text-white shadow-sm -ml-1 z-10">
              {t('holders', { count: formatHolders(holdersCount) })}
            </div>
          </div>
          {hasMainSbt ? (
            <button
              onClick={() =>
                router.push(
                  `/mypage/${mainSbt.tokenId}?contract=${mainSbt.contractAddress}`
                )
              }
              className="rounded-full bg-[#0EA5E9] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:bg-[#0284C7] active:scale-95 transition-all"
            >
              {t('view_detail')}
            </button>
          ) : (
            <span className="rounded-full bg-slate-200 px-6 py-2.5 text-sm font-bold text-slate-400">
              {t('not_held')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
