import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default function PrivacyPage() {
  const t = useTranslations("LegalLinksCard");

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader title={t("privacy")} showBack />
      <main className="max-w-lg mx-auto px-4 py-8 font-sans">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">プライバシーポリシー</h1>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <p>
              DMOなんじょう株式会社（以下「当社」）は、本プロジェクトにおける利用者の個人情報および関連データの取扱いについて、以下の通り定めます。
            </p>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">1. 取得する情報</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>LINE株式会社より提供される内部識別子（ユーザーID）およびプロフィール情報。</li>
                <li>Discordより提供されるユーザーIDおよびロール（権限）情報。</li>
                <li>暗号資産ウォレットのアドレスおよび保有するNFTの情報。</li>
                <li>本システムの利用履歴（ポイント取得・使用履歴、イベント参加履歴等）。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">2. 利用目的</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>デジタル住民証NFTの発行・管理および本人確認のため。</li>
                <li>保有NFTに応じたDiscord内ロールの自動付与およびコミュニティ運営のため。</li>
                <li>地域トークン「MORE MORE」の付与および消し込み（使用）管理のため。</li>
                <li>南城市の観光施策の改善を目的とした統計データの分析。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">3. 第三者への提供および共同利用</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>本プロジェクトの共同実施体（株式会社NomadResort、日本Web3ツーリズム協会等）に対し、サービス運営に必要な範囲で情報を共有する場合があります。</li>
                <li>法令に基づく場合を除き、本人の同意なく上記以外の第三者に提供することはありません。</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-base text-slate-800 mb-2">4. 外部サービスの利用</h2>
              <p>
                本システムはLINE、Discord、Shopify等の外部サービスと連携します。各サービスの利用規約およびプライバシーポリシーについては、それぞれの運営会社が定めるものに従うものとします。
              </p>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
