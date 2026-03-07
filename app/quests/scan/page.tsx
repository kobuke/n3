"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, CheckCircle, ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function QuestScanInner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const locationId = searchParams.get("locationId")

    const [status, setStatus] = useState<"idle" | "locating" | "selection" | "checking" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const [gps, setGps] = useState<{ lat: number, lng: number } | null>(null)
    const [eligibleNfts, setEligibleNfts] = useState<any[]>([])
    const [requireNft, setRequireNft] = useState(false)

    useEffect(() => {
        if (!locationId) {
            setStatus("error")
            setMessage("無効なQRコードです。Location ID が見つかりません。")
        }
    }, [locationId])

    const handleCheckIn = () => {
        if (!locationId) return

        setStatus("locating")
        setMessage("現在地を取得しています...")

        if (!navigator.geolocation) {
            setStatus("error")
            setMessage("お使いのブラウザは位置情報をサポートしていません。")
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                setGps({ lat: latitude, lng: longitude })
                submitCheckIn(latitude, longitude)
            },
            (error) => {
                console.error("GPS Error:", error)
                setStatus("error")
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setMessage("位置情報の取得が拒否されました。ブラウザの設定から位置情報の利用を許可してください。")
                        break
                    case error.POSITION_UNAVAILABLE:
                        setMessage("位置情報が利用できません。")
                        break
                    case error.TIMEOUT:
                        setMessage("位置情報の取得がタイムアウトしました。")
                        break
                    default:
                        setMessage("位置情報の取得中に不明なエラーが発生しました。")
                        break
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }

    const submitCheckIn = async (lat: number, lng: number, tokenId?: string) => {
        setStatus("checking")
        setMessage(tokenId ? "チェックインを実行しています..." : "チェックイン情報を判定しています...")

        try {
            const res = await fetch("/api/quests/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locationId, lat, lng, tokenId })
            })

            const data = await res.json()

            if (!res.ok) {
                setStatus("error")
                setMessage(data.error || "チェックインに失敗しました")
                if (data.requireNft) setRequireNft(true)
                return
            }

            if (data.selectionRequired) {
                setEligibleNfts(data.eligibleNfts)
                setStatus("selection")
                return
            }

            setStatus("success")
            let successMsg = "🎉 チェックインに成功しました！"
            if (data.isLevelUp) successMsg += "\n✨ 状態が進化しました！(ウォレット反映まで少し時間がかかります)"
            if (data.isComplete) successMsg += "\n🏆 全てのクエストをクリアしました！"
            if (data.rewardMinted) successMsg += "\n🎁 追加の報酬NFTがウォレットに付与されました！"

            setMessage(successMsg)

        } catch (error) {
            setStatus("error")
            setMessage("サーバー通信エラーが発生しました。")
        }
    }

    return (
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-6 md:p-8 space-y-6 text-center">

            {status !== "selection" && status !== "success" && status !== "error" && (
                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <MapPin className="w-10 h-10 text-blue-600" />
                </div>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                クエスト・チェックイン
            </h1>

            {status === "idle" && (
                <>
                    <p className="text-gray-600">
                        現在地を送信して地点への到達を記録します。<br />
                        位置情報の提供を許可してください。
                    </p>
                    <Button onClick={handleCheckIn} size="lg" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg mt-4">
                        スキャンを開始
                    </Button>
                </>
            )}

            {(status === "locating" || status === "checking") && (
                <div className="flex flex-col items-center space-y-4 text-blue-600 animate-pulse py-8">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="font-medium text-lg">{message}</p>
                </div>
            )}

            {status === "selection" && (
                <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-gray-800">進化させるNFTを選択</h2>
                        <p className="text-sm text-gray-500">このクエストを記録するNFTを選んでください。</p>
                    </div>

                    <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {eligibleNfts.map((nft) => (
                            <button
                                key={nft.tokenId}
                                onClick={() => gps && submitCheckIn(gps.lat, gps.lng, nft.tokenId)}
                                className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:ring-2 hover:ring-blue-500 transition-all border border-gray-100 text-left group"
                            >
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                    {nft.image ? (
                                        <img src={nft.image.replace("ipfs://", "https://ipfs.io/ipfs/")} alt={nft.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">NFT</div>
                                    )}
                                </div>
                                <div className="ml-4 flex-1">
                                    <div className="font-bold text-gray-900 group-hover:text-blue-700">{nft.name}</div>
                                    <div className="text-xs text-gray-500">ID: {nft.tokenId}</div>
                                </div>
                                <CheckCircle className="w-5 h-5 text-transparent group-hover:text-blue-500 transition-colors" />
                            </button>
                        ))}
                    </div>

                    <Button variant="ghost" className="w-full text-gray-500" onClick={() => setStatus("idle")}>
                        キャンセル
                    </Button>
                </div>
            )}

            {status === "success" && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="whitespace-pre-line font-bold text-lg text-green-800 bg-green-50 p-4 rounded-xl">
                        {message}
                    </p>
                    <Button onClick={() => router.push("/mypage")} size="lg" className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-bold rounded-xl shadow-lg">
                        マイページで確認する
                    </Button>
                </div>
            )}

            {status === "error" && (
                <div className="space-y-6 animate-in shake-1 duration-500">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-red-700 font-bold">チェックインできませんでした</p>
                        <p className="text-red-600 text-sm bg-red-50 p-4 rounded-xl text-left leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="space-y-3">
                        {requireNft ? (
                            <Button onClick={() => router.push("/store")} className="w-full h-12 bg-blue-600 font-bold rounded-xl shadow-md">
                                ストアへ移動して参加証を入手
                            </Button>
                        ) : (
                            <Button onClick={() => setStatus("idle")} variant="outline" className="w-full h-12 rounded-xl border-2">
                                もう一度試す
                            </Button>
                        )}
                        <Button onClick={() => router.push("/mypage")} variant="ghost" className="w-full text-gray-500">
                            マイページへ戻る
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function QuestScanPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <Suspense fallback={
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center animate-pulse">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
                    <p>読み込み中...</p>
                </div>
            }>
                <QuestScanInner />
            </Suspense>
        </div>
    )
}
