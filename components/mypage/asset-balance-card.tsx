"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface AssetBalanceCardProps {
  nftsCount: number;
  onShowActivities: () => void;
}

export function AssetBalanceCard({ nftsCount, onShowActivities }: AssetBalanceCardProps) {
  const t = useTranslations('AssetBalanceCard');

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{t('title')}</h3>
        <button
          onClick={onShowActivities}
          className="flex items-center text-[12px] font-bold text-[#0EA5E9] transition-opacity hover:opacity-80"
        >
          {t('history')} <ChevronRight className="ml-0.5 w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f0f9ff]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[#0EA5E9]"
          >
            <path
              d="M4 6H20C21.1 6 22 6.9 22 8V10C20.9 10 20 10.9 20 12C20 13.1 20.9 14 22 14V16C22 17.1 21.1 18 20 18H4C2.9 18 2 17.1 2 16V14C3.1 14 4 13.1 4 12C4 10.9 3.1 10 2 10V8C2 6.9 2.9 6 4 6Z"
              fill="currentColor"
            />
            <circle cx="8" cy="12" r="1.5" fill="white" />
            <circle cx="12" cy="12" r="1.5" fill="white" />
            <circle cx="16" cy="12" r="1.5" fill="white" />
          </svg>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-900 leading-tight mb-0.5 tracking-tight">
            {t('tickets_count', { count: nftsCount })}
          </div>
          <div className="text-[12px] text-slate-400 font-medium">
            {t('confirmed_in_wallet')}
          </div>
        </div>
      </div>
    </div>
  );
}
