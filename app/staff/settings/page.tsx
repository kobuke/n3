import { PageHeader } from "@/components/admin/page-header"
import { SettingsForm } from "@/components/admin/settings/settings-form"

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="設定"
        description="APIキー、通知、Webhookなどを管理します"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <SettingsForm />
      </div>
    </div>
  )
}
