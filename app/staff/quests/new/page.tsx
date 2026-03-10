import { QuestForm } from '@/components/admin/quests/quest-form'
import { PageHeader } from '@/components/admin/page-header'

export default function NewQuestPage() {
    return (
        <div className="flex flex-col">
            <PageHeader
                title="クエスト新規作成"
                description="新しいスタンプラリークエストを作成します"
            />
            <div className="flex-1 p-6">
                <QuestForm />
            </div>
        </div>
    )
}
