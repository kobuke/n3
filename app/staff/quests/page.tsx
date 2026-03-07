import { AppSidebar } from '@/components/admin/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { QuestList } from '@/components/admin/quests/quest-list'

export default function StaffQuestsPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50 w-full">
                <AppSidebar />
                <main className="flex-1 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <SidebarTrigger />
                        <h1 className="text-2xl font-bold">スタンプラリー（クエスト）管理</h1>
                    </div>
                    <QuestList />
                </main>
            </div>
        </SidebarProvider>
    )
}
