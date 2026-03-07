import { PageHeader } from "@/components/admin/page-header"
import { NotificationList } from "@/components/admin/notifications/notification-list"

export default function NotificationsPage() {
    return (
        <div className="flex flex-col">
            <PageHeader
                title="お知らせ管理"
                description="マイページに表示するお知らせ（通知）を作成・管理します"
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <NotificationList />
            </div>
        </div>
    )
}
