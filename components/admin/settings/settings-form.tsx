"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Button } from "@/components/admin/ui/button"
import { Switch } from "@/components/admin/ui/switch"
import { Separator } from "@/components/admin/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select"
import { Save, MessageSquare, Loader2, Bell, CheckCircle2 } from "lucide-react"

export function SettingsForm() {
  // LINE Airdrop Settings
  const [lineAirdropEnabled, setLineAirdropEnabled] = useState(false)
  const [lineAirdropTemplateId, setLineAirdropTemplateId] = useState("")
  const [templates, setTemplates] = useState<any[]>([])
  const [lineSettingsLoading, setLineSettingsLoading] = useState(true)
  const [lineSettingsSaving, setLineSettingsSaving] = useState(false)

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [notificationEmail, setNotificationEmail] = useState("")
  const [autoRetry, setAutoRetry] = useState(false)
  const [notifSettingsLoading, setNotifSettingsLoading] = useState(true)
  const [notifSettingsSaving, setNotifSettingsSaving] = useState(false)

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

    // Load notification settings
    fetch("/api/settings?keys=email_notifications_enabled,notification_email,auto_retry_enabled")
      .then(r => r.json())
      .then(data => {
        if (data.email_notifications_enabled === "true") setEmailNotifications(true)
        if (data.notification_email) setNotificationEmail(data.notification_email)
        if (data.auto_retry_enabled === "true") setAutoRetry(true)
      })
      .catch(() => { })
      .finally(() => setNotifSettingsLoading(false))
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

  async function saveNotifSettings() {
    setNotifSettingsSaving(true)
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_notifications_enabled: emailNotifications ? "true" : "false",
          notification_email: notificationEmail,
          auto_retry_enabled: autoRetry ? "true" : "false",
        }),
      })
      alert("通知設定を保存しました。")
    } catch {
      alert("保存に失敗しました。")
    } finally {
      setNotifSettingsSaving(false)
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

      {/* Notification Settings - Functional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4" />
            通知設定
          </CardTitle>
          <CardDescription>
            ミント失敗やシステムイベントの通知設定を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {notifSettingsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
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
                    placeholder="admin@example.com"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
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

              <Button
                className="gap-2 w-fit"
                onClick={saveNotifSettings}
                disabled={notifSettingsSaving}
              >
                {notifSettingsSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                通知設定を保存
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
