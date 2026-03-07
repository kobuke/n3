"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Checkbox } from "@/components/admin/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu"
import { Plus, Trash2, SwitchCamera, GripVertical } from "lucide-react"

type Question = {
    id: string
    type: 'text' | 'radio' | 'checkbox'
    text: string
    options: string[]
}

type Template = {
    id: string
    name: string
}

export function SurveyForm({ surveyId }: { surveyId?: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [templates, setTemplates] = useState<Template[]>([])

    // Form State
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [isActive, setIsActive] = useState(false)
    const [maxAnswers, setMaxAnswers] = useState<number>(1)
    const [nftTemplateIds, setNftTemplateIds] = useState<string[]>([])
    const [questions, setQuestions] = useState<Question[]>([])

    useEffect(() => {
        async function loadData() {
            try {
                const tRes = await fetch('/api/templates')
                const tData = await tRes.json()
                setTemplates(tData)

                if (surveyId) {
                    const sRes = await fetch(`/api/surveys/${surveyId}`)
                    const sData = await sRes.json()
                    setTitle(sData.title || "")
                    setDescription(sData.description || "")
                    setIsActive(sData.is_active || false)
                    setMaxAnswers(sData.max_answers_per_user ?? 1)
                    setNftTemplateIds(sData.nft_template_ids || [])
                    setQuestions(sData.questions || [])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [surveyId])

    function handleTemplateToggle(id: string) {
        setNftTemplateIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        )
    }

    function addQuestion() {
        const newQ: Question = {
            id: crypto.randomUUID(),
            type: 'text',
            text: '',
            options: []
        }
        setQuestions(prev => [...prev, newQ])
    }

    function updateQuestion(index: number, field: keyof Question, value: any) {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    function removeQuestion(index: number) {
        if (!confirm("本当に削除しますか？")) return
        setQuestions(prev => prev.filter((_, i) => i !== index))
    }

    async function handleSave() {
        if (!title) return alert("タイトルを入力してください")
        setSaving(true)

        try {
            const url = surveyId ? `/api/surveys/${surveyId}` : '/api/surveys'
            const method = surveyId ? 'PUT' : 'POST'

            const body = {
                title,
                description,
                is_active: isActive,
                max_answers_per_user: maxAnswers,
                nft_template_ids: nftTemplateIds,
                questions
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                router.push('/staff/surveys')
                router.refresh()
            } else {
                const error = await res.json()
                alert('保存に失敗しました: ' + error.error)
            }
        } catch (e) {
            console.error(e)
            alert("エラーが発生しました")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>

    return (
        <Card>
            <CardHeader>
                <CardTitle>アンケート基本設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>アンケートタイトル</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: イベント参加後アンケート" />
                </div>

                <div className="space-y-2">
                    <Label>説明文</Label>
                    <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="アンケートの目的や回答にかかる時間などを記載します..."
                        rows={4}
                    />
                </div>

                <div className="space-y-2">
                    <Label>配布するNFT</Label>
                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[300px] justify-between">
                                    {nftTemplateIds.length > 0
                                        ? `${nftTemplateIds.length}個のNFTを選択中`
                                        : "NFTテンプレートを選択"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px]">
                                {templates.map(t => (
                                    <DropdownMenuCheckboxItem
                                        key={t.id}
                                        checked={nftTemplateIds.includes(t.id)}
                                        onCheckedChange={() => handleTemplateToggle(t.id)}
                                    >
                                        {t.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <p className="text-xs text-muted-foreground mt-2">
                            アンケート回答完了時に自動でこのNFTがミントされます
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="is_active"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(checked as boolean)}
                    />
                    <Label htmlFor="is_active">このアンケートを公開する (回答可能にする)</Label>
                </div>

                <div className="space-y-2 mt-4 max-w-sm">
                    <Label>ユーザー一人あたりの回答上限回数</Label>
                    <div className="flex items-center space-x-2">
                        <Input
                            type="number"
                            min={0}
                            value={maxAnswers}
                            onChange={e => setMaxAnswers(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-sm text-muted-foreground w-32">回 (0で無制限)</span>
                    </div>
                </div>

                <hr className="my-8" />

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">設問設定</h3>
                        <Button variant="outline" size="sm" onClick={addQuestion}>
                            <Plus className="w-4 h-4 mr-2" />
                            設問を追加
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {questions.length === 0 ? (
                            <p className="text-sm text-center py-8 text-muted-foreground border rounded-lg bg-gray-50/50">
                                設問がありません。「設問を追加」ボタンから作成してください。
                            </p>
                        ) : (
                            questions.map((q, i) => (
                                <Card key={q.id}>
                                    <CardContent className="p-4 flex gap-4">
                                        <div className="pt-2 text-muted-foreground cursor-move">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <Label>質問文</Label>
                                                    <Input
                                                        value={q.text}
                                                        onChange={e => updateQuestion(i, 'text', e.target.value)}
                                                        placeholder="質問を入力してください"
                                                    />
                                                </div>
                                                <div className="w-[200px] space-y-2">
                                                    <Label>回答形式</Label>
                                                    <Select value={q.type} onValueChange={(val) => updateQuestion(i, 'type', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="text">テキスト入力</SelectItem>
                                                            <SelectItem value="radio">単一選択 (ラジオボタン)</SelectItem>
                                                            <SelectItem value="checkbox">複数選択 (チェックボックス)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {(q.type === 'radio' || q.type === 'checkbox') && (
                                                <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                                                    <Label>選択肢 (カンマ区切りで入力)</Label>
                                                    <Input
                                                        value={q.options.join(',')}
                                                        onChange={e => updateQuestion(i, 'options', e.target.value.split(','))}
                                                        placeholder="選択肢A,選択肢B,選択肢C"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-8 pl-4">
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeQuestion(i)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <Button onClick={handleSave} disabled={saving || !title}>
                        {saving ? "保存中..." : "設定を保存する"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
