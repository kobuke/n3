"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Button } from "@/components/admin/ui/button"
import { Switch } from "@/components/admin/ui/switch"
import { Separator } from "@/components/admin/ui/separator"
import { Save, Loader2, Bell } from "lucide-react"

export function NotificationSettingsCard() {
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [notificationEmail, setNotificationEmail] = useState("")
  const [autoRetry, setAutoRetry] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings?keys=email_notifications_enabled,notification_email,auto_retry_enabled")
      .then(r => r.json())
      .then(data => {
        if (data.email_notifications_enabled === "true") setEmailNotifications(true)
        if (data.notification_email) setNotificationEmail(data.notification_email)
        if (data.auto_retry_enabled === "true") setAutoRetry(true)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
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
      setSaving(false)
    }
  }

  return (
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
        {loading ? (
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
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              通知設定を保存
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
