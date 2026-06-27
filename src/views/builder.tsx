'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useBuild } from '@/lib/build-store'
import { useUser } from '@/lib/user-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

export function Builder({ nav }: { nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { user } = useUser()
  const { items, remove, clear } = useBuild()
  const [saving, setSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [packName, setPackName] = useState('my-pack')

  const handleDownload = async () => {
    if (items.length === 0) return

    // Проверяем авторизацию для скачивания
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (user) headers['x-user-email'] = user.email

    const res = await fetch('/api/download/build', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'my-pack',
        items: items.map((i) => ({ iconId: i.iconId })),
      }),
    })

    if (res.status === 403) {
      const data = await res.json()
      toast({ title: data.message || 'Лимит скачиваний' })
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-pack.zip'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: t.toast.downloaded })
  }

  const handleSave = async () => {
    if (!user) {
      toast({ title: lang === 'ru' ? 'Войдите, чтобы сохранить пак' : 'Log in to save pack' })
      nav({ name: 'account' })
      return
    }
    if (items.length === 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          name: packName || 'my-pack',
          items: items.map(i => ({ iconId: i.iconId })),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: t.builder.saved })
        setShowSaveDialog(false)
      } else {
        toast({ title: data.error || t.toast.error })
      }
    } catch {
      toast({ title: t.toast.error })
    }
    setSaving(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.builder.title}</h1>
          <p className="mt-2 text-slate-600">{t.builder.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 rounded-md border border-slate-900 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {t.builder.save}
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

      {/* Диалог сохранения */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {t.builder.save}
            </h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-2">
                {t.builder.saveName}
              </label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                placeholder="my-pack"
              />
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {items.length} {lang === 'ru' ? 'иконок будет сохранено' : 'icons will be saved'}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50"
              >
                {t.customize.reset}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !packName.trim()}
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? '...' : t.builder.save}
              </button>
            </div>
          </div>
        </div>
      )}

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
