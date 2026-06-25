'use client'
import { useEffect, useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { CustomConfig, DEFAULT_CONFIG } from '@/lib/svg'
import { useUser } from '@/lib/user-store'
import { View } from '@/app/page'
import { useToast } from '@/hooks/use-toast'

type Icon = { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }
type Pack = {
  id: string; slug: string; nameRu: string; nameEn: string; descRu: string; descEn: string;
  category: string; style: string; tags: string; isFree: boolean; priceCredits: number; icons: Icon[]
}

const COST = 5 // credits per customization save

export function Customize({ packSlug, iconId, nav }: { packSlug: string; iconId?: string; nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { user, refresh } = useUser()
  const [pack, setPack] = useState<Pack | null>(null)
  const [cfg, setCfg] = useState<CustomConfig>(DEFAULT_CONFIG)
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/packs/${packSlug}`).then(r => r.json()).then(d => {
      setPack(d.pack)
      if (d.pack?.icons?.length) {
        const initial = iconId ? d.pack.icons.find((i: Icon) => i.id === iconId) : d.pack.icons[0]
        setSelectedIcon(initial || null)
      }
      setLoading(false)
    })
  }, [packSlug, iconId])

  const isPaidUser = !!user && (user.credits >= COST || user.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date()))
  const hasActiveSub = !!user?.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date())

  const handlePay = async () => {
    if (!user) {
      toast({ title: t.toast.error, description: 'Login required' })
      nav({ name: 'account' })
      return
    }
    if (!hasActiveSub && user.credits < COST) {
      toast({ title: t.toast.noCredits })
      nav({ name: 'billing' })
      return
    }
    // Списываем кредиты (если нет подписки)
    if (!hasActiveSub) {
      const res = await fetch('/api/billing/onetime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          email: user.email,
          kind: 'icon',
          refId: selectedIcon?.id || pack?.id || 'unknown',
          amount: 0.49,
          creditsCost: COST,
        }),
      })
      if (res.ok) {
        await refresh()
        toast({ title: t.toast.paid })
      }
    } else {
      toast({ title: t.toast.paid })
    }
    // Скачиваем кастомизированный пак/иконку
    if (selectedIcon) {
      window.open(`/api/download/icon?id=${selectedIcon.id}&cfg=${encodeURIComponent(JSON.stringify(cfg))}`, '_blank')
    } else if (pack) {
      window.open(`/api/download/pack?slug=${pack.slug}&cfg=${encodeURIComponent(JSON.stringify(cfg))}`, '_blank')
    }
  }

  const handleDownloadFree = () => {
    // Бесплатно — только скачивание исходника без кастомизации
    if (selectedIcon) {
      window.open(`/api/download/icon?id=${selectedIcon.id}`, '_blank')
    } else if (pack) {
      window.open(`/api/download/pack?slug=${pack.slug}`, '_blank')
    }
    toast({ title: t.toast.downloaded })
  }

  const previewIcons = useMemo(() => pack?.icons.slice(0, 6) || [], [pack])

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20"><div className="h-96 bg-slate-100 animate-pulse rounded-xl" /></div>
  if (!pack) return <div className="max-w-7xl mx-auto px-4 py-20 text-slate-500">404</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => nav({ name: 'pack', slug: pack.slug })} className="text-sm text-slate-600 hover:text-slate-900 mb-6">
        {t.packView.back}
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.customize.title}</h1>
        <p className="mt-2 text-slate-600">{t.customize.subtitle} · {lang === 'ru' ? pack.nameRu : pack.nameEn}</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Controls */}
        <div className="space-y-5 p-5 rounded-xl border border-slate-200 bg-white">
          {/* Mode */}
          <Field label={t.customize.mode}>
            <div className="flex gap-2">
              <Toggle active={cfg.mode === 'mono'} onClick={() => setCfg({ ...cfg, mode: 'mono' })}>
                {t.customize.modeMono}
              </Toggle>
              <Toggle active={cfg.mode === 'duotone'} onClick={() => setCfg({ ...cfg, mode: 'duotone' })}>
                {t.customize.modeDuotone}
              </Toggle>
            </div>
          </Field>

          {/* Color */}
          <Field label={t.customize.color}>
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
                className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
              />
            </div>
          </Field>

          {cfg.mode === 'duotone' && (
            <Field label={t.customize.color2}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.color2}
                  onChange={(e) => setCfg({ ...cfg, color2: e.target.value })}
                  className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={cfg.color2}
                  onChange={(e) => setCfg({ ...cfg, color2: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                />
              </div>
            </Field>
          )}

          {/* Stroke width */}
          <Field label={`${t.customize.strokeWidth}: ${cfg.strokeWidth}px`}>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.25}
              value={cfg.strokeWidth}
              onChange={(e) => setCfg({ ...cfg, strokeWidth: parseFloat(e.target.value) })}
              className="w-full accent-slate-900"
            />
          </Field>

          {/* Size */}
          <Field label={`${t.customize.size}: ${cfg.size}px`}>
            <div className="flex gap-2 flex-wrap">
              {[16, 20, 24, 32, 48, 64].map((s) => (
                <Toggle key={s} active={cfg.size === s} onClick={() => setCfg({ ...cfg, size: s })}>
                  {s}
                </Toggle>
              ))}
            </div>
          </Field>

          {/* Background */}
          <Field label={t.customize.background}>
            <div className="flex gap-2">
              <Toggle active={cfg.background === 'none'} onClick={() => setCfg({ ...cfg, background: 'none' })}>
                {t.customize.bgNone}
              </Toggle>
              <Toggle active={cfg.background === 'circle'} onClick={() => setCfg({ ...cfg, background: 'circle' })}>
                {t.customize.bgCircle}
              </Toggle>
              <Toggle active={cfg.background === 'square'} onClick={() => setCfg({ ...cfg, background: 'square' })}>
                {t.customize.bgSquare}
              </Toggle>
            </div>
          </Field>

          {cfg.background !== 'none' && (
            <Field label={t.customize.bgColor}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.bgColor}
                  onChange={(e) => setCfg({ ...cfg, bgColor: e.target.value })}
                  className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={cfg.bgColor}
                  onChange={(e) => setCfg({ ...cfg, bgColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                />
              </div>
            </Field>
          )}

          {/* Rotation */}
          <Field label={`${t.customize.rotation}: ${cfg.rotation}°`}>
            <div className="flex gap-2">
              {[0, 45, 90, 180, 270].map((r) => (
                <Toggle key={r} active={cfg.rotation === r} onClick={() => setCfg({ ...cfg, rotation: r })}>
                  {r}°
                </Toggle>
              ))}
            </div>
          </Field>

          <button
            onClick={() => setCfg(DEFAULT_CONFIG)}
            className="text-xs text-slate-500 hover:text-slate-900 underline"
          >
            {t.customize.reset}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-5">
          {/* Big preview */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
              {selectedIcon && (
                <IconView
                  innerSvg={selectedIcon.svg}
                  viewBox={selectedIcon.viewBox}
                  cfg={cfg}
                  size={Math.min(128, cfg.size * 4)}
                />
              )}
            </div>
            <div className="mt-4 text-sm text-slate-600">
              {t.customize.preview}: <span className="font-mono text-slate-900">{selectedIcon?.slug}</span>
            </div>
          </div>

          {/* Preview grid of all icons in pack */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-slate-900 mb-3">{t.customize.applyToPack} ({previewIcons.length})</h3>
            <div className="grid grid-cols-6 gap-3">
              {previewIcons.map((ic) => (
                <button
                  key={ic.id}
                  onClick={() => setSelectedIcon(ic)}
                  className={`aspect-square flex items-center justify-center rounded-md border transition-all ${
                    selectedIcon?.id === ic.id ? 'border-slate-900 bg-slate-100' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={cfg} size={28} />
                </button>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.customize.cost}</span>
              <span className="font-medium text-slate-900">
                {hasActiveSub ? t.customize.free : `${COST} ${t.customize.credits}`}
              </span>
            </div>
            {!hasActiveSub && !isPaidUser && user && (
              <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
                {t.customize.needPay}. {user.credits}/{COST} {t.customize.credits}
              </div>
            )}
            {!user && (
              <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md">
                <button onClick={() => nav({ name: 'account' })} className="underline">{t.common.login}</button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handlePay}
                disabled={!selectedIcon}
                className="flex-1 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {t.customize.pay}
              </button>
              <button
                onClick={handleDownloadFree}
                className="px-4 py-2.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {t.customize.free}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-2">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
