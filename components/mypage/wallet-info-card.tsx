"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

interface WalletInfoCardProps {
  walletAddress?: string;
}

export function WalletInfoCard({ walletAddress }: WalletInfoCardProps) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">ウォレットアドレス</h3>
      </div>
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs text-slate-500 font-mono truncate mr-2">
          {walletAddress || "未接続"}
        </span>
        {walletAddress && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(walletAddress);
              toast.success("ウォレットアドレスをコピーしました");
            }}
            className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        OpenSeaなどでご自身の保有するNFTを確認する際に使用してください。
      </p>
    </div>
  );
}
