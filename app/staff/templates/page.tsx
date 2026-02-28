import { PageHeader } from "@/components/admin/page-header"
import { TemplateList } from "@/components/admin/templates/template-list"

export default function TemplatesPage() {
    return (
        <div className="flex flex-col">
            <PageHeader
                title="NFTテンプレート"
                description="Shopifyでの購入時にミントされるNFTテンプレートを作成・管理します"
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <TemplateList />
            </div>
        </div>
    )
}
