import { getSession } from "@/lib/session"
import { createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MapPin, CheckCircle, Clock } from "lucide-react"

export default async function MyQuestsPage() {
    const session = await getSession()
    if (!session || !session.walletAddress) {
        redirect("/login")
    }

    const supabase = createAdminClient()
    const userWallet = session.walletAddress

    // 1. Get all active quests
    const { data: quests } = await supabase
        .from("quests")
        .select(`
            *,
            quest_locations (id, name, order_index, description, radius_meters)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

    // 2. Get user's progress
    const { data: progress } = await supabase
        .from("user_quest_progress")
        .select("quest_id, location_id, scanned_at")
        .eq("user_wallet", userWallet)

    if (!quests) {
        return <div className="p-8 text-center text-gray-500">クエスト情報を取得できませんでした。</div>
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
            <h1 className="text-2xl font-bold mb-6">参加可能なクエスト・スタンプラリー</h1>

            {quests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-500">
                    現在参加できるクエストはありません。
                </div>
            ) : (
                <div className="space-y-6">
                    {quests.map((quest) => {
                        // Calculate progress
                        const locations = quest.quest_locations?.sort((a: any, b: any) => a.order_index - b.order_index) || []
                        const userScans = progress?.filter(p => p.quest_id === quest.id) || []
                        const scannedLocationIds = new Set(userScans.map(s => s.location_id))

                        const totalLocs = locations.length;
                        const clearLocs = userScans.length;
                        const isComplete = totalLocs > 0 && clearLocs === totalLocs;

                        return (
                            <div key={quest.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold flex items-center">
                                            {isComplete ? <CheckCircle className="w-6 h-6 text-green-500 mr-2" /> : <MapPin className="w-6 h-6 text-blue-500 mr-2" />}
                                            {quest.title}
                                        </h2>
                                        <p className="text-gray-600 mt-2 text-sm whitespace-pre-line">{quest.description}</p>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 font-bold px-4 py-2 rounded-full text-sm">
                                        達成度 {clearLocs} / {totalLocs}
                                    </div>
                                </div>

                                <div className="mt-6 border-t pt-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">チェックポイント</h3>
                                    <div className="space-y-4">
                                        {locations.map((loc: any, idx: number) => {
                                            const isScanned = scannedLocationIds.has(loc.id)
                                            // 順次アクセスの場合、前の地点がクリアされていないとロックマーク等にするか
                                            let isLocked = false;
                                            if (quest.is_sequential && idx > 0) {
                                                const prevLoc = locations[idx - 1];
                                                if (!scannedLocationIds.has(prevLoc.id)) isLocked = true;
                                            }

                                            return (
                                                <div key={loc.id} className={`flex items-start p-4 rounded-xl border ${isScanned ? 'bg-green-50 border-green-100' : isLocked ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                                                    <div className="mr-4 mt-1">
                                                        {isScanned ? (
                                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400">
                                                                {idx + 1}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold ${isScanned ? 'text-green-800' : 'text-gray-900'}`}>{loc.name}</h4>
                                                        {loc.description && (
                                                            <p className="text-sm text-gray-500 mt-1">{loc.description}</p>
                                                        )}
                                                        {isLocked && !isScanned && (
                                                            <p className="text-xs text-red-500 mt-1 mt-2">※前の地点をクリアすると挑戦できます</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {locations.length === 0 && (
                                            <p className="text-sm text-gray-400">チェックポイントがまだ設定されていません。</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
