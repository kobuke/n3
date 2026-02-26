"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table"
import { Badge } from "@/components/admin/ui/badge"
import { Input } from "@/components/admin/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/admin/ui/dialog"
import {
  Search,
  LogIn,
  LogOut,
  Link2,
  RefreshCw,
  Settings,
  Key,
  Info,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "MAPPING_CREATE"
  | "MAPPING_UPDATE"
  | "UPDATE_MAPPING"
  | "MINT_RETRY"
  | "SETTINGS_UPDATE"
  | "API_KEY_ROTATE"
  | "OTHER"

const actionConfig: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  LOGIN: { label: "ログイン", icon: LogIn, color: "bg-success/10 text-success" },
  LOGOUT: { label: "ログアウト", icon: LogOut, color: "bg-muted text-muted-foreground" },
  MAPPING_CREATE: { label: "マッピング作成", icon: Link2, color: "bg-primary/10 text-primary" },
  MAPPING_UPDATE: { label: "マッピング更新", icon: Link2, color: "bg-primary/10 text-primary" },
  UPDATE_MAPPING: { label: "マッピング更新", icon: Link2, color: "bg-primary/10 text-primary" },
  MINT_RETRY: { label: "ミント再試行", icon: RefreshCw, color: "bg-warning/10 text-warning-foreground" },
  SETTINGS_UPDATE: { label: "設定更新", icon: Settings, color: "bg-muted text-muted-foreground" },
  API_KEY_ROTATE: { label: "APIキー更新", icon: Key, color: "bg-destructive/10 text-destructive" },
  OTHER: { label: "その他", icon: Info, color: "bg-muted text-muted-foreground" }
}

function formatDetailsJapanese(action: string, logDetails: any) {
  if (!logDetails) return "詳細情報はありません。";
  let details = logDetails;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      // not JSON
      return details;
    }
  }

  // 日本語の分かりやすい説明を生成
  switch (action) {
    case "LOGIN":
      return "管理システムにログインしました。";
    case "LOGOUT":
      return "管理システムからログアウトしました。";
    case "MAPPING_CREATE":
      return `Shopify商品（ID: ${details.shopify_product_id || details.productId}）とNFTコントラクト（アドレス: ${details.contract_address || details.contractAddress || details.templateId}）の紐付けを新規作成しました。`;
    case "MAPPING_UPDATE":
    case "UPDATE_MAPPING":
      return `Shopify商品（ID: ${details.shopify_product_id || details.productId}）のNFTコントラクト紐付けを更新しました。\n（※変更内容: ${JSON.stringify(details)}）`;
    case "MINT_RETRY":
      return `NFTミントの再実行を試みました。`;
    case "SETTINGS_UPDATE":
      return `システムの設定を変更しました。`;
    default:
      if (typeof details === 'object') {
        const lines = Object.entries(details).map(([k, v]) => `・${k}: ${v}`);
        return lines.join('\\n');
      }
      return String(details);
  }
}

export function AuditTable() {
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/logs?type=audit')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setLogs(data)
        } else if (data && data.error) {
          console.error("Audit API error:", data.error)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const filtered = logs.filter((log) => {
    // Basic client-side filtering
    const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
    const matchesSearch =
      search === "" ||
      (log.user_id && log.user_id.toLowerCase().includes(search.toLowerCase())) ||
      details.toLowerCase().includes(search.toLowerCase())

    const matchesAction =
      actionFilter === "all" || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="アクションで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのアクション</SelectItem>
            <SelectItem value="LOGIN">ログイン</SelectItem>
            <SelectItem value="MAPPING_CREATE">マッピング作成</SelectItem>
            <SelectItem value="MAPPING_UPDATE">マッピング更新</SelectItem>
            <SelectItem value="UPDATE_MAPPING">マッピング更新 (UPDATE_MAPPING)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-40">Timestamp</TableHead>
              <TableHead className="w-48">User</TableHead>
              <TableHead className="w-40">Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => {
              const config = actionConfig[log.action] || actionConfig.OTHER
              const Icon = config.icon
              const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details)

              return (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {log.user_id || 'システム'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${config.color} border-0 gap-1.5`}
                    >
                      <Icon className="size-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {formatDetailsJapanese(log.action, log.details)}
                  </TableCell>
                </TableRow>
              )
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No audit logs found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        全 <span className="font-medium text-foreground">{logs.length}</span> 件中 <span className="font-medium text-foreground">{filtered.length}</span> 件のログを表示しています
      </p>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedLog && (() => {
                const SelectedIcon = (actionConfig[selectedLog.action] || actionConfig.OTHER).icon;
                return <SelectedIcon className="size-5" />;
              })()}
              {selectedLog ? (actionConfig[selectedLog.action] || actionConfig.OTHER).label : 'ログの詳細'}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatDistanceToNow(new Date(selectedLog.created_at), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">アクション内容</p>
                <div className="text-sm bg-muted/30 p-3 rounded-md border whitespace-pre-wrap break-all">
                  {formatDetailsJapanese(selectedLog.action, selectedLog.details)}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">実行ユーザー</p>
                <p className="text-sm font-mono bg-muted/30 p-2 rounded-md border inline-block">
                  {selectedLog.user_id || 'システム（自動実行）'}
                </p>
              </div>

              {selectedLog.details && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">システム詳細データ (エンジニア用)</p>
                  <pre className="text-xs bg-muted p-3 rounded-md border overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all font-mono max-h-40">
                    {typeof selectedLog.details === 'string'
                      ? selectedLog.details
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
