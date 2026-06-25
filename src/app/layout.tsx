import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
