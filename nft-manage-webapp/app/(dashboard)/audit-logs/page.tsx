import { PageHeader } from "@/components/page-header"
import { AuditTable } from "@/components/audit-logs/audit-table"

export default function AuditLogsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Audit Logs"
        description="Track all admin actions and system events"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <AuditTable />
      </div>
    </div>
  )
}
