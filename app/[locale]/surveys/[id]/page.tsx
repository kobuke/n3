"use client"

import { useEffect, use } from "react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { AppHeader } from "@/components/app-header"
import { SurveyAnswerForm } from "@/components/user/surveys/survey-answer-form"

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useTranslations('SurveyPage');
    const unwrappedParams = use(params)
    const router = useRouter()

    // 1. Session Check
    const { data: session, isLoading: sessionLoading } = useSWR('/api/session', (url: string) => fetch(url).then(res => res.json()))

    useEffect(() => {
        if (!sessionLoading && session && !session.authenticated) {
            router.push("/")
        }
    }, [session, sessionLoading, router])

    if (sessionLoading || !session?.authenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader showBack onBack={() => router.push("/mypage/notifications")} />
                <main className="flex-1 flex justify-center items-center">
                    <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AppHeader title={t('title')} showBack onBack={() => router.push("/mypage/notifications")} />
            <main className="flex-1 py-6 px-4 sm:px-6">
                <SurveyAnswerForm surveyId={unwrappedParams.id} />
            </main>
        </div>
    )
}
