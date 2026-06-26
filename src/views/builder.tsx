'use client'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useBuild } from '@/lib/build-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

export function Builder({ nav }: { nav: (v: View) => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const { items, remove, clear } = useBuild()

  const handleDownload = async () => {
    if (items.length === 0) return
    const res = await fetch('/api/download/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'my-pack',
        items: items.map((i) => ({ iconId: i.iconId })),
      }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-pack.zip'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: t.toast.downloaded })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.builder.title}</h1>
          <p className="mt-2 text-slate-600">{t.builder.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-2 text-sm text-slate-600">{items.length} {t.builder.count}</span>
          {items.length > 0 && (
            <>
              <button
                onClick={clear}
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {t.builder.clear}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                {t.builder.download}
              </button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
            <IconView
              innerSvg='<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'
              cfg={{ color: '#94A3B8', strokeWidth: 1.5 }}
              size={32}
            />
          </div>
          <p className="text-slate-600 mb-4">{t.builder.empty}</p>
          <button
            onClick={() => nav({ name: 'catalog' })}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            {t.nav.catalog}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <div key={item.iconId} className="group rounded-xl border border-slate-200 bg-white p-4">
              <div className="aspect-square flex items-center justify-center bg-slate-50 rounded-lg mb-3">
                <IconView innerSvg={item.svg} viewBox={item.viewBox} cfg={{ color: '#0F172A', strokeWidth: 1.75 }} size={32} />
              </div>
              <div className="text-sm font-medium text-slate-900 truncate">{item.name}</div>
              <div className="text-xs text-slate-500 mb-2 truncate">{item.packSlug}</div>
              <button
                onClick={() => remove(item.iconId)}
                className="text-xs text-rose-600 hover:text-rose-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
