"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/admin/ui/table"
import { Plus, Trash2, Edit, CheckCircle, XCircle, Copy } from "lucide-react"
import { toast } from "sonner"

export type Survey = {
    id: string
    title: string
    description: string
    questions: any[]
    nft_template_ids: string[]
    is_active: boolean
    created_at: string
}

export function SurveyList() {
    const [surveys, setSurveys] = useState<Survey[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchSurveys()
    }, [])

    async function fetchSurveys() {
        try {
            const res = await fetch('/api/surveys')
            const data = await res.json()
            setSurveys(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("本当に削除しますか？")) return
        try {
            await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
            fetchSurveys()
        } catch (e) {
            console.error(e)
        }
    }

    function handleCopyUrl(id: string) {
        const url = `${window.location.origin}/surveys/${id}`
        navigator.clipboard.writeText(url)
        toast.success("アンケートのURLをコピーしました")
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>アンケート一覧</CardTitle>
                    <CardDescription>アンケートを作成・管理します</CardDescription>
                </div>
                <Button onClick={() => router.push('/staff/surveys/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    新規作成
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">Loading...</div>
                ) : surveys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">アンケートがありません</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>状態</TableHead>
                                <TableHead>タイトル</TableHead>
                                <TableHead>設問数</TableHead>
                                <TableHead>報酬NFT数</TableHead>
                                <TableHead>作成日</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {surveys.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        {s.is_active ? (
                                            <span className="flex items-center text-green-600 text-sm"><CheckCircle className="w-4 h-4 mr-1" /> 公開中</span>
                                        ) : (
                                            <span className="flex items-center text-gray-400 text-sm"><XCircle className="w-4 h-4 mr-1" /> 非公開</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{s.title}</TableCell>
                                    <TableCell>{s.questions?.length || 0}問</TableCell>
                                    <TableCell>{s.nft_template_ids?.length || 0}種</TableCell>
                                    <TableCell>{format(new Date(s.created_at), 'yyyy/MM/dd HH:mm')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleCopyUrl(s.id)} title="URLをコピー">
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => router.push(`/staff/surveys/${s.id}`)} title="編集">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-500" title="削除">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
