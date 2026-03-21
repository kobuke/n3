"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { MapPin, Smartphone, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default function LocationGuidePage() {
  const t = useTranslations('LocationGuidePage');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader
        title={t('title')}
        showBack
        onBack={() => router.back()}
      />

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">{t('title')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* iOS Section */}
        <section className="space-y-4 mb-8">
          <div className="flex items-center gap-2 px-1">
            <Smartphone className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-700">{t('steps.ios.title')}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="p-4 flex items-center justify-between">
                <p className="text-sm text-slate-600 font-medium">{t(`steps.ios.step${step}` as any)}</p>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            ))}
          </div>
        </section>

        {/* Android Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Smartphone className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-700">{t('steps.android.title')}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {[1, 2, 3].map((step) => (
              <div key={step} className="p-4 flex items-center justify-between">
                <p className="text-sm text-slate-600 font-medium">{t(`steps.android.step${step}` as any)}</p>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
