import { QuestLocationList } from '@/components/admin/quests/quest-location-list'
import { PageHeader } from '@/components/admin/page-header'

export default async function QuestLocationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div className="flex flex-col">
            <PageHeader
                title="チェックポイント(地点)管理"
                description="クエストに含まれる各地点の設定とQRコードの発行を行います"
            />
            <div className="flex-1 p-6">
                <QuestLocationList questId={id} />
            </div>
        </div>
    )
}
