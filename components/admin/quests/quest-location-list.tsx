"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, Edit, Plus, ArrowLeft, QrCode, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QRCodeSVG } from "qrcode.react"
import { MapPicker } from "@/components/admin/spots/map-picker"

export function QuestLocationList({ questId }: { questId: string }) {
    const router = useRouter()
    const [locations, setLocations] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [lat, setLat] = useState("0")
    const [lng, setLng] = useState("0")
    const [radius, setRadius] = useState("100")
    const [orderIndex, setOrderIndex] = useState("0")

    // Metadata fields
    const [metaName, setMetaName] = useState("")
    const [metaDesc, setMetaDesc] = useState("")
    const [metaImage, setMetaImage] = useState("")
    const [isUploading, setIsUploading] = useState(false)

    // QR Code display state
    const [qrLocation, setQrLocation] = useState<any | null>(null)

    const fetchLocations = async () => {
        try {
            const res = await fetch(`/api/quests/${questId}/locations`)
            if (!res.ok) throw new Error("取得失敗")
            const data = await res.json()
            setLocations(data)
        } catch (error) {
            toast.error("地点リストの取得に失敗しました")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLocations()
    }, [questId])

    const handleOpenCreate = () => {
        setEditId(null)
        setName("")
        setDescription("")
        setLat("35.681236") // Default to Tokyo roughly
        setLng("139.767125")
        setRadius("100")
        setOrderIndex(String(locations.length + 1))
        setMetaName("")
        setMetaDesc("")
        setMetaImage("")
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (loc: any) => {
        setEditId(loc.id)
        setName(loc.name)
        setDescription(loc.description || "")
        setLat(String(loc.lat))
        setLng(String(loc.lng))
        setRadius(String(loc.radius_meters))
        setOrderIndex(String(loc.order_index))

        try {
            if (loc.levelup_metadata_uri) {
                const parsed = JSON.parse(loc.levelup_metadata_uri)
                setMetaName(parsed.name || "")
                setMetaDesc(parsed.description || "")
                setMetaImage(parsed.image || "")
            } else {
                setMetaName("")
                setMetaDesc("")
                setMetaImage("")
            }
        } catch (e) {
            // fallback if it was a raw string previously
            setMetaName("")
            setMetaDesc("")
            setMetaImage(loc.levelup_metadata_uri || "")
        }

        setIsDialogOpen(true)
    }

    const handleDuplicate = (loc: any) => {
        setEditId(null) // New entry
        setName(`${loc.name} (コピー)`)
        setDescription(loc.description || "")
        setLat(String(loc.lat))
        setLng(String(loc.lng))
        setRadius(String(loc.radius_meters))
        setOrderIndex(String(locations.length + 1))

        try {
            if (loc.levelup_metadata_uri) {
                const parsed = JSON.parse(loc.levelup_metadata_uri)
                setMetaName(parsed.name || "")
                setMetaDesc(parsed.description || "")
                setMetaImage(parsed.image || "")
            } else {
                setMetaName("")
                setMetaDesc("")
                setMetaImage("")
            }
        } catch (e) {
            setMetaName("")
            setMetaDesc("")
            setMetaImage(loc.levelup_metadata_uri || "")
        }

        setIsDialogOpen(true)
    }

    const handleLocationChange = (newLat: number, newLng: number) => {
        setLat(newLat.toFixed(6))
        setLng(newLng.toFixed(6))
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

    const handleSave = async () => {
        if (!name.trim()) return toast.error("地点名を入力してください")

        let levelup_metadata_uri = null
        if (metaName || metaDesc || metaImage) {
            levelup_metadata_uri = JSON.stringify({
                name: metaName,
                description: metaDesc,
                image: metaImage
            })
        }

        const body = {
            name,
            description,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            radius_meters: parseInt(radius, 10),
            order_index: parseInt(orderIndex, 10),
            levelup_metadata_uri
        }

        try {
            const url = editId ? `/api/quests/${questId}/locations/${editId}` : `/api/quests/${questId}/locations`
            const method = editId ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error("保存失敗")

            toast.success("地点を保存しました")
            setIsDialogOpen(false)
            fetchLocations()
        } catch (error) {
            toast.error("保存に失敗しました")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("本当にこの地点を削除しますか？")) return
        try {
            const res = await fetch(`/api/quests/${questId}/locations/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("削除失敗")
            toast.success("地点を削除しました")
            fetchLocations()
        } catch (error) {
            toast.error("削除に失敗しました")
        }
    }

    if (isLoading) return <div>読み込み中...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => router.push("/staff/quests")}>
                        <ArrowLeft className="w-5 h-5 mr-2" /> 戻る
                    </Button>
                    <h2 className="text-2xl font-bold">チェックポイント(地点)管理</h2>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    地点を追加
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editId ? "地点を編集" : "地点を追加"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label>地点名 *</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2 w-24">
                                <Label>順番 (順序)</Label>
                                <Input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>説明</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                        </div>

                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label>緯度 (Latitude) *</Label>
                                <Input type="number" step="0.000001" value={lat} onChange={e => setLat(e.target.value)} />
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label>経度 (Longitude) *</Label>
                                <Input type="number" step="0.000001" value={lng} onChange={e => setLng(e.target.value)} />
                            </div>
                            <div className="space-y-2 w-32">
                                <Label>許容距離(m)</Label>
                                <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} />
                            </div>
                        </div>

                        <div className="border rounded-md overflow-hidden relative z-0" style={{ height: "350px" }}>
                            <MapPicker
                                center={[parseFloat(lat) || 35.681236, parseFloat(lng) || 139.767125]}
                                radius={parseInt(radius, 10) || 100}
                                onLocationChange={handleLocationChange}
                            />
                        </div>

                        <hr className="my-2" />

                        <div className="space-y-4 bg-muted p-4 rounded-md">
                            <div>
                                <Label className="text-base">到達時の進化後NFTデータ ※オプション</Label>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-1 mb-2">
                                    ユーザーがこの地点をクリアした瞬間、持っているベースNFTの見た目や属性を変化させたい場合に設定します。<br />
                                    画像とテキストを登録するだけで、システムが自動的にNFTのデータを書き換えます。
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>進化後の名前</Label>
                                <Input value={metaName} onChange={e => setMetaName(e.target.value)} placeholder="例: クエスト進行中レベル2" />
                            </div>

                            <div className="space-y-2">
                                <Label>進化後の説明</Label>
                                <Textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2} placeholder="例: 中間地点に到達した証です。" />
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

                        <div className="flex justify-end pt-4 space-x-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleSave}>保存</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!qrLocation} onOpenChange={(open) => !open && setQrLocation(null)}>
                <DialogContent className="text-center sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{qrLocation?.name} - QRコード</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        {qrLocation && (
                            <>
                                <QRCodeSVG
                                    value={`${window.location.origin}/quests/scan?locationId=${qrLocation.id}`}
                                    size={256}
                                    level="H"
                                    includeMargin
                                />
                                <p className="text-sm text-muted-foreground mt-4">
                                    このQRコードを印刷して『{qrLocation.name}』に掲示してください。<br />
                                    ユーザーが読み取るとチェックイン処理画面が開きます。
                                </p>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">順番</TableHead>
                        <TableHead>地点名</TableHead>
                        <TableHead>座標 (Lat, Lng)</TableHead>
                        <TableHead>半径</TableHead>
                        <TableHead>メタデータ変化</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {locations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                地点が登録されていません
                            </TableCell>
                        </TableRow>
                    ) : (
                        locations.map((loc) => (
                            <TableRow key={loc.id}>
                                <TableCell className="font-medium text-center">{loc.order_index}</TableCell>
                                <TableCell className="font-bold">{loc.name}</TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">
                                    {loc.lat}, {loc.lng}
                                </TableCell>
                                <TableCell>{loc.radius_meters}m</TableCell>
                                <TableCell>
                                    {loc.levelup_metadata_uri ? "あり" : "-"}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => setQrLocation(loc)}>
                                        <QrCode className="w-4 h-4 mr-1" /> QR表示
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(loc)} title="編集">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(loc)} title="複製">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(loc.id)}>
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
