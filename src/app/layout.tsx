import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { I18nProvider } from '@/lib/i18n'
import { UserProvider } from '@/lib/user-store'
import { BuildProvider } from '@/lib/build-store'
import { Shell } from '@/components/shell'
import { getLang } from '@/lib/i18n-server'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'IconPack Hub — Паки SVG-иконок для веб-разработки',
    template: '%s · IconPack Hub',
  },
  description:
    'Каталог SVG-иконок для языков программирования, фреймворков и инструментов. Кастомизация, сборка своего пака, скачивание в SVG/PNG/JSON.',
  keywords: [
    'SVG icons',
    'icon pack',
    'иконки',
    'веб-разработка',
    'React',
    'TypeScript',
    'frontend',
  ],
  authors: [{ name: 'IconPack Hub' }],
  icons: {
    icon: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  },
  openGraph: {
    title: 'IconPack Hub — Паки SVG-иконок',
    description: 'Каталог SVG-иконок для веб-разработки с кастомизацией и сборкой',
    siteName: 'IconPack Hub',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IconPack Hub — Паки SVG-иконок',
    description: 'Каталог SVG-иконок для веб-разработки',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await getLang()
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <I18nProvider initialLang={lang}>
          <UserProvider>
            <BuildProvider>
              <Shell>{children}</Shell>
            </BuildProvider>
          </UserProvider>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  )
}
