'use client'
import { useEffect, useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { View } from '@/app/page'
import { useToast } from '@/hooks/use-toast'

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

  useEffect(() => {
    let cancelled = false
    const url = `/api/packs?category=${category}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    fetch(url).then(r => r.json()).then(d => {
      if (cancelled) return
      setPacks(d.packs || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [category, q])

  const totalIcons = useMemo(() => packs.reduce((s, p) => s + p.icons.length, 0), [packs])

  const categories = [
    { id: 'all', label: t.catalog.filterAll },
    { id: 'languages', label: t.catalog.filterLanguages },
    { id: 'frameworks', label: t.catalog.filterFrameworks },
    { id: 'tools', label: t.catalog.filterTools },
    { id: 'concepts', label: t.catalog.filterConcepts },
  ]

  const handleDownload = (slug: string) => {
    window.open(`/api/download/pack?slug=${slug}`, '_blank')
    toast({ title: t.toast.downloaded })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.catalog.title}</h1>
        <p className="mt-2 text-slate-600">{t.catalog.subtitle}</p>
      </div>

      {/* Search + filters */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.catalog.searchPlaceholder}
          className="w-full px-4 py-2.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === c.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">
          {loading ? '...' : `${packs.length} · ${totalIcons} ${t.catalog.iconsCount}`}
        </div>
      </div>

      {/* Packs grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          {t.catalog.noResults}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {packs.map((pack) => (
            <div key={pack.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors">
              {/* Icon preview grid */}
              <button
                onClick={() => nav({ name: 'pack', slug: pack.slug })}
                className="w-full p-5 grid grid-cols-6 gap-2 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                {pack.icons.slice(0, 12).map((ic) => (
                  <div key={ic.id} className="aspect-square flex items-center justify-center rounded-md bg-white border border-slate-100">
                    <IconView innerSvg={ic.svg} cfg={{ color: '#0F172A', strokeWidth: 1.5 }} size={20} />
                  </div>
                ))}
              </button>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{lang === 'ru' ? pack.nameRu : pack.nameEn}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">{pack.category} · {pack.style}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    {pack.icons.length} {t.catalog.iconsCount}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {lang === 'ru' ? pack.descRu : pack.descEn}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => nav({ name: 'pack', slug: pack.slug })}
                    className="flex-1 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    {t.catalog.viewPack}
                  </button>
                  <button
                    onClick={() => handleDownload(pack.slug)}
                    className="px-3 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
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
