import { AppSidebar } from "@/components/admin/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/admin/ui/sidebar"
import { Noto_Sans_JP, Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import '../globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp" });

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
