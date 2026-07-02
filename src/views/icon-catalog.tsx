'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'

/* ── Icon shape from /public/icons/*.json ── */
type IconData = {
  id: string
  name: string
  nameRu: string
  category: string
  keywords: string[]
  svg: string
  fillMode: 'outlined' | 'filled'
  style: string
}

/* ── Library info ── */
const LIBRARIES = [
  { slug: 'lucide', name: 'Lucide', color: '#f97316' },
  { slug: 'tabler', name: 'Tabler', color: '#3b82f6' },
  { slug: 'heroicons', name: 'Heroicons', color: '#8b5cf6' },
  { slug: 'iconoir', name: 'Iconoir', color: '#10b981' },
  { slug: 'phosphor', name: 'Phosphor', color: '#ec4899' },
] as const

const ICON_CATEGORIES = [
  { slug: 'ui', nameRu: 'Интерфейс', nameEn: 'UI', icon: '🖱' },
  { slug: 'arrows', nameRu: 'Стрелки', nameEn: 'Arrows', icon: '↗' },
  { slug: 'commerce', nameRu: 'Коммерция', nameEn: 'Commerce', icon: '💰' },
  { slug: 'devices', nameRu: 'Устройства', nameEn: 'Devices', icon: '📱' },
  { slug: 'media', nameRu: 'Медиа', nameEn: 'Media', icon: '🎬' },
  { slug: 'communication', nameRu: 'Коммуникация', nameEn: 'Communication', icon: '💬' },
  { slug: 'navigation', nameRu: 'Навигация', nameEn: 'Navigation', icon: '🧭' },
  { slug: 'weather', nameRu: 'Погода', nameEn: 'Weather', icon: '🌤' },
  { slug: 'social', nameRu: 'Социальные', nameEn: 'Social', icon: '👥' },
  { slug: 'transport', nameRu: 'Транспорт', nameEn: 'Transport', icon: '🚗' },
  { slug: 'time', nameRu: 'Время', nameEn: 'Time', icon: '⏰' },
  { slug: 'education', nameRu: 'Образование', nameEn: 'Education', icon: '🎓' },
  { slug: 'food', nameRu: 'Еда', nameEn: 'Food', icon: '🍔' },
  { slug: 'nature', nameRu: 'Природа', nameEn: 'Nature', icon: '🌿' },
  { slug: 'health', nameRu: 'Здоровье', nameEn: 'Health', icon: '❤' },
] as const

function getLib(id: string) {
  for (const l of LIBRARIES) if (id.startsWith(l.slug)) return l.slug
  return 'other'
}

export function IconCatalog() {
  const { t, lang } = useI18n()
  const { toast } = useToast()

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [icons, setIcons] = useState<IconData[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [libFilter, setLibFilter] = useState('')
  const [styleFilter, setStyleFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 120
  const [selectedIcon, setSelectedIcon] = useState<IconData | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load category counts
  useEffect(() => {
    fetch('/icons/index.json')
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {})
  }, [])

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(0)
    }, 300)
  }

  // Load icons for a category
  const loadCategory = useCallback(async (cat: string) => {
    setActiveCategory(cat)
    setPage(0)
    setSearch('')
    setSearchInput('')
    setLibFilter('')
    setStyleFilter('')
    setLoading(true)
    setIcons([])

    try {
      // UI category is split into ui-1..ui-10
      if (cat === 'ui') {
        const allUi: IconData[] = []
        for (let i = 1; i <= 10; i++) {
          const r = await fetch(`/icons/ui-${i}.json`)
          if (!r.ok) break
          const data: IconData[] = await r.json()
          allUi.push(...data)
        }
        setIcons(allUi)
      } else {
        const r = await fetch(`/icons/${cat}.json`)
        if (r.ok) {
          const data: IconData[] = await r.json()
          setIcons(data)
        }
      }
    } catch (e) {
      console.error(e)
      toast({ title: lang === 'ru' ? 'Ошибка загрузки' : 'Load error' })
    } finally {
      setLoading(false)
    }
  }, [toast, lang])

  // Filtered icons
  const filtered = icons.filter(ic => {
    if (libFilter && getLib(ic.id) !== libFilter) return false
    if (styleFilter && ic.fillMode !== styleFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        ic.name.toLowerCase().includes(s) ||
        ic.nameRu.toLowerCase().includes(s) ||
        ic.id.toLowerCase().includes(s) ||
        ic.keywords.some(k => k.toLowerCase().includes(s))
      )
    }
    return true
  })

  const visibleIcons = filtered.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = filtered.length > (page + 1) * PAGE_SIZE
  const totalIcons = Object.values(counts).reduce((a, b) => a + b, 0)

  // Render SVG fragment inside a proper svg wrapper
  const renderIcon = (svgContent: string, color: string = '#334155') => {
    const colored = svgContent.replace(/currentColor/g, color)
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        dangerouslySetInnerHTML={{ __html: colored }}
      />
    )
  }

  // Download single SVG
  const downloadSvg = (ic: IconData) => {
    const svgFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${ic.svg}</svg>`
    const blob = new Blob([svgFull], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ic.name}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download all as ZIP
  const downloadAll = () => {
    window.open('/icons-all.zip', '_blank')
  }

  const catLabel = (slug: string) => {
    const cat = ICON_CATEGORIES.find(c => c.slug === slug)
    return cat ? (lang === 'ru' ? cat.nameRu : cat.nameEn) : slug
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-3">
            {lang === 'ru' ? 'Библиотека иконок' : 'Icon Library'}
          </h1>
          <p className="text-slate-300 text-lg mb-6">
            {lang === 'ru'
              ? `${totalIcons.toLocaleString()} иконок из 5 библиотек — Lucide, Tabler, Heroicons, Iconoir, Phosphor. Все бесплатные, с открытым исходным кодом.`
              : `${totalIcons.toLocaleString()} icons from 5 libraries — Lucide, Tabler, Heroicons, Iconoir, Phosphor. All free, open source.`}
          </p>
          {/* Library badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {LIBRARIES.map(l => (
              <span key={l.slug} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-sm">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
          <button
            onClick={downloadAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {lang === 'ru' ? 'Скачать все (ZIP)' : 'Download all (ZIP)'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ICON_CATEGORIES.map(cat => {
            const cnt = counts[cat.slug] || 0
            if (cnt === 0) return null
            const isActive = activeCategory === cat.slug
            return (
              <button
                key={cat.slug}
                onClick={() => loadCategory(cat.slug)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                {lang === 'ru' ? cat.nameRu : cat.nameEn}
                <span className={`text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {cnt.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Welcome state */}
        {!activeCategory && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📂</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {lang === 'ru' ? 'Выберите категорию' : 'Choose a category'}
            </h2>
            <p className="text-slate-500">
              {lang === 'ru'
                ? 'Нажмите на кнопку категории выше, чтобы просмотреть иконки'
                : 'Click a category button above to browse icons'}
            </p>
          </div>
        )}

        {/* Active category view */}
        {activeCategory && (
          <>
            {/* Search & filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
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
              </div>
              <select
                value={libFilter}
                onChange={(e) => { setLibFilter(e.target.value); setPage(0) }}
                className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">{lang === 'ru' ? 'Все библиотеки' : 'All libraries'}</option>
                {LIBRARIES.map(l => <option key={l.slug} value={l.slug}>{l.name}</option>)}
              </select>
              <select
                value={styleFilter}
                onChange={(e) => { setStyleFilter(e.target.value); setPage(0) }}
                className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">{lang === 'ru' ? 'Все стили' : 'All styles'}</option>
                <option value="outlined">Outlined</option>
                <option value="filled">Filled</option>
              </select>
              <span className="text-sm text-slate-500 ml-auto">
                {filtered.length.toLocaleString()} {lang === 'ru' ? 'иконок' : 'icons'}
              </span>
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {/* Icon grid */}
            {!loading && visibleIcons.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {visibleIcons.map((ic) => {
                  const lib = getLib(ic.id)
                  const libInfo = LIBRARIES.find(l => l.slug === lib)
                  return (
                    <div
                      key={ic.id}
                      className="group relative aspect-square flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                      onClick={() => setSelectedIcon(ic)}
                      title={`${ic.nameRu} / ${ic.name}`}
                    >
                      <div className="flex-1 flex items-center justify-center p-2 w-full">
                        {renderIcon(ic.svg, '#334155')}
                      </div>
                      <div className="w-full px-1 pb-1 text-center">
                        <span className="text-[0.55rem] text-slate-400 truncate block">{ic.name}</span>
                      </div>
                      {/* Library dot */}
                      <div
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                        style={{ background: libInfo?.color || '#94a3b8' }}
                        title={libInfo?.name}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-lg bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none" />
                    </div>
                  )
                })}
              </div>
            )}

            {/* No results */}
            {!loading && filtered.length === 0 && activeCategory && (
              <div className="py-16 text-center">
                <p className="text-slate-500">
                  {lang === 'ru' ? 'Ничего не найдено' : 'Nothing found'}
                </p>
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-6 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  {lang === 'ru'
                    ? `Показать ещё (${(filtered.length - (page + 1) * PAGE_SIZE).toLocaleString()} осталось)`
                    : `Load more (${(filtered.length - (page + 1) * PAGE_SIZE).toLocaleString()} left)`
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {selectedIcon && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedIcon(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedIcon.nameRu}</h2>
                <p className="text-sm text-slate-500">{selectedIcon.name}</p>
              </div>
              <button
                onClick={() => setSelectedIcon(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl mb-4">
              <div className="w-24 h-24">
                {renderIcon(selectedIcon.svg, '#3b82f6')}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
                {catLabel(selectedIcon.category)}
              </span>
              <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700 capitalize">
                {getLib(selectedIcon.id)}
              </span>
              <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700 capitalize">
                {selectedIcon.fillMode}
              </span>
              {selectedIcon.keywords.slice(0, 5).map(kw => (
                <span key={kw} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">
                  {kw}
                </span>
              ))}
            </div>

            {/* SVG code */}
            <details className="mb-4">
              <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                {lang === 'ru' ? 'SVG-код' : 'SVG code'}
              </summary>
              <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                {`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n${selectedIcon.svg}\n</svg>`}
              </pre>
            </details>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => downloadSvg(selectedIcon)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {lang === 'ru' ? 'Скачать SVG' : 'Download SVG'}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n${selectedIcon.svg}\n</svg>`)
                  toast({ title: lang === 'ru' ? 'Скопировано!' : 'Copied!' })
                }}
                className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {lang === 'ru' ? 'Копировать' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
