"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { format, formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { Bell, ExternalLink, Gift, CheckCircle2, Tag, ArrowDownToLine } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { Skeleton } from "@/components/ui/skeleton"

type Notification = {
    id: string
    title: string
    content: string
    type: string
    link_url: string | null
    created_at: string
}

const TYPE_ICON: Record<string, { icon: any; bg: string; color: string }> = {
    survey: { icon: Tag, bg: "bg-amber-500/10", color: "text-amber-500" },
    mint: { icon: Gift, bg: "bg-primary/10", color: "text-primary" },
    use: { icon: CheckCircle2, bg: "bg-emerald-500/10", color: "text-emerald-500" },
    received: { icon: ArrowDownToLine, bg: "bg-indigo-500/10", color: "text-indigo-500" },
    default: { icon: Bell, bg: "bg-primary/10", color: "text-primary" },
}

function getRelativeTime(dateStr: string) {
    try {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ja })
    } catch {
        return format(new Date(dateStr), "yyyy/MM/dd")
    }
}

export default function NotificationsPage() {
    const router = useRouter()
    const { data: session, isLoading: sessionLoading } = useSWR("/api/session", (url: string) =>
        fetch(url).then(res => res.json())
    )
    const { data: notifications, isLoading: notificationsLoading } = useSWR<Notification[]>(
        "/api/notifications",
        (url: string) => fetch(url).then(res => res.json())
    )

    useEffect(() => {
        if (!sessionLoading && session && !session.authenticated) router.push("/")
    }, [session, sessionLoading, router])

    if (sessionLoading || !session?.authenticated) {
        return (
            <div className="min-h-screen bg-slate-50">
                <AppHeader title="お知らせ" showBack />
                <div className="max-w-lg mx-auto px-4 py-6 flex justify-center">
                    <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            </div>
        )
    }

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recent = (notifications ?? []).filter(n => new Date(n.created_at) >= oneDayAgo)
    const earlier = (notifications ?? []).filter(n => new Date(n.created_at) < oneDayAgo)

    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <AppHeader title="お知らせ" showBack onBack={() => router.push("/mypage")} />

            <main className="max-w-lg mx-auto px-4 py-6">
                {notificationsLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                    </div>
                ) : !notifications || notifications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                            <Bell className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">現在お知らせはありません</p>
                    </div>
                ) : (
                    <>
                        {recent.length > 0 && (
                            <section className="mb-8">
                                <h3 className="text-slate-700 text-sm font-bold mb-3">最近のアクティビティ</h3>
                                <div className="space-y-3">
                                    {recent.map(n => <NotificationItem key={n.id} n={n} isNew />)}
                                </div>
                            </section>
                        )}

                        {earlier.length > 0 && (
                            <section>
                                <h3 className="text-slate-700 text-sm font-bold mb-3">以前の通知</h3>
                                <div className="space-y-3">
                                    {earlier.map(n => <NotificationItem key={n.id} n={n} />)}
                                </div>
                            </section>
                        )}

                        {recent.length === 0 && earlier.length > 0 && notifications.length > 0 && (
                            <div className="pt-4 text-center">
                                <p className="text-xs text-slate-300 font-medium">以上です</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    )
}

function NotificationItem({ n, isNew = false }: { n: Notification; isNew?: boolean }) {
    const { icon: Icon, bg, color } = TYPE_ICON[n.type] ?? TYPE_ICON.default

    const content = (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 shadow-sm relative">
            <div className={`size-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-800 leading-snug">{n.title}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap flex-shrink-0">
                        {getRelativeTime(n.created_at)}
                    </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{n.content}</p>
                {n.link_url && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                        詳細を見る <ExternalLink className="w-3 h-3" />
                    </span>
                )}
            </div>
            {/* Unread dot */}
            {isNew && (
                <span className="absolute top-4 right-4 size-2 rounded-full bg-primary" />
            )}
        </div>
    )

    if (n.link_url) {
        return (
            <Link href={n.link_url} className="block hover:opacity-90 transition-opacity">
                {content}
            </Link>
        )
    }
    return content
}
