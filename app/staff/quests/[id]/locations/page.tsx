import { AppSidebar } from '@/components/admin/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { QuestLocationList } from '@/components/admin/quests/quest-location-list'

export default async function QuestLocationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50 w-full">
                <AppSidebar />
                <main className="flex-1 p-8">
                    <div className="flex items-center gap-4 mb-4">
                        <SidebarTrigger />
                    </div>
                    <QuestLocationList questId={id} />
                </main>
            </div>
        </SidebarProvider>
    )
}
