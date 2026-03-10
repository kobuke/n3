import { QuestList } from '@/components/admin/quests/quest-list'
import { PageHeader } from '@/components/admin/page-header'

export default function StaffQuestsPage() {
    return (
        <div className="flex flex-col">
            <PageHeader
                title="スタンプラリー（クエスト）管理"
                description="ユーザーがQRをスキャンして回るクエストを作成・管理します"
            />
            <div className="flex-1 p-6">
                <QuestList />
            </div>
        </div>
    )
}
