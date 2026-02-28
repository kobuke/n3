"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Button } from "@/components/admin/ui/button"
import { Switch } from "@/components/admin/ui/switch"
import { Separator } from "@/components/admin/ui/separator"
import { Badge } from "@/components/admin/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select"
import { Eye, EyeOff, Save, TestTube, CheckCircle2, MessageSquare, Loader2 } from "lucide-react"

export function SettingsForm() {
  const [showShopifyKey, setShowShopifyKey] = useState(false)
  const [showThirdwebSecret, setShowThirdwebSecret] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [autoRetry, setAutoRetry] = useState(false)

  // LINE Airdrop Settings
  const [lineAirdropEnabled, setLineAirdropEnabled] = useState(false)
  const [lineAirdropTemplateId, setLineAirdropTemplateId] = useState("")
  const [templates, setTemplates] = useState<any[]>([])
  const [lineSettingsLoading, setLineSettingsLoading] = useState(true)
  const [lineSettingsSaving, setLineSettingsSaving] = useState(false)

  useEffect(() => {
    // Load templates
    fetch("/api/templates").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTemplates(data)
    }).catch(() => { })

    // Load LINE airdrop settings
    fetch("/api/settings?keys=line_airdrop_enabled,line_airdrop_template_id")
      .then(r => r.json())
      .then(data => {
        if (data.line_airdrop_enabled === "true") setLineAirdropEnabled(true)
        if (data.line_airdrop_template_id) setLineAirdropTemplateId(data.line_airdrop_template_id)
      })
      .catch(() => { })
      .finally(() => setLineSettingsLoading(false))
  }, [])

  async function saveLineSettings() {
    setLineSettingsSaving(true)
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_airdrop_enabled: lineAirdropEnabled ? "true" : "false",
          line_airdrop_template_id: lineAirdropTemplateId,
        }),
      })
      alert("LINE配布設定を保存しました。")
    } catch {
      alert("保存に失敗しました。")
    } finally {
      setLineSettingsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* LINE Airdrop Settings */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4 text-green-500" />
            LINE連携 記念NFT配布
          </CardTitle>
          <CardDescription>
            公式LINEのブラウザからログインしたユーザーに、自動で記念NFTを配布します。ガス代が発生するため、ON/OFFの切り替えが可能です。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {lineSettingsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label>LINE配布を有効にする</Label>
                  <span className="text-xs text-muted-foreground">
                    ONにすると、LINEブラウザからの初回ログイン時にNFTが自動配布されます
                  </span>
                </div>
                <Switch
                  checked={lineAirdropEnabled}
                  onCheckedChange={setLineAirdropEnabled}
                />
              </div>

              {lineAirdropEnabled && (
                <div className="flex flex-col gap-2">
                  <Label>配布するNFTテンプレート</Label>
                  <Select value={lineAirdropTemplateId} onValueChange={setLineAirdropTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレートを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    ※1ユーザーにつき1回のみ配布され、重複配布はされません。
                  </p>
                </div>
              )}

              <Button
                className="gap-2 w-fit"
                onClick={saveLineSettings}
                disabled={lineSettingsSaving}
              >
                {lineSettingsSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                LINE配布設定を保存
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API設定</CardTitle>
          <CardDescription>
            ShopifyとThirdwebのAPI認証情報を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Shopify */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="shopify-key">Shopify APIキー</Label>
              <Badge className="bg-success/10 text-success hover:bg-success/20 border-0 gap-1">
                <CheckCircle2 className="size-3" />
                接続済み
              </Badge>
            </div>
            <div className="relative">
              <Input
                id="shopify-key"
                type={showShopifyKey ? "text" : "password"}
                defaultValue="shpat_xxxxxxxxxxxxxxxxxxxx"
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setShowShopifyKey(!showShopifyKey)}
              >
                {showShopifyKey ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span className="sr-only">表示切り替え</span>
              </Button>
            </div>
          </div>

          {/* Shopify Store URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="shopify-store">ShopifyストアURL</Label>
            <Input
              id="shopify-store"
              defaultValue="nomad-resort.myshopify.com"
              className="text-sm"
            />
          </div>

          <Separator />

          {/* thirdweb */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="thirdweb-secret">thirdweb シークレットキー</Label>
              <Badge className="bg-success/10 text-success hover:bg-success/20 border-0 gap-1">
                <CheckCircle2 className="size-3" />
                接続済み
              </Badge>
            </div>
            <div className="relative">
              <Input
                id="thirdweb-secret"
                type={showThirdwebSecret ? "text" : "password"}
                defaultValue="sk_xxxxxxxxxxxxxxxxxxxx"
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setShowThirdwebSecret(!showThirdwebSecret)}
              >
                {showThirdwebSecret ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span className="sr-only">表示切り替え</span>
              </Button>
            </div>
          </div>

          {/* thirdweb Engine URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="thirdweb-engine-url">thirdweb Engine URL</Label>
            <Input
              id="thirdweb-engine-url"
              defaultValue="https://your-engine-name.up.railway.app"
              className="font-mono text-sm"
            />
          </div>

          {/* thirdweb Client ID */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="thirdweb-client-id">thirdweb Client ID</Label>
            <Input
              id="thirdweb-client-id"
              defaultValue="your_client_id_here"
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <Button className="gap-2">
              <Save className="size-4" />
              設定を保存
            </Button>
            <Button variant="outline" className="gap-2">
              <TestTube className="size-4" />
              接続テスト
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知設定</CardTitle>
          <CardDescription>
            ミント失敗やシステムイベントの通知設定を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label>メール通知</Label>
              <span className="text-xs text-muted-foreground">
                ミント失敗時にメールでアラートを受け取ります
              </span>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          {emailNotifications && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="notification-email">通知先メールアドレス</Label>
              <Input
                id="notification-email"
                type="email"
                defaultValue="admin@nomadresort.io"
                className="text-sm"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label>失敗時の自動リトライ</Label>
              <span className="text-xs text-muted-foreground">
                失敗したミントを最大3回まで自動でリトライします
              </span>
            </div>
            <Switch
              checked={autoRetry}
              onCheckedChange={setAutoRetry}
            />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook設定</CardTitle>
          <CardDescription>
            Shopifyからの注文処理用Webhookエンドポイントの設定
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value="https://api.nomadresort.io/webhooks/shopify/orders-paid"
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" size="sm">
                コピー
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {"Shopify管理画面の「設定 > 通知 > Webhook」で "}
              <span className="font-mono font-medium">{"orders/paid"}</span>
              {" イベントにこのURLを設定してください。"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-secret">Webhookシークレット</Label>
            <Input
              id="webhook-secret"
              type="password"
              defaultValue="whsec_xxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
