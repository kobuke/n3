"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
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
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
          {logs.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {activity.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-normal px-1.5 py-0 h-4">
                    {activity.type}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activity.description}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={activity.status === "success" ? "default" : "secondary"}
                  className={
                    activity.status === "success"
                      ? "bg-success/10 text-success hover:bg-success/20 border-0"
                      : activity.status === "failed"
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-0"
                        : "bg-muted/50 text-muted-foreground border-0"
                  }
                >
                  {activity.status === "success" ? "Success" : activity.status === "failed" ? "Failed" : "Pending"}
                </Badge>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                  {activity.gasUsed && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted/30 px-1.5 py-0.5 rounded">
                      ⛽ {activity.gasUsed}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
