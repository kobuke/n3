import { QuestForm } from '@/components/admin/quests/quest-form'
import { PageHeader } from '@/components/admin/page-header'

export default async function EditQuestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div className="flex flex-col">
            <PageHeader
                title="クエスト編集"
                description="クエストの基本設定を編集します"
            />
            <div className="flex-1 p-6">
                <QuestForm questId={id} />
            </div>
        </div>
    )
}
