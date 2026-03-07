"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/admin/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/admin/ui/table"
import { Plus, Trash2, Edit } from "lucide-react"

type Notification = {
    id: string
    title: string
    content: string
    type: string
    link_url: string | null
    created_at: string
}

export function NotificationList() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [type, setType] = useState("info")
    const [linkUrl, setLinkUrl] = useState("")

    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        fetchNotifications()
    }, [])

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications')
            const data = await res.json()
            setNotifications(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    function openCreateDialog() {
        setEditingId(null)
        setTitle("")
        setContent("")
        setType("info")
        setLinkUrl("")
        setIsDialogOpen(true)
    }

    function openEditDialog(n: Notification) {
        setEditingId(n.id)
        setTitle(n.title)
        setContent(n.content)
        setType(n.type)
        setLinkUrl(n.link_url || "")
        setIsDialogOpen(true)
    }

    async function handleSave() {
        if (!title || !content) return
        setIsSubmitting(true)

        try {
            const url = editingId ? `/api/notifications/${editingId}` : '/api/notifications'
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, type, link_url: linkUrl || null })
            })

            if (res.ok) {
                setIsDialogOpen(false)
                fetchNotifications()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("本当に削除しますか？")) return
        try {
            await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
            fetchNotifications()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>お知らせ一覧</CardTitle>
                    <CardDescription>ユーザーに表示されるお知らせを管理します</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog}>
                            <Plus className="w-4 h-4 mr-2" />
                            新規作成
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? "お知らせを編集" : "お知らせを作成"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>タイトル</Label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="アンケートにご協力ください" />
                            </div>
                            <div className="space-y-2">
                                <Label>内容</Label>
                                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="本文を入力..." rows={4} />
                            </div>
                            <div className="space-y-2">
                                <Label>種類 (Type)</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">情報 (Info)</SelectItem>
                                        <SelectItem value="survey">アンケート (Survey)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>リンクURL (任意)</Label>
                                <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="/surveys/1234..." />
                                <p className="text-xs text-muted-foreground">アンケートページに飛ばす場合は /surveys/[アンケートID] のように指定します</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleSave} disabled={isSubmitting || !title || !content}>
                                {isSubmitting ? "保存中..." : "保存する"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">お知らせがありません</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>種別</TableHead>
                                <TableHead>タイトル</TableHead>
                                <TableHead>リンク</TableHead>
                                <TableHead>作成日</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notifications.map(n => (
                                <TableRow key={n.id}>
                                    <TableCell>
                                        {n.type === 'survey' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                アンケート
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                情報
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{n.title}</TableCell>
                                    <TableCell className="text-muted-foreground">{n.link_url || "-"}</TableCell>
                                    <TableCell>{format(new Date(n.created_at), 'yyyy/MM/dd HH:mm')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(n)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} className="text-red-500">
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
