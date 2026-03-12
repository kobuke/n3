"use client";

import { Progress } from "@/components/ui/progress";

export function LevelProgressCard() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">レベル進捗（開発中）</h3>
        <span className="text-[11px] font-bold text-slate-400">
          ダイヤモンドまで 75%
        </span>
      </div>

      <Progress value={75} className="mb-3 h-2.5" />

      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
        <span className="text-slate-400 uppercase">プラチナ</span>
        <span className="text-[#0EA5E9] uppercase">ダイヤモンド</span>
      </div>
    </div>
  );
}
