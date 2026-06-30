'use client'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
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
  icons: { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }[]
}

const STYLES = [
  { slug: 'outline', nameRu: 'Outline', nameEn: 'Outline' },
  { slug: 'filled', nameRu: 'Filled', nameEn: 'Filled' },
  { slug: 'duotone', nameRu: 'Duotone', nameEn: 'Duotone' },
]

export function Catalog() {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const [packs, setPacks] = useState<Pack[]>([])
  const [total, setTotal] = useState(0)
  const [totalIconsAll, setTotalIconsAll] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [style, setStyle] = useState('')
  const [isFree, setIsFree] = useState<'' | 'true' | 'false'>('')

  const limit = 12

  // Debounced search
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQ(value)
      setPage(1)
    }, 300)
  }

  const clearSearch = () => {
    setSearchInput('')
    setQ('')
    setPage(1)
  }

  const handleCategoryChange = (id: string) => {
    setCategory(id)
    setPage(1)
  }

  const handleStyleChange = (s: string) => {
    setStyle(s)
    setPage(1)
  }

  const handleIsFreeChange = (val: '' | 'true' | 'false') => {
    setIsFree(val)
    setPage(1)
  }

  // Fetch packs
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (category && category !== 'all') params.set('category', category)
    if (q) params.set('q', q)
    if (style) params.set('style', style)
    if (isFree) params.set('isFree', isFree)

    fetch(`/api/packs?${params}`)
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
        setTotal(d.total || 0)
        setTotalIconsAll(d.totalIconsAll || 0)
        setTotalPages(d.totalPages || 1)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e?.message || 'Не удалось загрузить каталог')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [category, q, style, isFree, page, limit, retryCount])

  // totalIconsAll comes from the API (all icons in DB matching filters), not just current page
  const totalIconsOnPage = useMemo(() => packs.reduce((s, p) => s + p.icons.length, 0), [packs])

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

  // Smart page range: show up to 7 page buttons around the current page
  const pageRange = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 7
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (page <= 4) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
    } else if (page >= totalPages - 3) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
    } else {
      for (let i = page - 3; i <= page + 3; i++) pages.push(i)
    }
    return pages
  }, [page, totalPages])

  // Check if any filter is active (not counting default values)
  const hasActiveFilters = q || (category && category !== 'all') || style || isFree

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
        {/* Search input */}
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCategoryChange(c.id)}
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

        {/* Style + isFree filters row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Style pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-500 mr-1">
              {lang === 'ru' ? 'Стиль:' : 'Style:'}
            </span>
            <button
              onClick={() => handleStyleChange('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                style === ''
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {lang === 'ru' ? 'Все' : 'All'}
            </button>
            {STYLES.map((s) => (
              <button
                key={s.slug}
                onClick={() => handleStyleChange(s.slug)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  style === s.slug
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {s.nameEn}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-neutral-200" />

          {/* isFree pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-500 mr-1">
              {lang === 'ru' ? 'Цена:' : 'Price:'}
            </span>
            <button
              onClick={() => handleIsFreeChange('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isFree === ''
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {lang === 'ru' ? 'Все' : 'All'}
            </button>
            <button
              onClick={() => handleIsFreeChange('true')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isFree === 'true'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {lang === 'ru' ? 'Бесплатные' : 'Free'}
            </button>
            <button
              onClick={() => handleIsFreeChange('false')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isFree === 'false'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {lang === 'ru' ? 'Платные' : 'Paid'}
            </button>
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <>
              <div className="h-5 w-px bg-neutral-200" />
              <button
                onClick={() => {
                  clearSearch()
                  setCategory('all')
                  setStyle('')
                  setIsFree('')
                  setPage(1)
                }}
                className="rounded-full px-3 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
              </button>
            </>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-neutral-500">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 animate-pulse rounded-full bg-neutral-400" />
              ...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-neutral-900">{total}</span>
              {' '}{lang === 'ru' ? (total === 1 ? 'пак' : total < 5 ? 'пака' : 'паков') : (total === 1 ? 'pack' : 'packs')}
              {q && <> {lang === 'ru' ? 'по запросу' : 'for'} «{q}»</>}
              {' · '}
              <span className="font-semibold text-neutral-900">{totalIconsAll}</span>{' '}
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
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">{t.catalog.noResults}</h3>
          <p className="text-sm text-neutral-500">
            {lang === 'ru' ? 'Попробуйте изменить поисковый запрос или фильтры' : 'Try changing the search query or filters'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                clearSearch()
                setCategory('all')
                setStyle('')
                setIsFree('')
                setPage(1)
              }}
              className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300"
              >
                {/* Icon preview grid */}
                <Link
                  href={`/catalog/${pack.slug}`}
                  className="grid w-full grid-cols-6 gap-1 bg-neutral-50/60 p-5 transition-colors hover:bg-neutral-100"
                >
                  {pack.icons.slice(0, 12).map((ic) => (
                    <div
                      key={ic.id}
                      className="flex aspect-square items-center justify-center rounded-lg border border-neutral-100 bg-white"
                    >
                      <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={{ color: '#0a0a0a', strokeWidth: 1.5 }} size={4} />
                    </div>
                  ))}
                </Link>
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
                    <div className="flex items-center gap-1.5">
                      {!pack.isFree && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {lang === 'ru' ? 'Платный' : 'Paid'}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {pack.icons.length} {t.catalog.iconsCount}
                      </span>
                    </div>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-neutral-600">
                    {lang === 'ru' ? pack.descRu : pack.descEn}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/catalog/${pack.slug}`}
                      className="flex flex-1 items-center justify-center rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                    >
                      {t.catalog.viewPack}
                    </Link>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {lang === 'ru' ? 'Назад' : 'Prev'}
              </button>
              <div className="flex items-center gap-1">
                {pageRange.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {lang === 'ru' ? 'Вперёд' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
