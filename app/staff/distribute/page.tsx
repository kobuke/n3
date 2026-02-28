"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Label } from "@/components/admin/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/admin/ui/select"
import { Loader2, Send } from "lucide-react"

export default function DistributePage() {
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [emails, setEmails] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [results, setResults] = useState<{ email: string; status: string; message: string }[] | null>(null)

    useEffect(() => {
        fetch("/api/templates")
            .then(res => res.json())
            .then(data => {
                setTemplates(Array.isArray(data) ? data : [])
            })
            .catch(err => console.error("Failed to fetch templates:", err))
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedTemplate || !emails.trim()) return

        setIsSubmitting(true)
        setResults(null)

        // Split emails by comma, space, or newline
        const emailArray = emails.split(/[\s,]+/).filter(e => e.trim().length > 0)

        try {
            const res = await fetch("/api/admin/distribute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId: selectedTemplate,
                    emails: emailArray
                })
            })

            const data = await res.json()
            if (res.ok) {
                setResults(data.results)
                if (data.results.some((r: any) => r.status === "success")) {
                    setEmails("") // clear form if at least one succeeded
                }
            } else {
                alert(`Error: ${data.error}`)
            }
        } catch (error) {
            console.error(error)
            alert("Failed to execute Airdrop.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col">
            <PageHeader
                title="手動配布 (Airdrop)"
                description="特定のユーザー（既存顧客）へ手動でNFTをミントして送信します。"
            />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="size-5" /> 送信フォーム
                        </CardTitle>
                        <CardDescription>
                            テンプレートを選択し、送信先のメールアドレスを入力してください。※メールアドレスは事前にシステムに登録（ウォレット作成済み）である必要があります。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <Label>配布するNFTテンプレート</Label>
                                <Select value={selectedTemplate} onValueChange={setSelectedTemplate} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="テンプレートを選択..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name} (Type: {t.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>対象ユーザーのメールアドレス</Label>
                                <Textarea
                                    value={emails}
                                    onChange={e => setEmails(e.target.value)}
                                    placeholder="user1@example.com&#10;user2@example.com"
                                    rows={6}
                                    required
                                />
                                <span className="text-xs text-muted-foreground">改行、スペース、またはカンマ区切りで複数指定できます。</span>
                            </div>

                            <Button type="submit" disabled={isSubmitting || !selectedTemplate || !emails.trim()} className="w-full sm:w-auto self-start">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin mr-2" /> 実行中...
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4 mr-2" /> 実行する
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {results && (
                    <Card>
                        <CardHeader>
                            <CardTitle>実行結果</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                {results.map((r, i) => (
                                    <div key={i} className={`p-3 border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${r.status === 'success' ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                                        <span className="font-medium text-sm">{r.email}</span>
                                        <span className={`text-xs ${r.status === 'success' ? 'text-success' : 'text-destructive'}`}>
                                            {r.message}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    )
}
