"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface WalletInfoCardProps {
  walletAddress?: string;
  email?: string;
}

export function WalletInfoCard({ walletAddress, email }: WalletInfoCardProps) {
  const t = useTranslations('WalletInfoCard');

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
      {email && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{t('email_title')}</h3>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-sm text-slate-800 font-medium truncate">
               {email}
            </span>
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{t('wallet_title')}</h3>
      </div>
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs text-slate-500 font-mono truncate mr-2">
          {walletAddress || t('not_connected')}
        </span>
        {walletAddress && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(walletAddress);
              toast.success(t('copy_success'));
            }}
            className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        {t('description')}
      </p>
    </div>
  );
}
