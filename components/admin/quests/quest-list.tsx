"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Trash2, Edit, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function QuestList() {
    const router = useRouter()
    const [quests, setQuests] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchQuests = async () => {
        try {
            const res = await fetch("/api/quests")
            const data = await res.json()
            setQuests(data)
        } catch (error) {
            console.error(error)
            toast.error("クエストの取得に失敗しました")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchQuests()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm("本当にこのクエストを削除しますか？")) return
        try {
            const res = await fetch(`/api/quests/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("削除失敗")
            toast.success("クエストを削除しました")
            fetchQuests()
        } catch (error) {
            toast.error("削除に失敗しました")
        }
    }

    if (isLoading) return <div>読み込み中...</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">クエスト一覧</h2>
                <Button onClick={() => router.push("/staff/quests/new")}>
                    新規作成
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ステータス</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead>ベースNFT</TableHead>
                        <TableHead>順番</TableHead>
                        <TableHead>作成日時</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {quests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                クエストがありません
                            </TableCell>
                        </TableRow>
                    ) : (
                        quests.map((q) => (
                            <TableRow key={q.id}>
                                <TableCell>
                                    <Badge variant={q.is_active ? "default" : "secondary"}>
                                        {q.is_active ? "公開中" : "非公開"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{q.title}</TableCell>
                                <TableCell>{q.nft_templates ? q.nft_templates.name : "未設定"}</TableCell>
                                <TableCell>{q.is_sequential ? "順序通り" : "順不同"}</TableCell>
                                <TableCell>{format(new Date(q.created_at), "yyyy/MM/dd HH:mm")}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => router.push(`/staff/quests/${q.id}/locations`)}>
                                        <MapPin className="w-4 h-4 mr-1" />
                                        地点管理
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => router.push(`/staff/quests/${q.id}`)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(q.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
