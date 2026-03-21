import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default function RulesPage() {
  const t = useTranslations("LegalLinksCard");

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader title={t("rules")} showBack />
      <main className="max-w-lg mx-auto px-4 py-8 font-sans">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">地域トークン（MORE MORE）運用規定</h1>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <p>
              本規定は、N3システム内で流通する地域トークン「MORE MORE」（以下「本トークン」）の取扱いを定めるものです。
            </p>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">1. 本トークンの性質</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>本トークンは、南城市への貢献、交流、および感謝の指標として発行されるコミュニティポイントであり、日本円その他の法定通貨との換金性を持たないものとします。</li>
                <li>本トークンは、資金決済法における「前払式支払手段」には該当しません。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">2. 付与と取得</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>ユーザーは、当社が指定するイベントへの参加、SNSでの情報発信、アンケート回答等、特定の活動を行うことで本トークンの付与を受けることができます。</li>
                <li>不正な手段（システムの改ざん等）により取得されたトークンは、当社の判断により即時没収・無効化できるものとします。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">3. 利用および消し込み</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>本トークンは、当社が指定する特典（体験メニュー、クーポン等）との交換に利用できます。</li>
                <li>特典との交換が完了（消し込み）した後は、理由の如何を問わずトークンの返還は行えません。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">4. 有效期限と失効</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>本トークンの有効期限は、原則として2026年3月末日の実証実験終了時までとします。</li>
                <li>LINEアカウントの削除、またはデジタル住民としての資格を喪失した場合、保有するトークンはすべて失効します。</li>
              </ol>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
