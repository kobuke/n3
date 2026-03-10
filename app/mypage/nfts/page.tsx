"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { TicketCard } from "@/components/ticket-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const fetcher = (url: string) =>
    fetch(url).then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
    });

export default function MyNFTsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        }>
            <MyNFTsContent />
        </Suspense>
    );
}

function MyNFTsContent() {
    const router = useRouter();
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        data: session,
        error: sessionError,
        isLoading: sessionLoading,
    } = useSWR("/api/session", fetcher);

    const {
        data: nftData,
        error: nftError,
        isLoading: nftLoading,
        mutate: mutateNfts,
    } = useSWR(
        session?.authenticated ? `/api/nfts?email=${session.email}` : null,
        fetcher
    );

    useEffect(() => {
        if (!sessionLoading && (sessionError || !session?.authenticated)) {
            router.push("/");
        }
    }, [session, sessionError, sessionLoading, router]);

    if (sessionLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
                    <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                </div>
                <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!session?.authenticated) return null;

    const nfts: any[] = nftData?.nfts ?? [];

    const getCategory = (nft: any) => {
        const attributes = nft.metadata?.attributes || nft.attributes || [];
        const typeAttr = attributes.find((a: any) => a.trait_type === "Type" || a.trait_type === "type");
        if (typeAttr && typeAttr.value) {
            const val = String(typeAttr.value).toLowerCase();
            if (val === "certificate" || val === "resident_card") return "certificate";
            if (val === "more" || val === "ticket") return "more";
            if (val === "experience" || val === "tour") return "experience";
            if (val === "asset") return "asset";
            if (val === "art" || val === "artwork") return "art";
            if (val === "other" || val === "product") return "other";
            if (["certificate", "more", "experience", "asset", "art", "other"].includes(val)) return val;
        }
        const name = (nft.name || nft.metadata?.name || "").toLowerCase();
        if (name.includes("証明") || name.includes("住民") || name.includes("市民") || name.includes("名誉")) return "certificate";
        if (name.includes("体験") || name.includes("ツアー") || name.includes("観察") || name.includes("エイサー")) return "experience";
        if (name.includes("資産") || name.includes("オーナー") || name.includes("泡盛")) return "asset";
        if (name.includes("アート")) return "art";
        if (name.includes("モア") || name.includes("チケット") || name.includes("おすそ分け") || name.includes("クーポン") || name.includes("セレモニー")) return "more";
        return "other";
    };

    const filteredNfts = nfts
        .filter((nft) => {
            if (categoryFilter === "all") return true;
            return getCategory(nft) === categoryFilter;
        })
        .sort((a: any, b: any) => {
            const dateA = a.acquiredAt ? new Date(a.acquiredAt).getTime() : 0;
            const dateB = b.acquiredAt ? new Date(b.acquiredAt).getTime() : 0;
            return dateB - dateA; // 新しい順
        });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await mutateNfts();
            toast.success("情報を更新しました");
        } catch {
            toast.error("更新に失敗しました");
        } finally {
            setIsRefreshing(false);
        }
    };

    const CATEGORY_FILTERS = [
        { key: "all", label: `すべて${nfts.length > 0 ? ` (${nfts.length})` : ""}` },
        { key: "certificate", label: "証明書" },
        { key: "more", label: "モア" },
        { key: "experience", label: "体験チケット" },
        { key: "asset", label: "デジタル資産" },
        { key: "art", label: "アート" },
        { key: "other", label: "その他" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <AppHeader
                title="NFTコレクション"
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
            />

            <main className="max-w-lg mx-auto px-4 py-6">

                {/* Category Filter Pills */}
                <div className="flex overflow-x-auto gap-2 mb-5 pb-1 -mx-4 px-4 hide-scrollbar">
                    {CATEGORY_FILTERS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setCategoryFilter(key)}
                            className={`flex h-9 shrink-0 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors whitespace-nowrap ${categoryFilter === key
                                ? "bg-primary text-white shadow-sm shadow-primary/20"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {nftLoading && (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col gap-3">
                                <Skeleton className="w-full aspect-square rounded-[1.1rem]" />
                                <div className="px-1">
                                    <Skeleton className="h-4 w-3/4 mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!nftLoading && (!filteredNfts || filteredNfts.length === 0) && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                            <CheckCheck className="w-7 h-7 text-slate-400" />
                        </div>
                        {categoryFilter === "all" ? (
                            <>
                                <h3 className="font-semibold text-slate-700 text-sm">まだアイテムがありません</h3>
                                <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
                                    イベントに参加したり、スタッフからQRコードを受け取ると、ここにデジタルチケットや記念品が表示されます。
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-semibold text-slate-700 text-sm">このカテゴリにはアイテムがありません</h3>
                                <button
                                    className="text-xs text-primary underline underline-offset-2"
                                    onClick={() => setCategoryFilter("all")}
                                >
                                    すべてのアイテムを表示する
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* NFT List */}
                {!nftLoading && !nftError && filteredNfts.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredNfts.map((nft: any) => {
                            const id = nft.id ?? nft.tokenId ?? nft.nftId;
                            const meta = nft.metadata ?? {};
                            return (
                                <TicketCard
                                    key={`${nft.contractAddress}-${id}`}
                                    nftId={id}
                                    name={meta.name ?? nft.name ?? "NFT Ticket"}
                                    image={meta.image ?? nft.image}
                                    description={meta.description ?? nft.description}
                                    attributes={meta.attributes ?? []}
                                    contractAddress={nft.contractAddress}
                                    acquiredAt={nft.acquiredAt}
                                    expiresAt={nft.expiresAt}
                                    isExpired={nft.isExpired}
                                />
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomNav />
        </div >
    );
}
