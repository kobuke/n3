"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CheckCircle2,
  XCircle,
  Link2,
} from "lucide-react"

export function StatsCards() {
  const [data, setData] = useState({
    successCount: 0,
    errorCount: 0,
    mappingsCount: 0,
    loading: true
  })

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setData({ ...data, loading: false })
      })
      .catch(err => {
        console.error('Failed to fetch stats', err)
        setData(prev => ({ ...prev, loading: false }))
      })
  }, [])

  if (data.loading) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="h-20 bg-muted/20"></CardHeader>
          <CardContent className="h-20 bg-muted/10"></CardContent>
        </Card>
      ))}
    </div>
  }

  const totalOrders = data.successCount + data.errorCount
  const successRate = totalOrders > 0 ? ((data.successCount / totalOrders) * 100).toFixed(1) : "0"

  const stats = [
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      change: "--", // TODO: Implement historical comparison
      trend: "up" as const,
      description: "processed",
      icon: Package,
    },
    {
      title: "Mint Success Rate",
      value: `${successRate}%`,
      change: "--",
      trend: "up" as const,
      description: "success rate",
      icon: CheckCircle2,
    },
    {
      title: "Failed Mints",
      value: data.errorCount.toString(),
      change: "--",
      trend: "down" as const,
      description: "errors",
      icon: XCircle,
    },
    {
      title: "Active Mappings",
      value: data.mappingsCount.toString(),
      change: "--",
      trend: "up" as const,
      description: "linked products",
      icon: Link2,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {/* 
              {stat.trend === "up" ? (
                <ArrowUpRight className="size-3 text-success" />
              ) : (
                <ArrowDownRight className="size-3 text-success" />
              )}
              <span className="font-medium text-success">{stat.change}</span>
              */}
              <span className="text-muted-foreground">{stat.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
