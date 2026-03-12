"use client";

import { useRouter } from "next/navigation";

interface SbtCardProps {
  mainSbt: any;
  holdersCount: number;
}

export function SbtCard({ mainSbt, holdersCount }: SbtCardProps) {
  const router = useRouter();

  let mainSbtImage = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2600&auto=format&fit=crop"; // ダミー画像
  let mainSbtName = "指定されたSBTはありません";
  let mainSbtRank: string | null = null;
  let mainSbtCategory = "Web3 アイデンティティ";
  let hasMainSbt = false;

  if (mainSbt) {
    hasMainSbt = true;
    mainSbtImage = mainSbt.image || mainSbtImage;
    mainSbtName = mainSbt.name || "（未登録）";

    // attributes から Rank を探す
    const attrs = mainSbt.metadata?.attributes || [];
    const rankAttr = attrs.find(
      (a: any) =>
        a.trait_type === "Rank" ||
        a.trait_type === "rank" ||
        a.trait_type === "ランク"
    );
    if (rankAttr) {
      mainSbtRank = rankAttr.value;
    }
  }

  const formatHolders = (num: number) => {
    if (num >= 1000) return `+${(num / 1000).toFixed(1)}k`;
    return `${num}`;
  };

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#e0f2fe] to-white p-6 shadow-sm border border-slate-100/50">
      {/* Main Image */}
      <div className="relative mb-6">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black">
          <img
            src={mainSbtImage}
            alt={mainSbtName}
            className="h-full w-full object-cover opacity-90"
          />
        </div>
        {mainSbtRank && (
          <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#0EA5E9] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
            {mainSbtRank}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col">
        <span className="mb-1 text-[11px] font-bold tracking-wider text-[#0EA5E9]">
          {mainSbtCategory}
        </span>
        <h2 className="mb-4 text-2xl font-bold text-slate-900 tracking-tight">
          {hasMainSbt ? mainSbtName : "マイデジタル住民証"}
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex -space-x-2 relative">
              <img
                className="inline-block size-8 rounded-full border-2 border-white"
                src="https://i.pravatar.cc/100?img=1"
                alt=""
              />
              <img
                className="inline-block size-8 rounded-full border-2 border-white"
                src="https://i.pravatar.cc/100?img=2"
                alt=""
              />
            </div>
            <div className="flex h-8 px-3 items-center justify-center rounded-full border-2 border-white bg-[#0EA5E9] text-[10px] font-bold text-white shadow-sm -ml-1 z-10">
              所持者 {formatHolders(holdersCount)}人
            </div>
          </div>
          {hasMainSbt ? (
            <button
              onClick={() =>
                router.push(
                  `/mypage/${mainSbt.tokenId}?contract=${mainSbt.contractAddress}`
                )
              }
              className="rounded-full bg-[#0EA5E9] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:bg-[#0284C7] active:scale-95 transition-all"
            >
              詳細を見る
            </button>
          ) : (
            <button className="rounded-full bg-slate-200 px-6 py-2.5 text-sm font-bold text-slate-400 cursor-not-allowed">
              未取得
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
