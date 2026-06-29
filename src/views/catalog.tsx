'use client'
import { useEffect, useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'
import { CATEGORIES } from '@/lib/categories'

type Pack = {
  id: string
  slug: string
  nameRu: string
  nameEn: string
  descRu: string
  descEn: string
  category: string
  style: string
  tags: string
  isFree: boolean
  icons: { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string }[]
}

export function Catalog({ nav }: { nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const [packs, setPacks] = useState<Pack[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const url = `/api/packs?category=${category}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    fetch(url)
      .then(async r => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(data?.error || `HTTP ${r.status}`)
        }
        return data
      })
      .then(d => {
        if (cancelled) return
        setPacks(d.packs || [])
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e?.message || 'Не удалось загрузить каталог')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [category, q, retryCount])

  const totalIcons = useMemo(() => packs.reduce((s, p) => s + p.icons.length, 0), [packs])

  const categories = [
    { id: 'all', label: t.catalog.filterAll },
    ...CATEGORIES.map((c) => ({
      id: c.slug,
      label: lang === 'ru' ? c.nameRu : c.nameEn,
    })),
  ]

  const handleDownload = (slug: string) => {
    window.open(`/api/download/pack?slug=${slug}`, '_blank')
    toast({ title: t.toast.downloaded })
  }

  return (
    <div className="container-wide py-12 md:py-16">
      {/* Heading */}
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Catalog
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
          {t.catalog.title}
        </h1>
        <p className="mt-2 text-neutral-600">{t.catalog.subtitle}</p>
      </div>

      {/* Search + filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === c.id
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-neutral-500">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 animate-pulse rounded-full bg-neutral-400" />
              ...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-neutral-900">{packs.length}</span>
              {' '}/{' '}
              <span className="font-semibold text-neutral-900">{totalIcons}</span>{' '}
              {t.catalog.iconsCount}
            </span>
          )}
        </div>
      </div>

      {/* Packs grid */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 py-12 text-center">
          <div className="mb-2 font-medium text-red-700">Не удалось загрузить каталог</div>
          <div className="mx-auto mb-4 max-w-2xl break-all font-mono text-xs text-red-600">{error}</div>
          <button
            onClick={() => setRetryCount(n => n + 1)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Повторить
          </button>
          <div className="mt-6 text-xs text-neutral-500">
            Диагностика:{' '}
            <a href="/api/health" target="_blank" className="underline">/api/health</a>
            {' · '}
            <a href="/api/packs" target="_blank" className="underline">/api/packs</a>
          </div>
        </div>
      ) : packs.length === 0 ? (
        <div className="py-20 text-center text-neutral-500">{t.catalog.noResults}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300"
            >
              {/* Icon preview grid */}
              <button
                onClick={() => nav({ name: 'pack', slug: pack.slug })}
                className="grid w-full grid-cols-6 gap-2 bg-neutral-50/60 p-5 transition-colors hover:bg-neutral-100"
              >
                {pack.icons.slice(0, 12).map((ic) => (
                  <div
                    key={ic.id}
                    className="flex aspect-square items-center justify-center rounded-lg border border-neutral-100 bg-white"
                  >
                    <IconView innerSvg={ic.svg} cfg={{ color: '#0a0a0a', strokeWidth: 1.5 }} size={20} />
                  </div>
                ))}
              </button>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      {lang === 'ru' ? pack.nameRu : pack.nameEn}
                    </h3>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      <span className="font-mono">{pack.category}</span>
                      {' · '}
                      <span className="font-mono">{pack.style}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {pack.icons.length} {t.catalog.iconsCount}
                  </span>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-neutral-600">
                  {lang === 'ru' ? pack.descRu : pack.descEn}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => nav({ name: 'pack', slug: pack.slug })}
                    className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                  >
                    {t.catalog.viewPack}
                  </button>
                  <button
                    onClick={() => handleDownload(pack.slug)}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-50"
                  >
                    {t.catalog.downloadZip}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
