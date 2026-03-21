"use client";

import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

export function LevelProgressCard() {
  const t = useTranslations('LevelProgressCard');

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{t('title')}</h3>
        <span className="text-[11px] font-bold text-slate-400">
          {t('progress_desc')}
        </span>
      </div>

      <Progress value={75} className="mb-3 h-2.5" />

      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
        <span className="text-slate-400 uppercase">{t('platinum')}</span>
        <span className="text-[#0EA5E9] uppercase">{t('diamond')}</span>
      </div>
    </div>
  );
}
