"use client";

import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/app-header";

export default function DiscordGuidePage() {
  const t = useTranslations('DiscordGuidePage');

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader title={t('title')} />
      <main className="max-w-lg mx-auto px-4 py-8 font-sans">
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-slate-100 mb-6">
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {t('description')}
          </p>
          
          <ul className="space-y-4 text-sm font-medium text-slate-800">
            <li className="flex gap-2 items-start">
              <span>{t('step1')}</span>
            </li>
            <li className="flex gap-2 items-start">
              <span>{t('step2')}</span>
            </li>
            <li className="flex gap-2 items-start">
              <span>{t('step3')}</span>
            </li>
          </ul>
        </div>
        
        <a
          href="/api/auth/discord"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-[#5865F2] py-4 text-[14px] font-bold text-white transition-all hover:bg-[#4752C4] active:scale-[0.98] shadow-sm"
        >
          {t('connect_discord')}
        </a>
      </main>
    </div>
  );
}
