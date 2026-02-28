"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Edit, Trash, Hexagon, Image as ImageIcon, UploadCloud, Loader2, AlertTriangle, QrCode, Package } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/admin/ui/dialog"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/admin/ui/select"
import { Switch } from "@/components/admin/ui/switch"

const TYPE_LABELS: Record<string, string> = {
    ticket: "チケット・特典",
    tour: "ツアーパス",
    resident_card: "デジタル住民証",
    artwork: "アート作品",
    certificate: "証明書",
}

export function TemplateList() {
    const [templates, setTemplates] = useState<any[]>([])
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Editing State
    const [editId, setEditId] = useState<string | null>(null)

    // Deleting State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [idToDelete, setIdToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [type, setType] = useState("ticket")
    const [imageUrl, setImageUrl] = useState("")
    const [isTransferable, setIsTransferable] = useState(true)
    const [maxSupply, setMaxSupply] = useState("")
    const [isInfinite, setIsInfinite] = useState(true)

    // QR State
    const [qrTemplate, setQrTemplate] = useState<any>(null)

    // Image Upload State
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    async function fetchTemplates() {
        setLoading(true)
        try {
            const res = await fetch("/api/templates")
            const data = await res.json()
            setTemplates(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        fetchTemplates()
    }, [])

    if (!mounted) return null

    function resetForm() {
        setEditId(null)
        setName("")
        setDescription("")
        setImageUrl("")
        setType("ticket")
        setIsTransferable(true)
        setMaxSupply("")
        setIsInfinite(true)
    }

    function handleEdit(t: any, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setEditId(t.id)
        setName(t.name)
        setDescription(t.description || "")
        setImageUrl(t.image_url || "")
        setType(t.type)
        setIsTransferable(t.is_transferable)
        setMaxSupply(t.max_supply ? t.max_supply.toString() : "")
        setIsInfinite(t.max_supply === null)
        setIsDialogOpen(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const res = await fetch("/api/nfts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editId,
                    name,
                    description,
                    image_url: imageUrl,
                    type,
                    is_transferable: isTransferable,
                    contract_address: process.env.NEXT_PUBLIC_COLLECTION_ID || "",
                    max_supply: isInfinite ? null : maxSupply
                })
            })

            if (res.ok) {
                setIsDialogOpen(false)
                fetchTemplates()
                resetForm()
            } else {
                const error = await res.json()
                alert(`エラー: ${error.error}`)
            }
        } catch (error) {
            console.error(error)
            alert("テンプレートの保存に失敗しました")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleFileUpload(file: File) {
        if (!file) return
        setIsUploading(true)

        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (res.ok) {
                const data = await res.json()
                setImageUrl(data.url)
            } else {
                const error = await res.json()
                alert(`アップロード失敗: ${error.error}`)
            }
        } catch (e) {
            console.error(e)
            alert("アップロードに失敗しました")
        } finally {
            setIsUploading(false)
        }
    }

    function onDragOver(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(true)
    }

    function onDragLeave(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0])
            e.dataTransfer.clearData()
        }
    }

    function confirmDelete(id: string, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIdToDelete(id)
        setIsDeleteDialogOpen(true)
    }

    async function handleConfirmDelete() {
        if (!idToDelete) return
        setIsDeleting(true)

        try {
            const res = await fetch(`/api/templates/${idToDelete}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setIsDeleteDialogOpen(false)
                fetchTemplates()
            } else {
                const error = await res.json()
                alert(`エラー: ${error.error}`)
            }
        } catch (error) {
            console.error(error)
            alert("テンプレートの削除に失敗しました")
        } finally {
            setIsDeleting(false)
            setIdToDelete(null)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">テンプレート一覧</h2>
                    <p className="text-sm text-muted-foreground">NFTの配布・販売用テンプレートを管理します。</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open) resetForm()
                    setIsDialogOpen(open)
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2" onClick={() => resetForm()}>
                            <Plus className="size-4" /> 新規作成
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editId ? "テンプレートを編集" : "テンプレートを作成"}</DialogTitle>
                            <DialogDescription>
                                ユーザーに配布するNFTのメタデータを設定します。
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="name">テンプレート名 <span className="text-destructive">*</span></Label>
                                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="例: 来場記念NFT" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="type">種別</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ticket">チケット・特典</SelectItem>
                                                <SelectItem value="tour">ツアーパス</SelectItem>
                                                <SelectItem value="resident_card">デジタル住民証</SelectItem>
                                                <SelectItem value="artwork">アート作品</SelectItem>
                                                <SelectItem value="certificate">証明書</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="description">説明文</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="例: 南城市来場者限定の特別NFTです"
                                            rows={4}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 border-t pt-4">
                                        <Label>在庫数（最大発行可能数）</Label>
                                        <div className="flex items-center space-x-2 border rounded-md p-3">
                                            <Switch id="infinite_supply" checked={isInfinite} onCheckedChange={(val) => {
                                                setIsInfinite(val);
                                                if (val) setMaxSupply("");
                                            }} />
                                            <Label htmlFor="infinite_supply" className="font-normal cursor-pointer text-sm">
                                                無制限に発行する
                                            </Label>
                                        </div>
                                        {!isInfinite && (
                                            <div className="mt-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="例: 100"
                                                    value={maxSupply}
                                                    onChange={e => setMaxSupply(e.target.value)}
                                                    required={!isInfinite}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label>画像</Label>
                                        <div
                                            className={`relative flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed rounded-lg transition-colors overflow-hidden
                                                ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'}
                                                ${imageUrl ? 'border-none p-0' : 'p-6 cursor-pointer'}
                                            `}
                                            onDragOver={onDragOver}
                                            onDragLeave={onDragLeave}
                                            onDrop={onDrop}
                                            onClick={() => !imageUrl && fileInputRef.current?.click()}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileUpload(e.target.files[0])
                                                    }
                                                }}
                                            />
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="size-6 animate-spin" />
                                                    <span className="text-sm">アップロード中...</span>
                                                </div>
                                            ) : imageUrl ? (
                                                <div className="relative w-full h-full group/preview">
                                                    <img src={imageUrl} alt="プレビュー" className="w-full h-48 object-cover rounded-md" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-md">
                                                        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                                                            画像を変更
                                                        </Button>
                                                        <Button type="button" variant="destructive" size="sm" onClick={() => setImageUrl("")}>
                                                            削除
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <UploadCloud className="size-8 mb-2 opacity-50" />
                                                    <p className="text-sm font-medium">クリックまたはドラッグ&ドロップ</p>
                                                    <p className="text-xs opacity-70">PNG, JPG, GIF（最大5MB）</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2">
                                        <Label>譲渡可否</Label>
                                        <div className="flex items-center space-x-2 border rounded-md p-3">
                                            <Switch id="transferable" checked={isTransferable} onCheckedChange={setIsTransferable} />
                                            <Label htmlFor="transferable" className="font-normal cursor-pointer text-sm">
                                                {isTransferable ? "譲渡可能（他のユーザーに渡せます）" : "譲渡不可（SBT：ウォレットに固定）"}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
                                <Button type="submit" disabled={isSubmitting || isUploading}>
                                    {isSubmitting ? "保存中..." : (editId ? "変更を保存" : "テンプレートを作成")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Deletion Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" /> テンプレートの削除
                        </DialogTitle>
                        <DialogDescription>
                            このテンプレートを削除してもよろしいですか？この操作は取り消せません。
                            <br /><br />
                            <span className="text-xs font-semibold text-muted-foreground">※Shopify商品に紐付いている場合は削除できません。</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>キャンセル</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash className="size-4 mr-2" />}
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Airdrop QR Dialog */}
            <Dialog open={!!qrTemplate} onOpenChange={(open) => { if (!open) setQrTemplate(null) }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>配布用QRコード</DialogTitle>
                        <DialogDescription>
                            このQRコードを来場者にスキャンしてもらうことで、NFT「{qrTemplate?.name}」を配布（Airdrop）します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border rounded-xl gap-4">
                        {qrTemplate && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                <QRCodeSVG
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/drop/${qrTemplate.id}`}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        )}
                        <p className="text-sm font-mono text-muted-foreground break-all text-center px-4">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/drop/{qrTemplate?.id}
                        </p>
                        <div className="flex items-center gap-2 mt-2 w-full">
                            <Button
                                variant="default"
                                className="w-full"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/drop/${qrTemplate?.id}`);
                                    alert("URLをコピーしました！");
                                }}
                            >
                                URLをコピー
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template Grid - Compact cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-full">テンプレートがありません。「新規作成」から追加してください。</p>
                ) : (
                    templates.map(t => (
                        <Card key={t.id} className="overflow-hidden group relative">
                            <CardContent className="p-0">
                                {/* Compact: horizontal layout with small thumbnail */}
                                <div className="flex flex-col">
                                    {/* Small image area */}
                                    <div className="relative w-full h-28 bg-muted flex items-center justify-center overflow-hidden">
                                        {t.image_url ? (
                                            <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="size-8 text-muted-foreground/30" />
                                        )}
                                        {/* Type badge */}
                                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-0 text-[10px] px-1.5 py-0">
                                                {TYPE_LABELS[t.type] || t.type}
                                            </Badge>
                                            {!t.is_transferable && (
                                                <Badge variant="destructive" className="bg-destructive/80 backdrop-blur-sm border-0 text-[10px] px-1.5 py-0">
                                                    SBT
                                                </Badge>
                                            )}
                                        </div>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button variant="secondary" size="sm" className="h-7 text-xs gap-1 px-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQrTemplate(t) }}>
                                                <QrCode className="size-3" /> QR配布
                                            </Button>
                                            <Button variant="secondary" size="sm" className="h-7 text-xs gap-1 px-2" onClick={(e) => handleEdit(t, e)}>
                                                <Edit className="size-3" /> 編集
                                            </Button>
                                            <Button variant="destructive" size="sm" className="h-7 text-xs gap-1 px-2" onClick={(e) => confirmDelete(t.id, e)}>
                                                <Trash className="size-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Info area */}
                                    <div className="p-3 flex flex-col gap-1.5">
                                        <h3 className="font-semibold text-sm line-clamp-1">{t.name}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{t.description || "説明なし"}</p>
                                        <div className="flex items-center justify-between text-[11px] mt-1 pt-1.5 border-t text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Package className="size-3" />
                                                <span>在庫:</span>
                                            </div>
                                            <span className="font-medium text-foreground">
                                                {t.max_supply === null ? "無制限" : `${t.current_supply || 0} / ${t.max_supply}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
