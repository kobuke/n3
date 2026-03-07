"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { format } from "date-fns"
import { Bell, ChevronLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Notification = {
    id: string
    title: string
    content: string
    type: string
    link_url: string | null
    created_at: string
}

export default function NotificationsPage() {
    const router = useRouter()

    // 1. Session Check
    const { data: session, isLoading: sessionLoading } = useSWR('/api/session', (url: string) => fetch(url).then(res => res.json()))

    // 2. Fetch Notifications
    const { data: notifications, isLoading: notificationsLoading } = useSWR<Notification[]>('/api/notifications', (url: string) => fetch(url).then(res => res.json()))

    useEffect(() => {
        if (!sessionLoading && session && !session.authenticated) {
            router.push("/")
        }
    }, [session, sessionLoading, router])

    if (sessionLoading || !session?.authenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader />
                <main className="flex-1 flex justify-center items-center">
                    <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AppHeader email={session.email} walletAddress={session.walletAddress} />

            <main className="flex-1 container max-w-2xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center space-x-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/mypage')}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center space-x-2">
                        <Bell className="w-6 h-6 text-primary" />
                        <h1 className="text-xl font-bold tracking-tight">お知らせ</h1>
                    </div>
                </div>

                {notificationsLoading ? (
                    <div className="flex justify-center py-12">
                        <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : !notifications || notifications.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border">
                        <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p>現在お知らせはありません</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map(n => (
                            <Card key={n.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-0">
                                    {n.link_url ? (
                                        <Link href={n.link_url} className="block p-5 sm:p-6 w-full h-full">
                                            <NotificationContent notification={n} />
                                        </Link>
                                    ) : (
                                        <div className="p-5 sm:p-6">
                                            <NotificationContent notification={n} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}

function NotificationContent({ notification: n }: { notification: Notification }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                    {n.type === 'survey' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            アンケート
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            お知らせ
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {format(new Date(n.created_at), 'yyyy/MM/dd HH:mm')}
                    </span>
                </div>

                <h3 className="font-semibold text-base sm:text-lg flex items-center pr-4">
                    {n.title}
                    {n.link_url && <ExternalLink className="w-4 h-4 ml-2 text-muted-foreground inline-block flex-shrink-0" />}
                </h3>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {n.content}
                </p>

                {n.type === 'survey' && n.link_url && (
                    <div className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
                        アンケートに回答する
                    </div>
                )}
            </div>
        </div>
    )
}
