"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, AlertCircle } from "lucide-react"

type Question = {
    id: string
    type: 'text' | 'radio' | 'checkbox'
    text: string
    options: string[]
}

type Survey = {
    id: string
    title: string
    description: string
    questions: Question[]
    is_active: boolean
}

export function SurveyAnswerForm({ surveyId }: { surveyId: string }) {
    const router = useRouter()
    const { data: survey, error, isLoading } = useSWR<Survey>(`/api/surveys/${surveyId}`, (url: string) => fetch(url).then(res => res.json()))

    const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
    const [submitting, setSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [submitError, setSubmitError] = useState("")

    if (isLoading) {
        return (
            <div className="max-w-xl mx-auto text-center py-20 text-muted-foreground bg-white rounded-2xl shadow-sm border">
                読み込み中...
            </div>
        )
    }

    if (error || !survey) {
        return (
            <div className="max-w-xl mx-auto text-center py-20 text-red-500 bg-white rounded-2xl shadow-sm border">
                アンケートが見つかりませんでした。
            </div>
        )
    }

    if (!survey.is_active) {
        return (
            <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-2xl shadow-sm border">
                このアンケートは現在回答を受け付けていません。
            </div>
        )
    }

    if (isSuccess) {
        return (
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border p-12 text-center space-y-4">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold leading-tight">ご回答ありがとうございました！</h2>
                <p className="text-muted-foreground leading-relaxed">
                    アンケートの送信が完了しました。報酬が設定されている場合、あなたのウォレットにNFTが配布されます。
                </p>
                <div className="pt-8">
                    <Button onClick={() => router.push('/mypage')} className="w-full h-14 rounded-xl font-bold text-lg shadow-md border border-black/10">
                        マイページに戻る
                    </Button>
                </div>
            </div>
        )
    }

    function handleRadioChange(qId: string, val: string) {
        setAnswers(prev => ({ ...prev, [qId]: val }))
    }

    function handleCheckboxChange(qId: string, val: string, checked: boolean) {
        setAnswers(prev => {
            const current = (prev[qId] as string[]) || []
            if (checked) {
                return { ...prev, [qId]: [...current, val] }
            } else {
                return { ...prev, [qId]: current.filter(item => item !== val) }
            }
        })
    }

    function handleTextChange(qId: string, val: string) {
        setAnswers(prev => ({ ...prev, [qId]: val }))
    }

    async function handleSubmit() {
        setSubmitting(true)
        setSubmitError("")

        try {
            const res = await fetch(`/api/surveys/${surveyId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers })
            })

            const data = await res.json()

            if (res.ok) {
                setIsSuccess(true)
            } else {
                setSubmitError(data.error || "送信に失敗しました。")
            }
        } catch (e) {
            console.error(e)
            setSubmitError("サーバーエラーが発生しました。時間を置いて再度お試しください。")
        } finally {
            setSubmitting(false)
        }
    }

    const isAllAnswered = survey.questions.every(q => {
        const ans = answers[q.id]
        if (q.type === 'text' || q.type === 'radio') return !!ans && ans !== ""
        if (q.type === 'checkbox') return Array.isArray(ans) && ans.length > 0
        return false
    })

    return (
        <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 pb-8">
            <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{survey.title}</h1>
                {survey.description && (
                    <p className="text-base text-muted-foreground mt-4 whitespace-pre-wrap leading-relaxed">
                        {survey.description}
                    </p>
                )}
            </div>

            <div className="space-y-6">
                {survey.questions.map((q, index) => (
                    <div key={q.id} className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 space-y-5">
                        <Label className="text-lg font-bold leading-snug block">
                            <span className="text-primary mr-2">Q{index + 1}.</span>
                            {q.text}
                            <span className="text-red-500 ml-1.5">*</span>
                        </Label>

                        {q.type === 'text' && (
                            <Textarea
                                placeholder="回答を入力してください"
                                value={(answers[q.id] as string) || ""}
                                onChange={(e) => handleTextChange(q.id, e.target.value)}
                                className="min-h-[140px] text-base p-4 rounded-xl resize-none"
                            />
                        )}

                        {q.type === 'radio' && (
                            <RadioGroup
                                value={(answers[q.id] as string) || ""}
                                onValueChange={(val) => handleRadioChange(q.id, val)}
                                className="space-y-3"
                            >
                                {q.options.map((opt, i) => (
                                    <Label
                                        key={i}
                                        htmlFor={`${q.id}-${i}`}
                                        className={`flex items-center space-x-3.5 p-4.5 border-2 rounded-xl cursor-pointer transition-all ${answers[q.id] === opt
                                            ? 'border-primary bg-primary/5'
                                            : 'border-transparent bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
                                            }`}
                                    >
                                        <RadioGroupItem value={opt} id={`${q.id}-${i}`} className="w-5 h-5 flex-shrink-0" />
                                        <span className="font-medium text-base leading-tight flex-1">{opt}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}

                        {q.type === 'checkbox' && (
                            <div className="space-y-3">
                                {q.options.map((opt, i) => {
                                    const isChecked = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)
                                    return (
                                        <Label
                                            key={i}
                                            htmlFor={`${q.id}-${i}`}
                                            className={`flex items-center space-x-3.5 p-4.5 border-2 rounded-xl cursor-pointer transition-all ${isChecked
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
                                                }`}
                                        >
                                            <Checkbox
                                                id={`${q.id}-${i}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) => handleCheckboxChange(q.id, opt, checked as boolean)}
                                                className="w-5 h-5 rounded-[4px] flex-shrink-0"
                                            />
                                            <span className="font-medium text-base leading-tight flex-1">{opt}</span>
                                        </Label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {submitError && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {submitError}
                </div>
            )}

            <div className="pt-6 pb-20">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || !isAllAnswered}
                    className="w-full h-[60px] text-lg font-bold rounded-xl shadow-md border border-black/10 active:scale-[0.98] transition-all"
                >
                    {submitting ? "送信中..." : "回答を送信する"}
                </Button>

                {!isAllAnswered && (
                    <p className="text-center text-sm font-medium text-red-500 mt-4">
                        すべての必須項目に回答してください
                    </p>
                )}
            </div>
        </div>
    )
}
