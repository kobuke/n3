import { PageHeader } from "@/components/page-header"
import { OrdersTable } from "@/components/order-history/orders-table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function OrderHistoryPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Order History"
        description="Track NFT mint delivery statuses for all Shopify orders"
      >
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </PageHeader>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <OrdersTable />
      </div>
    </div>
  )
}
