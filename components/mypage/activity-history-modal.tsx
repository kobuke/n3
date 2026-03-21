"use client";

import { XCircle, Gift, Undo2, Check, CheckCircle2, Activity as ActivityIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface ActivityHistoryModalProps {
  onDismiss: () => void;
  isLoading: boolean;
  activities: any[];
}

export function ActivityHistoryModal({
  onDismiss,
  isLoading,
  activities,
}: ActivityHistoryModalProps) {
  const t = useTranslations('ActivityModal');
  const tStatus = useTranslations('Common.status');

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[100] flex flex-col bg-slate-50 animate-in slide-in-from-bottom-full duration-300 pb-20 overflow-y-auto shadow-2xl">
      {/* Activity Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-900">{t('title')}</h2>
        <button
          onClick={onDismiss}
          className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
              <ActivityIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {t('empty')}
            </h3>
            <p className="text-xs text-slate-400 max-w-[240px]">
              {t('empty_desc')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((act) => {
              let IconComp = CheckCircle2;
              let iconBg = "bg-green-500/10";
              let iconColor = "text-green-500";

              if (act.type === "received") {
                IconComp = Gift;
                iconBg = "bg-[#0EA5E9]/10";
                iconColor = "text-[#0EA5E9]";
              } else if (act.type === "mint") {
                IconComp = Gift;
                iconBg = "bg-blue-500/10";
                iconColor = "text-blue-500";
              } else if (act.type === "transfer") {
                IconComp = Undo2;
                if (
                  act.status === "failed" ||
                  act.status === "EXPIRED" ||
                  act.status === "CANCELLED"
                ) {
                  IconComp = XCircle;
                  iconBg = "bg-slate-100";
                  iconColor = "text-slate-400";
                } else {
                  iconBg = "bg-orange-500/10";
                  iconColor = "text-orange-500";
                }
              } else if (act.type === "use") {
                IconComp = Check;
                iconBg = "bg-red-500/10";
                iconColor = "text-red-500";
              }

              return (
                <div
                  key={act.id}
                  className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
                  >
                    <IconComp className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-start justify-between gap-2">
                      <h4 className="text-[13px] font-bold text-slate-900">
                        {act.title}
                      </h4>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        {new Date(act.date).toLocaleDateString(undefined)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      {act.description}
                    </p>
                    {act.status === "pending" && (
                      <p className="mt-1 text-[10px] font-medium text-amber-500">
                        {tStatus('pending')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
