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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalIcons, setTotalIcons] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [style, setStyle] = useState('')
  const [isFree, setIsFree] = useState<'' | 'true' | 'false'>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    setSidebarOpen(false) // close sidebar on mobile after selection
  }

  const handleStyleChange = (s: string) => {
    setStyle(s)
    setPage(1)
  }

  const handleIsFreeChange = (val: '' | 'true' | 'false') => {
    setIsFree(val)
    setPage(1)
  }

  const resetAllFilters = () => {
    clearSearch()
    setCategory('all')
    setStyle('')
    setIsFree('')
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
        setTotalPages(d.totalPages || 1)
        setTotalIcons(d.totalIcons || 0)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e?.message || 'Не удалось загрузить каталог')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [category, q, style, isFree, page, limit, retryCount])

  const categories = useMemo(() => [
    { id: 'all', label: t.catalog.filterAll, icon: '📦' },
    ...CATEGORIES.map((c) => ({
      id: c.slug,
      label: lang === 'ru' ? c.nameRu : c.nameEn,
      icon: c.icon,
    })),
  ], [lang, t])

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

  // Get current category label for mobile filter button
  const currentCategoryLabel = categories.find(c => c.id === category)?.label

  return (
    <div className="py-8 md:py-12">
      {/* ── Heading ── */}
      <div className="container-wide mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Catalog
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
          {t.catalog.title}
        </h1>
        <p className="mt-2 text-neutral-600">{t.catalog.subtitle}</p>
      </div>

      {/* ── Top bar: search + style select + mobile filter toggle ── */}
      <div className="container-wide mb-6">
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={t.catalog.searchPlaceholder}
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-11 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
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

          {/* Style select */}
          <select
            value={style}
            onChange={(e) => handleStyleChange(e.target.value)}
            className="h-[42px] rounded-xl border border-neutral-200 bg-white px-3 pr-8 text-sm text-neutral-700 transition-colors focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="">{lang === 'ru' ? 'Все стили' : 'All styles'}</option>
            {STYLES.map((s) => (
              <option key={s.slug} value={s.slug}>{lang === 'ru' ? s.nameRu : s.nameEn}</option>
            ))}
          </select>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="hidden sm:inline">
              {currentCategoryLabel || (lang === 'ru' ? 'Фильтры' : 'Filters')}
            </span>
          </button>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div className="container-wide">
        <div className="flex gap-6">
          {/* ── Left Sidebar ── */}
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`
              /* Mobile: slide-in drawer */
              fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-200 ease-out
              lg:static lg:z-auto lg:w-56 lg:shrink-0 lg:shadow-none lg:transform-none lg:transition-none
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              overflow-y-auto
            `}
          >
            <div className="p-4 lg:p-0">
              {/* Mobile close button */}
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <span className="font-semibold text-neutral-900">
                  {lang === 'ru' ? 'Фильтры' : 'Filters'}
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* ── Categories ── */}
              <div className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {lang === 'ru' ? 'Категории' : 'Categories'}
                </h3>
                <div className="space-y-0.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCategoryChange(c.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        category === c.id
                          ? 'bg-neutral-900 text-white font-medium'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="text-base leading-none">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Price filter ── */}
              <div className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {lang === 'ru' ? 'Цена' : 'Price'}
                </h3>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleIsFreeChange('')}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isFree === ''
                        ? 'bg-neutral-900 text-white font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    <span>{lang === 'ru' ? 'Все' : 'All'}</span>
                  </button>
                  <button
                    onClick={() => handleIsFreeChange('true')}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isFree === 'true'
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{lang === 'ru' ? 'Бесплатные' : 'Free'}</span>
                  </button>
                  <button
                    onClick={() => handleIsFreeChange('false')}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isFree === 'false'
                        ? 'bg-amber-600 text-white font-medium'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <span>{lang === 'ru' ? 'Платные' : 'Paid'}</span>
                  </button>
                </div>
              </div>

              {/* ── Active filters & Clear ── */}
              {hasActiveFilters && (
                <div className="mb-6">
                  <button
                    onClick={resetAllFilters}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                    {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="min-w-0 flex-1">
            {/* Results count */}
            <div className="mb-4 text-sm text-neutral-500">
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
                  <span className="font-semibold text-neutral-900">{totalIcons}</span>{' '}
                  {t.catalog.iconsCount}
                </span>
              )}
            </div>

            {/* Packs grid */}
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                    onClick={resetAllFilters}
                    className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                  >
                    {lang === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {packs.map((pack) => (
                    <div
                      key={pack.id}
                      className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300"
                    >
                      {/* Icon preview grid */}
                      <Link
                        href={`/catalog/${pack.slug}`}
                        className="grid w-full grid-cols-6 gap-2 bg-neutral-50/60 p-5 transition-colors hover:bg-neutral-100"
                      >
                        {pack.icons.slice(0, 12).map((ic) => (
                          <div
                            key={ic.id}
                            className="flex aspect-square items-center justify-center rounded-lg border border-neutral-100 bg-white"
                          >
                            <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={{ color: '#0a0a0a', strokeWidth: 1.5 }} size={3} />
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
          </main>
        </div>
      </div>
    </div>
  )
}
