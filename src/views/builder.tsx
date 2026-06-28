'use client'
import { useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useBuild } from '@/lib/build-store'
import { useUser } from '@/lib/user-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'
import { CustomConfig, DEFAULT_CONFIG, renderSvg } from '@/lib/svg'

export function Builder({ nav }: { nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { user } = useUser()
  const { items, remove, clear } = useBuild()
  const [saving, setSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [packName, setPackName] = useState('')
  const [cfg, setCfg] = useState<CustomConfig>(DEFAULT_CONFIG)
  const [showCustomizer, setShowCustomizer] = useState(false)

  const handleDownload = async () => {
    if (items.length === 0) return

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (user) headers['x-user-email'] = user.email

    const res = await fetch('/api/download/build', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: packName || 'my-pack',
        items: items.map((i) => ({ iconId: i.iconId })),
      }),
    })

    if (res.status === 403) {
      const data = await res.json()
      toast({ title: data.message || (lang === 'ru' ? 'Лимит скачиваний' : 'Download limit') })
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${packName || 'my-pack'}.zip`
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
    // Показываем диалог для ввода названия
    setPackName('')
    setShowSaveDialog(true)
  }

  const confirmSave = async () => {
    if (!user || items.length === 0) return
    const name = packName.trim() || (lang === 'ru' ? 'Мой пак' : 'My Pack')
    setSaving(true)
    try {
      const res = await fetch('/api/packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          name,
          items: items.map(i => ({ iconId: i.iconId })),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: lang === 'ru' ? 'Пак сохранён в мои паки!' : 'Pack saved to my packs!' })
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
    <div className="container-wide py-10">
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
                onClick={() => setShowCustomizer(!showCustomizer)}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {showCustomizer
                  ? (lang === 'ru' ? 'Скрыть настройки' : 'Hide settings')
                  : (lang === 'ru' ? 'Кастомизировать' : 'Customize')}
              </button>
              <button
                onClick={clear}
                className="px-3 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {t.builder.clear}
              </button>
              <button
                onClick={handleSave}
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

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {lang === 'ru' ? 'Сохранить пак в мои паки' : 'Save pack to my packs'}
            </h3>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              {t.builder.saveName}
            </label>
            <input
              type="text"
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
              placeholder={lang === 'ru' ? 'Мой пак' : 'My Pack'}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSave() }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {saving ? '...' : (lang === 'ru' ? 'Сохранить' : 'Save')}
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customizer panel */}
      {showCustomizer && items.length > 0 && (
        <div className="mb-6 p-5 rounded-xl border border-slate-200 bg-white space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">{lang === 'ru' ? 'Цвет' : 'Color'}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.color}
                  onChange={(e) => setCfg({ ...cfg, color: e.target.value })}
                  className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={cfg.color}
                  onChange={(e) => setCfg({ ...cfg, color: e.target.value })}
                  className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>
            {/* Stroke width */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">{lang === 'ru' ? 'Толщина' : 'Stroke'}: {cfg.strokeWidth}px</label>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.25}
                value={cfg.strokeWidth}
                onChange={(e) => setCfg({ ...cfg, strokeWidth: parseFloat(e.target.value) })}
                className="w-full accent-slate-900"
              />
            </div>
            {/* Size */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">{lang === 'ru' ? 'Размер' : 'Size'}: {cfg.size}px</label>
              <div className="flex gap-1 flex-wrap">
                {[16, 20, 24, 32, 48].map((s) => (
                  <button
                    key={s}
                    onClick={() => setCfg({ ...cfg, size: s })}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${cfg.size === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Background */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">{lang === 'ru' ? 'Фон' : 'Background'}</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setCfg({ ...cfg, background: 'none' })}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${cfg.background === 'none' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >{lang === 'ru' ? 'Нет' : 'None'}</button>
                <button
                  onClick={() => setCfg({ ...cfg, background: 'circle' })}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${cfg.background === 'circle' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >{lang === 'ru' ? 'Круг' : 'Circle'}</button>
                <button
                  onClick={() => setCfg({ ...cfg, background: 'square' })}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${cfg.background === 'square' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >{lang === 'ru' ? 'Квадрат' : 'Square'}</button>
              </div>
              {cfg.background !== 'none' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={cfg.bgColor}
                    onChange={(e) => setCfg({ ...cfg, bgColor: e.target.value })}
                    className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={cfg.bgColor}
                    onChange={(e) => setCfg({ ...cfg, bgColor: e.target.value })}
                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setCfg(DEFAULT_CONFIG)}
            className="text-xs text-slate-500 hover:text-slate-900 underline"
          >
            {lang === 'ru' ? 'Сбросить настройки' : 'Reset settings'}
          </button>
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
            <div key={item.iconId} className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="aspect-square flex items-center justify-center bg-slate-50 rounded-lg mb-3">
                <IconView innerSvg={item.svg} viewBox={item.viewBox} cfg={cfg} size={32} />
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
