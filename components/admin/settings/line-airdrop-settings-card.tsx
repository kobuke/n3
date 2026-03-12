"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Label } from "@/components/admin/ui/label"
import { Button } from "@/components/admin/ui/button"
import { Switch } from "@/components/admin/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select"
import { Save, Loader2, MessageSquare } from "lucide-react"

export function LineAirdropSettingsCard({ templates }: { templates: any[] }) {
  const [lineAirdropEnabled, setLineAirdropEnabled] = useState(false)
  const [lineAirdropTemplateId, setLineAirdropTemplateId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings?keys=line_airdrop_enabled,line_airdrop_template_id")
      .then(r => r.json())
      .then(data => {
        if (data.line_airdrop_enabled === "true") setLineAirdropEnabled(true)
        if (data.line_airdrop_template_id) setLineAirdropTemplateId(data.line_airdrop_template_id)
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
          line_airdrop_enabled: lineAirdropEnabled ? "true" : "false",
          line_airdrop_template_id: lineAirdropTemplateId,
        }),
      })
      alert("LINE配布設定を保存しました。")
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
          <MessageSquare className="size-4 text-green-500" />
          LINE連携 記念NFT配布
        </CardTitle>
        <CardDescription>
          公式LINEのブラウザからログインしたユーザーに、自動で記念NFTを配布します。ガス代が発生するため、ON/OFFの切り替えが可能です。
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
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              LINE配布設定を保存
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
