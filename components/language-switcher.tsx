"use client";

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useTranslations('MyPage');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const toggleLocale = () => {
    const nextLocale = locale === 'ja' ? 'en' : 'ja';
    
    // @ts-ignore - pathname might need params if it has dynamic segments
    router.replace(
      // @ts-ignore
      { pathname, params },
      { locale: nextLocale }
    );
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 active:scale-[0.98] shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Languages className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-[13px] font-bold text-slate-800">{t('language_setting')}</p>
          <p className="text-[11px] text-slate-500">
            {locale === 'ja' ? '日本語 / English' : 'English / Japanese'}
          </p>
        </div>
      </div>
      <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
        {locale === 'ja' ? '日本語' : 'English'}
      </div>
    </button>
  );
}
