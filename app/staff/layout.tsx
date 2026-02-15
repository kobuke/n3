import { AppSidebar } from "@/components/admin/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/admin/ui/sidebar"

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
