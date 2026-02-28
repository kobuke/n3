"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"

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
          最近のエラー
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {errors.length === 0 && <p className="text-sm text-muted-foreground">最近のエラーはありません。</p>}
          {errors.map((errorLog) => (
            <div
              key={errorLog.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    注文 #{errorLog.shopify_order_id}
                  </span>
                </div>
                <span className="text-xs text-destructive">
                  {errorLog.error_message || "不明なエラー"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(errorLog.created_at), { addSuffix: true, locale: ja })}
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
