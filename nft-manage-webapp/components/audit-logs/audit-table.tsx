"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  | "MINT_RETRY"
  | "SETTINGS_UPDATE"
  | "API_KEY_ROTATE"
  | "OTHER"

const actionConfig: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  LOGIN: { label: "Login", icon: LogIn, color: "bg-success/10 text-success" },
  LOGOUT: { label: "Logout", icon: LogOut, color: "bg-muted text-muted-foreground" },
  MAPPING_CREATE: { label: "Mapping Created", icon: Link2, color: "bg-primary/10 text-primary" },
  MAPPING_UPDATE: { label: "Mapping Updated", icon: Link2, color: "bg-primary/10 text-primary" },
  MINT_RETRY: { label: "Mint Retry", icon: RefreshCw, color: "bg-warning/10 text-warning-foreground" },
  SETTINGS_UPDATE: { label: "Settings Updated", icon: Settings, color: "bg-muted text-muted-foreground" },
  API_KEY_ROTATE: { label: "API Key Rotated", icon: Key, color: "bg-destructive/10 text-destructive" },
  OTHER: { label: "Action", icon: Info, color: "bg-muted text-muted-foreground" }
}

export function AuditTable() {
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/logs?type=audit')
      .then(res => res.json())
      .then(data => {
        setLogs(data || [])
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
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="MAPPING_UPDATE">Mapping Updated</SelectItem>
            {/* Add other actions as they occur */}
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
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {log.user_id || 'System'}
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
                    {details}
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
        {"Showing "}<span className="font-medium text-foreground">{filtered.length}</span>{" of "}<span className="font-medium text-foreground">{logs.length}</span>{" log entries"}
      </p>
    </div>
  )
}
