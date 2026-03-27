"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/admin/ui/table"
import { Download } from "lucide-react"

type Question = {
    id: string
    type: 'text' | 'radio' | 'checkbox'
    text: string
    options?: string[]
}

type Survey = {
    id: string
    title: string
    questions: Question[]
}

type Response = {
    id: string
    user_email: string
    user_wallet: string | null
    answers: Record<string, string | string[]>
    created_at: string
}

function getAnswerText(answer: string | string[] | undefined): string {
    if (answer === undefined || answer === null) return '—'
    if (Array.isArray(answer)) return answer.length > 0 ? answer.join(', ') : '—'
    return answer || '—'
}

function AggregationTab({ questions, responses }: { questions: Question[]; responses: Response[] }) {
    const aggregableQuestions = questions.filter(q => q.type === 'radio' || q.type === 'checkbox')

    if (aggregableQuestions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                集計可能な設問（選択式）がありません
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {aggregableQuestions.map(q => {
                const options = q.options || []
                const counts: Record<string, number> = {}
                options.forEach(opt => { counts[opt] = 0 })

                responses.forEach(r => {
                    const val = r.answers[q.id]
                    if (Array.isArray(val)) {
                        val.forEach(v => { if (v in counts) counts[v]++ })
                    } else if (val && typeof val === 'string') {
                        if (val in counts) counts[val]++
                    }
                })

                const total = responses.length || 1

                return (
                    <Card key={q.id}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{q.text}</CardTitle>
                            <CardDescription>{q.type === 'checkbox' ? '複数選択' : '単一選択'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {options.map(opt => {
                                    const count = counts[opt] || 0
                                    const pct = Math.round((count / total) * 100)
                                    return (
                                        <div key={opt} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>{opt}</span>
                                                <span className="text-muted-foreground">{count}件 ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

export function SurveyResponses({ surveyId }: { surveyId: string }) {
    const [survey, setSurvey] = useState<Survey | null>(null)
    const [responses, setResponses] = useState<Response[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/surveys/${surveyId}/responses`)
                if (!res.ok) throw new Error('取得に失敗しました')
                const data = await res.json()
                setSurvey(data.survey)
                setResponses(data.responses)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [surveyId])

    function handleExportCsv() {
        window.location.href = `/api/surveys/${surveyId}/responses?format=csv`
    }

    if (loading) {
        return <div className="flex justify-center py-12">Loading...</div>
    }

    if (error || !survey) {
        return <div className="text-center py-12 text-destructive">{error || 'データを取得できませんでした'}</div>
    }

    const questions = survey.questions || []

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                    {responses.length}件の回答
                </Badge>
                <Button variant="outline" size="sm" onClick={handleExportCsv}>
                    <Download className="w-4 h-4 mr-2" />
                    CSVエクスポート
                </Button>
            </div>

            <Tabs defaultValue="list">
                <TabsList>
                    <TabsTrigger value="list">回答一覧</TabsTrigger>
                    <TabsTrigger value="aggregate">集計</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <Card>
                        <CardContent className="p-0">
                            {responses.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">回答がまだありません</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="whitespace-nowrap">回答日時</TableHead>
                                                <TableHead className="whitespace-nowrap">メールアドレス</TableHead>
                                                {questions.map(q => (
                                                    <TableHead key={q.id} className="whitespace-nowrap min-w-[120px]">
                                                        {q.text}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {responses.map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                        {format(new Date(r.created_at), 'yyyy/MM/dd HH:mm')}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{r.user_email}</TableCell>
                                                    {questions.map(q => (
                                                        <TableCell key={q.id} className="text-sm max-w-[200px] truncate" title={getAnswerText(r.answers[q.id])}>
                                                            {getAnswerText(r.answers[q.id])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="aggregate">
                    <AggregationTab questions={questions} responses={responses} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
