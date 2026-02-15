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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RefreshCw,
  Search,
  Mail,
  Wallet,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type MintStatus = "success" | "error" | "pending"

type Order = {
  id: string
  shopifyOrderId: string
  productName: string
  recipientType: "email" | "wallet"
  recipient: string
  status: MintStatus
  errorMessage?: string
  crossmintActionId?: string
  createdAt: string
}

function StatusBadge({ status }: { status: MintStatus }) {
  if (status === "success") {
    return (
      <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">
        Success
      </Badge>
    )
  }
  if (status === "error") {
    return <Badge variant="destructive">Failed</Badge>
  }
  return (
    <Badge className="bg-warning/10 text-warning-foreground hover:bg-warning/20 border-0">
      Pending
    </Badge>
  )
}

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetch('/api/logs?type=mint')
      .then(res => res.json())
      .then(data => {
        // Transform data to match Order type
        const formattedOrders = data.map((log: any) => ({
          id: log.id,
          shopifyOrderId: log.shopify_order_id,
          productName: log.product_name || "Unknown Product",
          recipientType: log.recipient_wallet ? "wallet" : "email",
          recipient: log.recipient_wallet || log.recipient_email || "Unknown",
          status: log.status,
          errorMessage: log.error_message,
          createdAt: log.created_at
        }))
        setOrders(formattedOrders)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const filtered = orders.filter((order) => {
    const matchesSearch =
      search === "" ||
      order.shopifyOrderId.toLowerCase().includes(search.toLowerCase()) ||
      order.productName.toLowerCase().includes(search.toLowerCase()) ||
      order.recipient.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Pagination placeholder (could implementing client-side pagination if list is long)
  // For now just showing all

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders, products, recipients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32">Order ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-40">Date</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {order.shopifyOrderId}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-foreground">
                    {order.productName}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {order.recipientType === "email" ? (
                      <Mail className="size-3.5 text-muted-foreground" />
                    ) : (
                      <Wallet className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {order.recipient}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  {order.status === "error" && order.errorMessage ? (
                    <span className="text-xs text-destructive max-w-xs truncate block" title={order.errorMessage}>
                      {order.errorMessage}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {order.status === "error" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Retry mint"
                      // Add retry handler here
                      >
                        <RefreshCw className="size-3.5" />
                        <span className="sr-only">Retry</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No orders found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {"Showing "}<span className="font-medium text-foreground">{filtered.length}</span>{" of "}<span className="font-medium text-foreground">{orders.length}</span>{" orders"}
        </p>
      </div>
    </div>
  )
}
