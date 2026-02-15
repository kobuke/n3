"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function RecentErrors() {
  const [errors, setErrors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setErrors(data.recentErrors || [])
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
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-destructive" />
          Recent Errors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {errors.length === 0 && <p className="text-sm text-muted-foreground">No recent errors.</p>}
          {errors.map((errorLog) => (
            <div
              key={errorLog.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Order #{errorLog.shopify_order_id}
                  </span>
                </div>
                <span className="text-xs text-destructive">
                  {errorLog.error_message || "Unknown error"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(errorLog.created_at), { addSuffix: true })}
                </span>
              </div>
              {/* Retry button logic could be implemented here */}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
