import { PageHeader } from "@/components/admin/page-header"
import { StatsCards } from "@/components/admin/dashboard/stats-cards"
import { RecentActivity } from "@/components/admin/dashboard/recent-activity"
import { RecentErrors } from "@/components/admin/dashboard/recent-errors"

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dashboard"
        description="NFT mint status and system overview"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <StatsCards />
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivity />
          <RecentErrors />
        </div>
      </div>
    </div>
  )
}
