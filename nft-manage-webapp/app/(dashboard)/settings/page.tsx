import { PageHeader } from "@/components/page-header"
import { SettingsForm } from "@/components/settings/settings-form"

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Settings"
        description="Manage API credentials, notifications, and webhook configuration"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <SettingsForm />
      </div>
    </div>
  )
}
