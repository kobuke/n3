"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Link2,
  ClipboardList,
  FileText,
  Settings,
  Hexagon,
  ScanLine,
  LogOut,
  Shield,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/admin/ui/sidebar"

const navItems = [
  {
    title: "ダッシュボード",
    href: "/staff/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "QRスキャン",
    href: "/staff/scan",
    icon: ScanLine,
  },
  {
    title: "NFTテンプレート",
    href: "/staff/templates",
    icon: Hexagon,
  },
  {
    title: "商品マッピング",
    href: "/staff/mapping",
    icon: Link2,
  },
  {
    title: "注文履歴",
    href: "/staff/orders",
    icon: ClipboardList,
  },
  {
    title: "監査ログ",
    href: "/staff/audit",
    icon: FileText,
  },
  {
    title: "Discord連携",
    href: "/staff/discord",
    icon: Shield,
  },
  {
    title: "設定",
    href: "/staff/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/staff/logout", { method: "POST" })
    router.push("/staff/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/staff/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">
              Nanjo Staff
            </span>
            <span className="text-xs text-muted-foreground">
              NFT Management
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/staff/dashboard" && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="ログアウト"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>ログアウト</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
