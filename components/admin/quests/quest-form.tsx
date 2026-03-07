"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function QuestForm({ questId }: { questId?: string }) {
    const router = useRouter()
    const isEdit = !!questId

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [baseNft, setBaseNft] = useState("")
    const [rewardNft, setRewardNft] = useState("none")
    const [isSequential, setIsSequential] = useState(false)
    const [isActive, setIsActive] = useState(false)

    // Metadata fields
    const [metaName, setMetaName] = useState("")
    const [metaDesc, setMetaDesc] = useState("")
    const [metaImage, setMetaImage] = useState("")
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        const loadInitial = async () => {
            try {
                // Fetch NFT templates for dropdowns
                const tRes = await fetch("/api/templates")
                const tData = await tRes.json()
                setTemplates(tData)

                if (isEdit) {
                    const qRes = await fetch(`/api/quests/${questId}`)
                    const qData = await qRes.json()
                    setTitle(qData.title || "")
                    setDescription(qData.description || "")
                    setBaseNft(qData.base_nft_template_id || "")
                    setRewardNft(qData.reward_nft_template_id || "none")
                    setIsSequential(qData.is_sequential || false)
                    setIsActive(qData.is_active || false)

                    try {
                        if (qData.clear_metadata_uri) {
                            const parsed = JSON.parse(qData.clear_metadata_uri)
                            setMetaName(parsed.name || "")
                            setMetaDesc(parsed.description || "")
                            setMetaImage(parsed.image || "")
                        }
                    } catch (e) {
                        // Fallback
                        setMetaImage(qData.clear_metadata_uri || "")
                    }
                }
            } catch (error) {
                toast.error("データの読み込みに失敗しました")
            } finally {
                setIsLoading(false)
            }
        }
        loadInitial()
    }, [questId, isEdit])

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("タイトルを入力してください")
            return
        }
        if (!baseNft) {
            toast.error("ベースとなるNFT（参加証）を選択してください")
            return
        }

        setIsSaving(true)
        try {
            let clear_metadata_uri = null
            if (metaName || metaDesc || metaImage) {
                clear_metadata_uri = JSON.stringify({
                    name: metaName,
                    description: metaDesc,
                    image: metaImage
                })
            }

            const body = {
                title,
                description,
                base_nft_template_id: baseNft,
                reward_nft_template_id: rewardNft === "none" ? null : rewardNft,
                clear_metadata_uri,
                is_sequential: isSequential,
                is_active: isActive
            }

            const url = isEdit ? `/api/quests/${questId}` : "/api/quests"
            const method = isEdit ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error("保存失敗")

            toast.success("クエストを保存しました")
            router.push("/staff/quests")
        } catch (error) {
            toast.error("保存に失敗しました")
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            if (!res.ok) throw new Error()
            const data = await res.json()
            setMetaImage(data.url)
        } catch (error) {
            toast.error("画像のアップロードに失敗しました")
        } finally {
            setIsUploading(false)
        }
    }

    if (isLoading) return <div>読み込み中...</div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h2 className="text-2xl font-bold">{isEdit ? "クエスト編集" : "クエスト新規作成"}</h2>

            <div className="bg-white p-6 rounded-lg border space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">クエストタイトル *</Label>
                    <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="例：渋谷エリアスタンプラリー" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">概要・説明テキスト</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="space-y-2">
                    <Label>ベースとなるNFT (参加証) *必須</Label>
                    <p className="text-sm text-muted-foreground mb-2">ユーザーがこのNFTを持っていないと、スタンプラリーを開始（スキャン）できません。</p>
                    <Select value={baseNft} onValueChange={setBaseNft}>
                        <SelectTrigger><SelectValue placeholder="ベースNFTを選択してください" /></SelectTrigger>
                        <SelectContent>
                            {templates.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <hr className="my-4" />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">クリア条件と報酬</h3>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="is_sequential" checked={isSequential} onCheckedChange={c => setIsSequential(c as boolean)} />
                        <Label htmlFor="is_sequential">決められた順番通りに回る必要がある</Label>
                    </div>

                    <div className="space-y-2 mt-4">
                        <Label>追加のクリア報酬NFT</Label>
                        <p className="text-sm text-muted-foreground mb-2">全地点をクリアした際に追加で付与（ミント）されるNFT。不要な場合は「指定なし」。</p>
                        <Select value={rewardNft} onValueChange={setRewardNft}>
                            <SelectTrigger><SelectValue placeholder="報酬NFTを選択" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">指定なし</SelectItem>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4 mt-8 bg-muted p-4 rounded-md">
                        <div>
                            <Label className="text-base">コンプリート時：進化後NFTデータ (オプション)</Label>
                            <p className="text-sm text-foreground my-1 leading-relaxed">
                                クエスト完了時に、所持しているNFTの画像等を最終コンプリート形態に進化させたい場合に設定します。<br />
                                画像とテキストを登録するだけで、システムが自動的にNFTのデータを書き換えます。<br />
                                <span className="text-muted-foreground text-xs mt-1 block">
                                    ※ クエスト完了時だけでなく、**「特定地点に到着するたび」にNFTを変化させたい場合**は、クエスト作成後の「地点管理」画面から各地点ごとに同じように設定することができます。
                                </span>
                            </p>
                        </div>

                        <div className="space-y-2 mt-4">
                            <Label>進化後の名前</Label>
                            <Input value={metaName} onChange={e => setMetaName(e.target.value)} placeholder="例: クエスト完全制覇の証" />
                        </div>

                        <div className="space-y-2">
                            <Label>進化後の説明</Label>
                            <Textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2} placeholder="例: 全ての地点をコンプリートした伝説のNFTです。" />
                        </div>

                        <div className="space-y-2">
                            <Label>進化後の画像</Label>
                            <div className="flex items-center gap-4">
                                <Input type="file" onChange={handleImageUpload} disabled={isUploading} className="max-w-[250px]" accept="image/*" />
                                {isUploading && <span className="text-xs text-blue-500">アップロード中...</span>}
                            </div>
                            {metaImage && (
                                <div className="mt-2 text-xs text-muted-foreground flex flex-col gap-2">
                                    <a href={metaImage} target="_blank" rel="noreferrer" className="text-blue-500 underline break-all">
                                        {metaImage}
                                    </a>
                                    <img src={metaImage} alt="Preview" className="w-24 h-24 object-cover border rounded-md" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <hr className="my-4" />

                <div className="flex items-center space-x-2">
                    <Checkbox id="is_active" checked={isActive} onCheckedChange={c => setIsActive(c as boolean)} />
                    <Label htmlFor="is_active">このクエストを公開する</Label>
                </div>
            </div>

            <div className="flex space-x-4">
                <Button variant="outline" onClick={() => router.push("/staff/quests")}>キャンセル</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "保存中..." : "保存する"}
                </Button>
            </div>
        </div>
    )
}
