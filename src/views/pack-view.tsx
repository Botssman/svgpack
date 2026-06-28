'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useBuild } from '@/lib/build-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

type Icon = { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }
type Pack = {
  id: string; slug: string; nameRu: string; nameEn: string; descRu: string; descEn: string;
  category: string; style: string; tags: string; isFree: boolean; icons: Icon[]
}

export function PackView({ slug, nav }: { slug: string; nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { add, has } = useBuild()
  const [pack, setPack] = useState<Pack | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/packs/${slug}`).then(r => r.json()).then(d => {
      setPack(d.pack)
      setLoading(false)
    })
  }, [slug])

  if (loading) return <div className="container-wide py-20"><div className="h-64 bg-slate-100 animate-pulse rounded-xl" /></div>
  if (!pack) return <div className="container-wide py-20 text-slate-500">404</div>

  const handleDownload = () => {
    window.open(`/api/download/pack?slug=${pack.slug}`, '_blank')
    toast({ title: t.toast.downloaded })
  }

  const handleCopy = (ic: Icon) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${ic.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`
    navigator.clipboard.writeText(svg)
    toast({ title: t.toast.copied })
  }

  const handleDownloadIcon = (ic: Icon) => {
    window.open(`/api/download/icon?id=${ic.id}`, '_blank')
    toast({ title: t.toast.downloaded })
  }

  const handleAdd = (ic: Icon) => {
    add({ iconId: ic.id, slug: ic.slug, name: lang === 'ru' ? ic.nameRu : ic.nameEn, svg: ic.svg, viewBox: ic.viewBox, packSlug: pack.slug })
    toast({ title: t.toast.added })
  }

  return (
    <div className="container-wide py-10">
      <button
        onClick={() => nav({ name: 'catalog' })}
        className="text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        {t.packView.back}
      </button>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {lang === 'ru' ? pack.nameRu : pack.nameEn}
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">{lang === 'ru' ? pack.descRu : pack.descEn}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded-full bg-slate-100">{pack.category}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100">{pack.style}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{pack.icons.length} {t.catalog.iconsCount}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => nav({ name: 'customize', packSlug: pack.slug })}
            className="px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {t.packView.customizePack}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            {t.packView.downloadPack}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {pack.icons.map((ic) => (
          <div key={ic.id} className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="aspect-square flex items-center justify-center bg-slate-50 rounded-lg mb-3 group-hover:bg-slate-100 transition-colors">
              <IconView innerSvg={ic.svg} cfg={{ color: '#0F172A', strokeWidth: 1.75 }} size={40} />
            </div>
            <div className="text-sm font-medium text-slate-900 truncate">{lang === 'ru' ? ic.nameRu : ic.nameEn}</div>
            <div className="text-xs text-slate-500 mb-3">{ic.slug}</div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleCopy(ic)}
                className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {t.packView.copySvg}
              </button>
              <button
                onClick={() => handleDownloadIcon(ic)}
                className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ↓
              </button>
              <button
                onClick={() => handleAdd(ic)}
                disabled={has(ic.id)}
                className="text-xs px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {has(ic.id) ? t.packView.added : `+ ${t.packView.add}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
