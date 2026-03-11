"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, MapPin, Navigation, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Label } from "@/components/admin/ui/label";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/admin/ui/dialog";
import { Badge } from "@/components/admin/ui/badge";
import { MapPicker } from "@/components/admin/spots/map-picker";
import { QRCodeSVG } from "qrcode.react";

type Spot = {
    id: string;
    template_id: string;
    name: string;
    description: string;
    slug: string;
    is_location_restricted: boolean;
    latitude: number | null;
    longitude: number | null;
    radius_meters: number;
    is_active: boolean;
    max_claims_total: number | null;
    current_claims_total: number | null;
    nft_templates?: { name: string; image_url: string };
};

type NFTTemplate = {
    id: string;
    name: string;
};

export default function SpotsPage() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [templates, setTemplates] = useState<NFTTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<Spot>>({
        is_active: true,
        is_location_restricted: false,
        radius_meters: 100,
        latitude: 35.658034, // 渋谷駅周辺のデフォルト座標
        longitude: 139.701636
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [spotsRes, templatesRes] = await Promise.all([
                fetch("/api/admin/spots"),
                fetch("/api/templates")
            ]);

            if (spotsRes.ok) setSpots(await spotsRes.json());
            if (templatesRes.ok) setTemplates(await templatesRes.json());
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (spot?: Spot) => {
        if (spot) {
            setSelectedSpot(spot);
            setFormData(spot);
        } else {
            setSelectedSpot(null);
            setFormData({
                is_active: true,
                is_location_restricted: false,
                radius_meters: 100,
                latitude: 35.658034,
                longitude: 139.701636,
                name: "",
                description: "",
                slug: "",
                template_id: ""
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = selectedSpot
                ? `/api/admin/spots/${selectedSpot.id}`
                : "/api/admin/spots";

            const res = await fetch(url, {
                method: selectedSpot ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save spot");
            }

            toast.success(selectedSpot ? "配布スポットを更新しました。" : "配布スポットを追加しました。");
            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getOriginUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return '';
    };

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="配布スポット管理"
                description="オフライン（現地）でGPSやQRコードを使ったNFT配布を管理します。"
            />

            <div className="flex-1 p-6 flex flex-col gap-6">
                <div className="flex justify-end">
                    <Button onClick={() => handleOpenDialog()} className="gap-2">
                        <Plus className="w-4 h-4" />
                        新規スポット作成
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : spots.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center py-12 text-center fade-in">
                        <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">配布スポットがありません</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                            現地にいるユーザーだけが取得できるQRコード配布を作成してみましょう。
                        </p>
                        <Button onClick={() => handleOpenDialog()}>最初のスポットを作成</Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {spots.map((spot) => (
                            <Card key={spot.id} className="flex flex-col">
                                <CardHeader className="pb-3 border-b bg-muted/40 relative">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={spot.is_active ? "default" : "secondary"}>
                                                    {spot.is_active ? "公開中" : "非公開"}
                                                </Badge>
                                                {spot.is_location_restricted && (
                                                    <Badge variant="outline" className="gap-1 px-1.5 border-primary/20 bg-primary/5 text-primary">
                                                        <Navigation className="w-3 h-3" />
                                                        GPS必須
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-lg">{spot.name}</CardTitle>
                                        </div>
                                        <div className="flex space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(spot)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                                        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-background border">
                                            {spot.nft_templates?.image_url && (
                                                <img src={spot.nft_templates.image_url} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="truncate">
                                            {spot.nft_templates?.name || "未設定"}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 flex flex-col gap-4 flex-1">
                                    <div className="text-sm">
                                        <div className="text-muted-foreground mb-1 text-xs">配布URL</div>
                                        <div className="flex gap-2">
                                            <Input readOnly value={`${getOriginUrl()}/spot/${spot.id}`} className="h-8 text-xs bg-muted" />

                                        </div>
                                    </div>

                                    {spot.is_location_restricted && spot.latitude && spot.longitude && (
                                        <div className="text-xs space-y-1">
                                            <div className="text-muted-foreground font-medium">位置情報設定</div>
                                            <div className="flex items-center gap-1.5 text-foreground">
                                                <MapPin className="w-3 h-3 text-primary" />
                                                緯度 {spot.latitude.toFixed(4)}, 経度 {spot.longitude.toFixed(4)}
                                            </div>
                                            <div className="text-muted-foreground">
                                                ・半径 {spot.radius_meters}m 以内のユーザーに限定
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 border-t flex justify-between items-end">
                                        <div className="text-xs">
                                            <div className="text-muted-foreground mb-0.5">配布状況</div>
                                            <div className="font-medium text-sm">
                                                {spot.current_claims_total || 0}
                                                <span className="text-muted-foreground text-xs font-normal">
                                                    {spot.max_claims_total ? ` / ${spot.max_claims_total} 回` : " 回"}
                                                </span>
                                            </div>
                                        </div>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="gap-2 h-8">
                                                    QRコード表示
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md flex flex-col items-center p-8">
                                                <DialogHeader>
                                                    <DialogTitle className="text-center">{spot.name} 配布用QR</DialogTitle>
                                                </DialogHeader>
                                                <div className="bg-white p-6 rounded-xl shadow-sm border mt-4">
                                                    <QRCodeSVG
                                                        value={`${getOriginUrl()}/spot/${spot.id}`}
                                                        size={250}
                                                        level={"H"}
                                                    />
                                                </div>
                                                <p className="text-sm text-center text-muted-foreground mt-4">
                                                    このQRコードを印刷して現地に掲示、または<br />NFCタグにURLを書き込んで使用してください。
                                                </p>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSpot ? "配布スポットを編集" : "新規配布スポット作成"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>スポット名 <span className="text-destructive">*</span></Label>
                                <Input
                                    required
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="例: ハチ公前イベント広場"
                                />
                            </div>
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>配布用URLスラッグ <span className="text-destructive">*</span></Label>
                                <Input
                                    required
                                    value={formData.slug || ""}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="例: shibuya-event-01"
                                    pattern="^[a-zA-Z0-9-]+$"
                                    title="半角英数字とハイフンのみ"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>配布するNFTテンプレート <span className="text-destructive">*</span></Label>
                            <Select
                                value={formData.template_id || ""}
                                onValueChange={v => setFormData({ ...formData, template_id: v })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="テンプレートを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>ユーザー向け説明文</Label>
                            <Textarea
                                value={formData.description || ""}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="ユーザーの受け取り画面に表示される説明文です。"
                                rows={2}
                            />
                        </div>

                        {/* Location Settings */}
                        <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        位置情報による配布制限
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        指定した場所の周辺でのみNFTを受け取れるようにします。
                                    </p>
                                </div>
                                <Switch
                                    checked={!!formData.is_location_restricted}
                                    onCheckedChange={c => setFormData({ ...formData, is_location_restricted: c })}
                                />
                            </div>

                            {formData.is_location_restricted && (
                                <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="h-[350px] w-full rounded-md border overflow-hidden relative">
                                        <MapPicker
                                            center={[formData.latitude || 35.658034, formData.longitude || 139.701636]}
                                            radius={formData.radius_meters || 100}
                                            onLocationChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">緯度 (Latitude)</Label>
                                            <Input type="number" step="any" value={formData.latitude || ""} onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">経度 (Longitude)</Label>
                                            <Input type="number" step="any" value={formData.longitude || ""} onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">許容半径 (m)</Label>
                                            <Input type="number" value={formData.radius_meters || 100} onChange={e => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ※スマートフォンのGPSは誤差が出やすいため、半径は少し広め（50m〜100m程度）に設定することをおすすめします。
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>総配布上限数</Label>
                                <Input
                                    type="number"
                                    placeholder="制限なし"
                                    value={formData.max_claims_total || ""}
                                    onChange={e => setFormData({ ...formData, max_claims_total: e.target.value ? parseInt(e.target.value) : null })}
                                />
                                <p className="text-xs text-muted-foreground">このスポット全体での配布上限。空欄で無制限。</p>
                            </div>

                            <div className="space-y-2 flex flex-col justify-end">
                                <div className="flex items-center space-x-2 border rounded-md p-3">
                                    <Switch
                                        id="is-active"
                                        checked={!!formData.is_active}
                                        onCheckedChange={c => setFormData({ ...formData, is_active: c })}
                                    />
                                    <Label htmlFor="is-active">公開する</Label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                保存する
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
