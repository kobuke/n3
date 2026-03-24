import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AppKitProvider } from '@/context/web3-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import '../globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp" });

export const metadata: Metadata = {
  title: 'なんじょうNFTポータル',
  description: 'なんじょうNFTポータル - 南城市のデジタルチケット・証明書サービス',
}

export const viewport: Viewport = {
  themeColor: '#1a8fc4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AppKitProvider>
            {children}
          </AppKitProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
