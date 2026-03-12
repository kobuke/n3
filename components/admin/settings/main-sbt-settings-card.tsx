"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Label } from "@/components/admin/ui/label"
import { Button } from "@/components/admin/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select"
import { Save, Loader2, Image as ImageIcon } from "lucide-react"

export function MainSbtSettingsCard({ templates }: { templates: any[] }) {
  const [mainSbtTemplateId, setMainSbtTemplateId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings?keys=main_sbt_template_id")
      .then(r => r.json())
      .then(data => {
        if (data.main_sbt_template_id) setMainSbtTemplateId(data.main_sbt_template_id)
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
          main_sbt_template_id: mainSbtTemplateId,
        }),
      })
      alert("トップ画像（SBT）表示設定を保存しました。")
    } catch {
      alert("保存に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          トップ画像（SBT）表示設定
        </CardTitle>
        <CardDescription>
          マイページのトップに表示する代表的なSBT（デジタル住民NFT等）を指定します。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label>表示するSBTテンプレート</Label>
              <Select value={mainSbtTemplateId} onValueChange={setMainSbtTemplateId}>
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
                ※ここで指定したSBTがマイページ最上段に表示され、保有者数（関係人口）などの情報が連動します。
              </p>
            </div>

            <Button
              className="gap-2 w-fit"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              表示設定を保存
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
