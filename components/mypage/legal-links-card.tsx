import { ChevronRight, FileText, Shield, FileCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function LegalLinksCard() {
  const t = useTranslations("LegalLinksCard");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-[13px] font-bold text-slate-700">{t("title")}</h2>
      </div>

      <div className="flex flex-col">
        <Link
          href="/terms"
          className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{t("terms")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link
          href="/privacy"
          className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{t("privacy")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link
          href="/rules"
          className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
              <FileCheck className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{t("rules")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
