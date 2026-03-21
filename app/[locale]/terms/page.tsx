import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default function TermsPage() {
  const t = useTranslations("LegalLinksCard");

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader title={t("terms")} showBack />
      <main className="max-w-lg mx-auto px-4 py-8 font-sans">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">利用規約</h1>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <p>
              本規約は、DMOなんじょう株式会社（以下「当社」）が提供する「なんじょうNFTポータル」の利用条件を定めるものです。
            </p>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">第1条（目的と実証実験）</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>本システムは、南城市における観光DX推進を目的とした実証実験（PoC）の一環として運営されます。</li>
                <li>本実証実験の期間は、原則として2026年3月末日までとします。期間終了後のデータやNFTの取り扱いは、当社の判断により決定されます。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">第2条（定義）</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>「なんじょう結まーる証」：当システムを通じて発行される譲渡不能なトークン（SBT等）を指します。</li>
                <li>「MORE MORE」：地域への貢献や活動に応じて付与されるコミュニティポイントを指します。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">第3条（アカウント連携）</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>ユーザーは、自己のLINEアカウントおよびDiscordアカウントを本システムと連携させるものとします。</li>
                <li>LINEアカウントを紛失、削除、または第三者に奪取されたことにより生じた損害（保有NFTやポイントの消失等）について、当社は一切の責任を負いません。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">第4条（禁止事項）</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>システムの脆弱性を突く行為、または不正に「MORE MORE」を取得する行為。</li>
                <li>デジタル住民としての権利を他者に有償で貸与、または不正に譲渡する行為。</li>
                <li>南城市、他ユーザー、または当社の名誉・信用を毀損する行為。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">第5条（免責事項）</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>当社は、システムの停止、中断、データの消失、およびNFTの市場価値の変動について、いかなる責任も負いません。</li>
                <li>本サービスは「現状有姿」で提供され、特定の目的への適合性や継続性を保証するものではありません。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">第6条（規約の変更）</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>当社は、実証実験の進捗に応じて、ユーザーの承諾を得ることなく本規約を変更できるものとします。変更後の規約はポータルサイトに掲載した時点で効力を生じます。</li>
              </ol>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
