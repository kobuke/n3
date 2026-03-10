"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, Ticket, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/admin/ui/table"
import { Input } from "@/components/admin/ui/input"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function IssuedNFTsPage() {
    const { data: response, error, mutate, isLoading } = useSWR("/api/staff/issued", fetcher)
    const [searchQuery, setSearchQuery] = useState("")
    const [processingId, setProcessingId] = useState<string | null>(null)

    const nfts = response?.nfts || []

    const filteredNfts = nfts.filter((nft: any) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            (nft.recipient_email && nft.recipient_email.toLowerCase().includes(query)) ||
            (nft.recipient_wallet && nft.recipient_wallet.toLowerCase().includes(query)) ||
            (nft.token_id && nft.token_id.toString().includes(query)) ||
            (nft.product_name && nft.product_name.toLowerCase().includes(query))
        )
    })

    const handleUseTicket = async (nft: any) => {
        if (!confirm(`トークンID #${nft.token_id} (${nft.product_name}) を使用済みにしますか？\nこの操作は取り消せません。`)) {
            return
        }

        setProcessingId(nft.id)
        try {
            const res = await fetch("/api/use-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tokenId: nft.token_id,
                    contractAddress: nft.contract_address,
                    walletAddress: nft.recipient_wallet,
                    selfCheckin: false, // スタッフ側のもぎり
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "もぎり処理に失敗しました")
            }

            alert("チケットを使用済みにしました。")
            mutate() // 最新のデータを再取得
        } catch (err: any) {
            alert(`エラー: ${err.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="flex flex-col">
            <PageHeader
                title="配布済みNFT管理 (手動もぎり)"
                description="配布済みのNFTの一覧と、遠隔地からの使用済み（もぎり）処理を行います。"
            />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="bg-card w-full rounded-xl border border-border/50 shadow-sm overflow-hidden">
                    {/* 検索バー */}
                    <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="メールアドレス、ウォレット、トークンID..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} className="gap-2">
                            <RotateCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            更新
                        </Button>
                    </div>

                    {/* テーブル */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>アイテム</TableHead>
                                    <TableHead>ユーザー情報</TableHead>
                                    <TableHead>種別 / 入手元</TableHead>
                                    <TableHead className="w-[140px]">ステータス</TableHead>
                                    <TableHead className="text-right w-[150px]">アクション</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                            データを読み込み中...
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-destructive">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <AlertTriangle className="h-8 w-8" />
                                                <p>データの取得に失敗しました</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredNfts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                            該当するNFTが見つかりません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredNfts.map((nft: any) => (
                                        <TableRow key={nft.id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono text-xs">
                                                #{nft.token_id || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                        {nft.image_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={nft.image_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <Ticket className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <p className="font-medium text-sm line-clamp-1">{nft.product_name}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm">{nft.recipient_email || 'アドレスなし'}</span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={nft.recipient_wallet}>
                                                        {nft.recipient_wallet ? `${nft.recipient_wallet.slice(0, 8)}...${nft.recipient_wallet.slice(-6)}` : '-'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-4">
                                                        {nft.template_type}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                                        {nft.source}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {nft.is_used ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 whitespace-nowrap">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            使用済
                                                        </Badge>
                                                        {nft.used_at && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(nft.used_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 whitespace-nowrap border-green-200">
                                                        有効
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!nft.is_used ? (
                                                    nft.token_id ? (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleUseTicket(nft)}
                                                            disabled={processingId === nft.id}
                                                        >
                                                            {processingId === nft.id ? "処理中..." : "使用済にする"}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled
                                                            className="text-muted-foreground bg-muted/50"
                                                        >
                                                            同期待ち
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled
                                                        className="text-muted-foreground"
                                                    >
                                                        もぎり済
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    )
}
