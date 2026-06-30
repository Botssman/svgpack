'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useBuild } from '@/lib/build-store'
import { useToast } from '@/hooks/use-toast'
import { CATEGORIES } from '@/lib/categories'

type PackInfo = {
  id: string
  slug: string
  nameRu: string
  nameEn: string
  category: string
  style: string
  isFree: boolean
}

type Icon = {
  id: string
  slug: string
  nameRu: string
  nameEn: string
  keywords: string
  svg: string
  viewBox: string
  packId: string
  pack: PackInfo
}

export function IconCatalog() {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { add, has, remove, items } = useBuild()

  const [icons, setIcons] = useState<Icon[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [style, setStyle] = useState('')
  const limit = 60

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => {
      setQ(value)
      setPage(1)
    }, 300)
    setDebounceTimer(timer)
  }

  const fetchIcons = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      if (style) params.set('style', style)

      const res = await fetch(`/api/icons?${params}`)
      const data = await res.json()
      if (res.ok) {
        setIcons(data.icons || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } else {
        toast({ title: data.error || 'Ошибка загрузки иконок' })
      }
    } catch {
      toast({ title: 'Ошибка загрузки иконок' })
    } finally {
      setLoading(false)
    }
  }, [page, q, category, style, toast])

  useEffect(() => {
    fetchIcons()
  }, [fetchIcons])

  const handleAddToBuild = (ic: Icon) => {
    if (has(ic.id)) {
      remove(ic.id)
    } else {
      add({
        iconId: ic.id,
        slug: ic.slug,
        name: lang === 'ru' ? ic.nameRu : ic.nameEn,
        svg: ic.svg,
        viewBox: ic.viewBox,
        packSlug: ic.pack.slug,
      })
      toast({ title: `+ ${lang === 'ru' ? ic.nameRu : ic.nameEn}` })
    }
  }

  const getCategoryName = (slug: string) => {
    const cat = CATEGORIES.find(c => c.slug === slug)
    return cat ? (lang === 'ru' ? cat.nameRu : cat.nameEn) : slug
  }

  const buildCount = items.length

  return (
    <div className="container-wide py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {lang === 'ru' ? 'Все иконки' : 'All Icons'}
        </h1>
        <p className="mt-2 text-slate-600">
          {lang === 'ru'
            ? 'Найдите нужную иконку или соберите свой пак из иконок разных наборов'
            : 'Find the icon you need or build your own pack from icons across different sets'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={lang === 'ru' ? 'Поиск иконок...' : 'Search icons...'}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setQ(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">{lang === 'ru' ? 'Все категории' : 'All categories'}</option>
          {CATEGORIES.map(c => (
            <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.nameRu : c.nameEn}</option>
          ))}
        </select>

        {/* Style filter */}
        <select
          value={style}
          onChange={(e) => { setStyle(e.target.value); setPage(1) }}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">{lang === 'ru' ? 'Все стили' : 'All styles'}</option>
          <option value="outline">Outline</option>
          <option value="filled">Filled</option>
          <option value="duotone">Duotone</option>
        </select>

        {/* Builder link */}
        <Link
          href="/builder"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          {lang === 'ru' ? 'Сборка' : 'Builder'}
          {buildCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold px-1.5">
              {buildCount}
            </span>
          )}
        </Link>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-slate-500">
        {loading ? '...' : (
          <>
            {total} {lang === 'ru' ? (total === 1 ? 'иконка' : total < 5 ? 'иконки' : 'иконок') : (total === 1 ? 'icon' : 'icons')}
            {q && <> {lang === 'ru' ? 'по запросу' : 'for'} «{q}»</>}
          </>
        )}
      </div>

      {/* Icon grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : icons.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {lang === 'ru' ? 'Ничего не найдено' : 'Nothing found'}
          </h3>
          <p className="text-sm text-slate-500">
            {lang === 'ru' ? 'Попробуйте изменить поисковый запрос или фильтры' : 'Try changing the search query or filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {icons.map((ic) => {
            const inBuild = has(ic.id)
            return (
              <div
                key={ic.id}
                className="group relative aspect-square flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
                onClick={() => handleAddToBuild(ic)}
                title={`${lang === 'ru' ? ic.nameRu : ic.nameEn} (${ic.pack.nameEn})`}
              >
                <div className="flex-1 flex items-center justify-center p-2 w-full">
                  <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={{ color: '#0F172A', strokeWidth: 1.5 }} size={6} />
                </div>
                {/* Icon name tooltip at bottom */}
                <div className="w-full px-1 pb-1 text-center">
                  <span className="text-[0.6rem] text-slate-400 truncate block">{ic.slug}</span>
                </div>
                {/* Add/remove indicator */}
                {inBuild && (
                  <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-lg bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none" />
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {lang === 'ru' ? 'Назад' : 'Prev'}
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              // Smart page range: show pages around current page
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === page
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {lang === 'ru' ? 'Вперёд' : 'Next'}
          </button>
        </div>
      )}

      {/* Quick pack info on hover — we show pack name in a sticky tooltip */}
      {/* Empty state hint */}
      {buildCount === 0 && !loading && icons.length > 0 && (
        <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-sm text-slate-600">
            {lang === 'ru'
              ? 'Нажимайте на иконки, чтобы добавить их в свою сборку, затем перейдите в «Сборка» для скачивания'
              : 'Click icons to add them to your build, then go to "Builder" to download'}
          </p>
        </div>
      )}
    </div>
  )
}
