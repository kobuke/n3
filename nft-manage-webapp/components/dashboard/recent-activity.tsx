"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

export function RecentActivity() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setLogs(data.recentLogs || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <Card className="animate-pulse h-[300px] bg-muted/10"></Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent Mint Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
          {logs.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Order #{order.shopify_order_id}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {"To: "}{order.recipient_email || order.recipient_wallet || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={order.status === "success" ? "default" : "destructive"}
                  className={
                    order.status === "success"
                      ? "bg-success/10 text-success hover:bg-success/20 border-0"
                      : ""
                  }
                >
                  {order.status === "success" ? "Success" : "Failed"}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
