"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CheckCircle2,
  Wallet,
  Link2,
} from "lucide-react"

export function StatsCards() {
  const [data, setData] = useState({
    successCount: 0,
    errorCount: 0,
    mappingsCount: 0,
    walletBalance: "Loading...",
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
      title: "総注文数",
      value: totalOrders.toString(),
      change: "--", // TODO: Implement historical comparison
      trend: "up" as const,
      description: "件の注文を処理済み",
      icon: Package,
    },
    {
      title: "ミント成功率",
      value: `${successRate}%`,
      change: "--",
      trend: "up" as const,
      description: "成功",
      icon: CheckCircle2,
    },
    {
      title: "サーバーウォレット残高",
      value: data.walletBalance,
      change: "--",
      trend: "up" as const,
      description: "ガス代の残高 (MATIC)",
      icon: Wallet,
    },
    {
      title: "有効な商品連携",
      value: data.mappingsCount.toString(),
      change: "--",
      trend: "up" as const,
      description: "連携済みの商品数",
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
