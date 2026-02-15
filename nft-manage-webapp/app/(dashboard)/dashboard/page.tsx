import { PageHeader } from "@/components/page-header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { RecentErrors } from "@/components/dashboard/recent-errors"

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
