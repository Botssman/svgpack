import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IconPack Hub — Паки SVG-иконок для веб-разработки",
  description: "Каталог SVG-иконок для языков программирования, фреймворков и инструментов. Кастомизация, сборка своего пака, скачивание в SVG/PNG/JSON.",
  keywords: ["SVG icons", "icon pack", "иконки", "веб-разработка", "React", "TypeScript", "frontend"],
  authors: [{ name: "IconPack Hub" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "IconPack Hub — Паки SVG-иконок",
    description: "Каталог SVG-иконок для веб-разработки с кастомизацией и сборкой",
    siteName: "IconPack Hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IconPack Hub — Паки SVG-иконок",
    description: "Каталог SVG-иконок для веб-разработки",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
