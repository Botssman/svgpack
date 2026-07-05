import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Страница не найдена',
}

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      {/* 404 illustration */}
      <div className="relative">
        <svg viewBox="0 0 120 120" className="h-32 w-32 text-neutral-200" fill="none" aria-hidden="true">
          <rect x="10" y="10" width="100" height="100" rx="20" stroke="currentColor" strokeWidth="2" />
          <path d="M35 55L55 75M55 55L35 75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="85" cy="65" r="15" stroke="currentColor" strokeWidth="2" />
          <path d="M85 55V65H92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900">404</h1>
        <p className="text-lg text-neutral-500">
          Страница не найдена
        </p>
        <p className="text-sm text-neutral-400 max-w-md">
          Возможно, она была удалена или перемещена. Попробуйте начать с главной или найдите нужный пак в каталоге.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12L12 3l9 9" />
            <path d="M9 21V12h6v9" />
          </svg>
          На главную
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Каталог
        </Link>
      </div>
    </div>
  )
}
