import { AppSidebar } from '@/components/admin/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { QuestForm } from '@/components/admin/quests/quest-form'

export default async function EditQuestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50 w-full">
                <AppSidebar />
                <main className="flex-1 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <SidebarTrigger />
                    </div>
                    <QuestForm questId={id} />
                </main>
            </div>
        </SidebarProvider>
    )
}
