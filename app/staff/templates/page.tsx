import { PageHeader } from "@/components/admin/page-header"
import { TemplateList } from "@/components/admin/templates/template-list"

export default function TemplatesPage() {
    return (
        <div className="flex flex-col">
            <PageHeader
                title="NFT Templates"
                description="Create and manage NFT templates to be minted upon Shopify purchases"
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <TemplateList />
            </div>
        </div>
    )
}
