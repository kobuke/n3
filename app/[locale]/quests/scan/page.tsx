"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { MapPin, CheckCircle, ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function QuestScanInner() {
    const t = useTranslations('QuestPage.scan');
    const tCommon = useTranslations('Common');
    const searchParams = useSearchParams()
    const router = useRouter()
    const locationId = searchParams.get("locationId")
    const [status, setStatus] = useState<"idle" | "locating" | "selection" | "checking" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const [gps, setGps] = useState<{ lat: number, lng: number } | null>(null)
    const [checkedInTokenId, setCheckedInTokenId] = useState<string | null>(null)
    const [eligibleNfts, setEligibleNfts] = useState<any[]>([])
    const [requireNft, setRequireNft] = useState(false)

    useEffect(() => {
        if (!locationId) {
            setStatus("error")
            setMessage(t('invalid_qr'))
        }
    }, [locationId, t])

    const handleCheckIn = () => {
        if (!locationId) return
        setStatus("locating")
        setMessage(t('locating'))

        if (!navigator.geolocation) {
            setStatus("error")
            setMessage(t('geo_not_supported'))
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
                        setMessage(t('geo_denied'))
                        break
                    case error.POSITION_UNAVAILABLE:
                        setMessage(t('geo_unavailable'))
                        break
                    case error.TIMEOUT:
                        setMessage(t('geo_timeout'))
                        break
                    default:
                        setMessage(t('geo_unknown'))
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
        setMessage(tokenId ? t('checking') : t('checking'))

        try {
            const res = await fetch("/api/quests/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locationId, lat, lng, tokenId })
            })

            const data = await res.json()

            if (!res.ok) {
                setStatus("error")
                setMessage(data.error || tCommon('error'))
                if (data.requireNft) setRequireNft(true)
                return
            }

            if (data.selectionRequired) {
                setEligibleNfts(data.eligibleNfts)
                setStatus("selection")
                return
            }

            setStatus("success")
            let successMsg = t('success')
            if (data.isLevelUp) successMsg += `\n${t('level_up')}`
            if (data.isComplete) successMsg += `\n${t('complete')}`
            if (data.rewardMinted) successMsg += `\n${t('reward')}`
            setMessage(successMsg)
            if (tokenId) setCheckedInTokenId(tokenId)
        } catch (error) {
            setStatus("error")
            setMessage(tCommon('error'))
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
                {status === "success" ? tCommon('success') : status === "error" ? tCommon('error') : "Quest Check-in"}
            </h1>

            {status === "idle" && (
                <>
                    <p className="text-gray-600">
                        {t('desc')}
                    </p>
                    <Button onClick={handleCheckIn} size="lg" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg mt-4">
                        {t('submit')}
                    </Button>
                </>
            )}

            {(status === "locating" || status === "checking") && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-gray-600 font-medium">{message}</p>
                </div>
            )}

            {status === "selection" && (
                <div className="space-y-4">
                    <p className="text-gray-600">
                        チェックインに使用するNFTを選択してください。
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                        {eligibleNfts.map((nft) => (
                            <button
                                key={nft.tokenId}
                                onClick={() => gps && submitCheckIn(gps.lat, gps.lng, nft.tokenId)}
                                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{nft.name}</p>
                                    <p className="text-xs text-gray-500">ID: {nft.tokenId}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {status === "success" && (
                <div className="space-y-6">
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <p className="text-gray-700 font-medium whitespace-pre-wrap">{message}</p>
                    <Button onClick={() => router.push("/mypage")} variant="outline" className="w-full h-12 rounded-xl">
                        マイページに戻る
                    </Button>
                </div>
            )}

            {status === "error" && (
                <div className="space-y-6">
                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-12 h-12 text-red-600" />
                    </div>
                    <p className="text-red-600 font-medium">{message}</p>
                    <div className="flex flex-col gap-2">
                        <Button onClick={handleCheckIn} className="w-full h-12 rounded-xl bg-gray-900">
                            再試行
                        </Button>
                        <Button onClick={() => router.push("/")} variant="ghost" className="w-full h-12 rounded-xl">
                            トップに戻る
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function QuestScanPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <QuestScanInner />
            </Suspense>
        </main>
    )
}
