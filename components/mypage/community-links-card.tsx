"use client";

import { CheckCircle2 } from "lucide-react";

interface CommunityLinksCardProps {
  discordStatus: any;
  lineStatus: any;
}

export function CommunityLinksCard({
  discordStatus,
  lineStatus,
}: CommunityLinksCardProps) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold text-slate-900 px-1">
        コミュニティ連携
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Discord */}
        <a
          href={discordStatus?.linked ? undefined : "/api/auth/discord"}
          className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white py-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-colors ${
            discordStatus?.linked
              ? "cursor-default"
              : "hover:bg-slate-50 cursor-pointer"
          }`}
        >
          <div
            className={`flex size-12 items-center justify-center rounded-full bg-[#5865F2]/10`}
          >
            <svg
              className="w-6 h-6 text-[#5865F2]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
          </div>
          <span className="text-[13px] font-bold text-slate-700 mt-1">
            Discord
          </span>
          {discordStatus?.linked ? (
            <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              連携済み
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">
              未連携
            </span>
          )}
        </a>

        {/* LINE */}
        <a
          href={lineStatus?.linked ? undefined : "/api/auth/line/connect"}
          className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white py-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-colors ${
            lineStatus?.linked
              ? "cursor-default"
              : "hover:bg-slate-50 cursor-pointer"
          }`}
        >
          <div
            className={`flex size-12 items-center justify-center rounded-full bg-[#00B900]/10`}
          >
            <svg
              className="w-6 h-6 text-[#00B900]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </div>
          <span className="text-[13px] font-bold text-slate-700 mt-1">
            LINE
          </span>
          {lineStatus?.linked ? (
            <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              連携済み
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">
              未連携
            </span>
          )}
        </a>
      </div>
    </div>
  );
}
