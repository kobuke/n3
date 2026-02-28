import { PageHeader } from "@/components/admin/page-header"
import { AuditTable } from "@/components/admin/audit-logs/audit-table"

export default function AuditLogsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="監査ログ"
        description="すべての管理操作とシステムイベントの記録"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <AuditTable />
      </div>
    </div>
  )
}
