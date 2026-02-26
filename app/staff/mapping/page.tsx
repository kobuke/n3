import { PageHeader } from "@/components/admin/page-header"
import { MappingList } from "@/components/admin/product-mapping/mapping-list"

export default function ProductMappingPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Product Mapping"
        description="Link Shopify products to thirdweb NFT contracts"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <MappingList />
      </div>
    </div>
  )
}
