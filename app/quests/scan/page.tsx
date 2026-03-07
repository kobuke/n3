"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, CheckCircle, ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function QuestScanPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const locationId = searchParams.get("locationId")

    const [status, setStatus] = useState<"idle" | "locating" | "checking" | "success" | "error">("idle")
    const [message, setMessage] = useState("")

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

    const submitCheckIn = async (lat: number, lng: number) => {
        setStatus("checking")
        setMessage("チェックイン情報を判定しています...")

        try {
            const res = await fetch("/api/quests/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locationId, lat, lng })
            })

            const data = await res.json()

            if (!res.ok) {
                setStatus("error")
                setMessage(data.error || "チェックインに失敗しました")
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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-6 md:p-8 space-y-8 text-center">

                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <MapPin className="w-10 h-10 text-blue-600" />
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    クエスト・チェックイン
                </h1>

                <p className="text-gray-600">
                    現在地を送信して地点への到達を記録します。<br />
                    位置情報の提供を許可してください。
                </p>

                {status === "idle" && (
                    <Button onClick={handleCheckIn} size="lg" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg">
                        現在地を取得してチェックイン
                    </Button>
                )}

                {(status === "locating" || status === "checking") && (
                    <div className="flex flex-col items-center space-y-4 text-blue-600 animate-pulse">
                        <Loader2 className="w-12 h-12 animate-spin" />
                        <p className="font-medium text-lg">{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="whitespace-pre-line font-bold text-lg text-green-800 bg-green-50 p-4 rounded-xl">
                            {message}
                        </p>
                        <Button onClick={() => router.push("/mypage")} variant="outline" className="w-full">
                            マイページへ戻る
                        </Button>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-red-600 font-medium bg-red-50 p-4 rounded-xl text-left text-sm leading-relaxed">
                            {message}
                        </p>
                        <Button onClick={() => setStatus("idle")} variant="outline" className="w-full">
                            もう一度試す
                        </Button>
                        <Button onClick={() => router.push("/mypage")} variant="ghost" className="w-full">
                            マイページへ戻る
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
