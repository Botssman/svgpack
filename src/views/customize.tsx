'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { CustomConfig, DEFAULT_CONFIG } from '@/lib/svg'
import { useUser } from '@/lib/user-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

type Icon = { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }
type Pack = {
  id: string; slug: string; nameRu: string; nameEn: string; descRu: string; descEn: string;
  category: string; style: string; tags: string; isFree: boolean; priceCredits: number; icons: Icon[]
}

const COST = 5 // credits per customization save

type ScopeMode = 'all' | 'single' | 'multi'

export function Customize({ packSlug, iconId, nav }: { packSlug: string; iconId?: string; nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { user, refresh } = useUser()
  const [pack, setPack] = useState<Pack | null>(null)
  const [baseCfg, setBaseCfg] = useState<CustomConfig>(DEFAULT_CONFIG)
  // Per-icon overrides (for "single" and "multi" modes)
  const [overrides, setOverrides] = useState<Record<string, CustomConfig>>({})
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all')
  const [editingId, setEditingId] = useState<string | null>(null)        // for "single"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()) // for "multi"
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/packs/${packSlug}`).then(r => r.json()).then(d => {
      setPack(d.pack)
      if (d.pack?.icons?.length) {
        const initial = iconId ? d.pack.icons.find((i: Icon) => i.id === iconId) : d.pack.icons[0]
        if (initial) setEditingId(initial.id)
      }
      setLoading(false)
    })
  }, [packSlug, iconId])

  const isPaidUser = !!user && (user.credits >= COST || user.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date()))
  const hasActiveSub = !!user?.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date())

  // Effective cfg for an icon: override if exists, else baseCfg
  const cfgFor = useCallback((icId: string) => overrides[icId] ?? baseCfg, [overrides, baseCfg])

  // The cfg editor binds to:
  //   all    → baseCfg
  //   single → overrides[editingId] (or baseCfg if no icon selected)
  //   multi  → a "draft" cfg that, on change, writes to all selectedIds' overrides
  const editorCfg: CustomConfig = useMemo(() => {
    if (scopeMode === 'single' && editingId) {
      return overrides[editingId] ?? baseCfg
    }
    return baseCfg
  }, [scopeMode, editingId, overrides, baseCfg])

  const setEditorCfg = (next: CustomConfig) => {
    if (scopeMode === 'all') {
      setBaseCfg(next)
    } else if (scopeMode === 'single' && editingId) {
      setOverrides(prev => ({ ...prev, [editingId]: next }))
    } else if (scopeMode === 'multi' && selectedIds.size > 0) {
      setOverrides(prev => {
        const cp = { ...prev }
        for (const id of selectedIds) cp[id] = { ...next }
        return cp
      })
    } else {
      // multi with no selection → edit baseCfg as a preview-only convenience
      setBaseCfg(next)
    }
  }

  const updateField = <K extends keyof CustomConfig>(key: K, value: CustomConfig[K]) => {
    setEditorCfg({ ...editorCfg, [key]: value })
  }

  const handleIconClick = (ic: Icon) => {
    if (scopeMode === 'single') {
      setEditingId(ic.id)
      // Initialize override as a clone of baseCfg on first click
      if (!overrides[ic.id]) {
        setOverrides(prev => ({ ...prev, [ic.id]: { ...baseCfg } }))
      }
    } else if (scopeMode === 'multi') {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(ic.id)) next.delete(ic.id)
        else next.add(ic.id)
        return next
      })
    } else {
      // 'all' mode — just preview the clicked icon
      setEditingId(ic.id)
    }
  }

  const resetAll = () => {
    setOverrides({})
    setSelectedIds(new Set())
    setBaseCfg(DEFAULT_CONFIG)
    toast({ title: t.customize.reset })
  }

  const buildCfgMap = (): Record<string, CustomConfig> | undefined => {
    if (Object.keys(overrides).length === 0) return undefined
    return overrides
  }

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
    if (!hasActiveSub) {
      const res = await fetch('/api/billing/onetime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          email: user.email,
          kind: 'icon',
          refId: editingId || pack?.id || 'unknown',
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
    // Build download URL with per-icon overrides if any
    const cfgMap = buildCfgMap()
    if (cfgMap) {
      const params = new URLSearchParams({ slug: pack!.slug, cfgMap: JSON.stringify(cfgMap) })
      window.open(`/api/download/pack?${params.toString()}`, '_blank')
    } else {
      // All-mode: single cfg applies to whole pack
      const params = new URLSearchParams({ slug: pack!.slug, cfg: JSON.stringify(baseCfg) })
      window.open(`/api/download/pack?${params.toString()}`, '_blank')
    }
  }

  const handleDownloadFree = () => {
    // Free download = raw icons, no customization
    window.open(`/api/download/pack?slug=${pack!.slug}`, '_blank')
    toast({ title: t.toast.downloaded })
  }

  // Preview icon = editingId icon (in single/all) or first selected (in multi)
  const previewIcon: Icon | null = useMemo(() => {
    if (!pack) return null
    if (scopeMode === 'multi') {
      const firstSelectedId = Array.from(selectedIds)[0]
      return pack.icons.find(i => i.id === firstSelectedId) ?? pack.icons[0]
    }
    return pack.icons.find(i => i.id === editingId) ?? pack.icons[0]
  }, [pack, scopeMode, selectedIds, editingId])

  // Grid icons shown — full pack in single/multi, first 12 in all
  const gridIcons = useMemo(() => {
    if (!pack) return []
    if (scopeMode === 'all') return pack.icons.slice(0, 12)
    return pack.icons
  }, [pack, scopeMode])

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20"><div className="h-96 bg-slate-100 animate-pulse rounded-xl" /></div>
  if (!pack) return <div className="max-w-7xl mx-auto px-4 py-20 text-slate-500">404</div>

  const editedCount = Object.keys(overrides).length
  const hint = scopeMode === 'all' ? t.customize.scopeAllHint
    : scopeMode === 'single' ? t.customize.scopeSingleHint
    : t.customize.scopeMultiHint

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => nav({ name: 'pack', slug: pack.slug })} className="text-sm text-slate-600 hover:text-slate-900 mb-6">
        {t.packView.back}
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.customize.title}</h1>
        <p className="mt-2 text-slate-600">{t.customize.subtitle} · {lang === 'ru' ? pack.nameRu : pack.nameEn}</p>
      </div>

      {/* SCOPE MODE SELECTOR */}
      <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700 mr-2">{t.customize.scopeMode}:</span>
            <Toggle active={scopeMode === 'all'} onClick={() => setScopeMode('all')}>{t.customize.scopeAll}</Toggle>
            <Toggle active={scopeMode === 'single'} onClick={() => setScopeMode('single')}>{t.customize.scopeSingle}</Toggle>
            <Toggle active={scopeMode === 'multi'} onClick={() => setScopeMode('multi')}>{t.customize.scopeMulti}</Toggle>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {scopeMode === 'multi' && (
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">
                {selectedIds.size} {t.customize.selected}
              </span>
            )}
            {editedCount > 0 && (
              <>
                <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">
                  {editedCount} {t.customize.edited}
                </span>
                <button onClick={resetAll} className="underline hover:text-slate-900">{t.customize.resetAll}</button>
              </>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{hint}</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Controls */}
        <div className="space-y-5 p-5 rounded-xl border border-slate-200 bg-white">
          {/* Mode */}
          <Field label={t.customize.mode}>
            <div className="flex gap-2">
              <Toggle active={editorCfg.mode === 'mono'} onClick={() => updateField('mode', 'mono')}>
                {t.customize.modeMono}
              </Toggle>
              <Toggle active={editorCfg.mode === 'duotone'} onClick={() => updateField('mode', 'duotone')}>
                {t.customize.modeDuotone}
              </Toggle>
            </div>
          </Field>

          {/* Color */}
          <Field label={t.customize.color}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editorCfg.color}
                onChange={(e) => updateField('color', e.target.value)}
                className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={editorCfg.color}
                onChange={(e) => updateField('color', e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
              />
            </div>
          </Field>

          {editorCfg.mode === 'duotone' && (
            <Field label={t.customize.color2}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editorCfg.color2}
                  onChange={(e) => updateField('color2', e.target.value)}
                  className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={editorCfg.color2}
                  onChange={(e) => updateField('color2', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                />
              </div>
            </Field>
          )}

          {/* Stroke width */}
          <Field label={`${t.customize.strokeWidth}: ${editorCfg.strokeWidth}px`}>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.25}
              value={editorCfg.strokeWidth}
              onChange={(e) => updateField('strokeWidth', parseFloat(e.target.value))}
              className="w-full accent-slate-900"
            />
          </Field>

          {/* Size */}
          <Field label={`${t.customize.size}: ${editorCfg.size}px`}>
            <div className="flex gap-2 flex-wrap">
              {[16, 20, 24, 32, 48, 64].map((s) => (
                <Toggle key={s} active={editorCfg.size === s} onClick={() => updateField('size', s)}>
                  {s}
                </Toggle>
              ))}
            </div>
          </Field>

          {/* Background */}
          <Field label={t.customize.background}>
            <div className="flex gap-2">
              <Toggle active={editorCfg.background === 'none'} onClick={() => updateField('background', 'none')}>
                {t.customize.bgNone}
              </Toggle>
              <Toggle active={editorCfg.background === 'circle'} onClick={() => updateField('background', 'circle')}>
                {t.customize.bgCircle}
              </Toggle>
              <Toggle active={editorCfg.background === 'square'} onClick={() => updateField('background', 'square')}>
                {t.customize.bgSquare}
              </Toggle>
            </div>
          </Field>

          {editorCfg.background !== 'none' && (
            <Field label={t.customize.bgColor}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editorCfg.bgColor}
                  onChange={(e) => updateField('bgColor', e.target.value)}
                  className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={editorCfg.bgColor}
                  onChange={(e) => updateField('bgColor', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                />
              </div>
            </Field>
          )}

          {/* Rotation */}
          <Field label={`${t.customize.rotation}: ${editorCfg.rotation}°`}>
            <div className="flex gap-2">
              {[0, 45, 90, 180, 270].map((r) => (
                <Toggle key={r} active={editorCfg.rotation === r} onClick={() => updateField('rotation', r)}>
                  {r}°
                </Toggle>
              ))}
            </div>
          </Field>

          <button
            onClick={() => setEditorCfg({ ...DEFAULT_CONFIG })}
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
              {previewIcon && (
                <IconView
                  innerSvg={previewIcon.svg}
                  viewBox={previewIcon.viewBox}
                  cfg={cfgFor(previewIcon.id)}
                  size={Math.min(128, editorCfg.size * 4)}
                />
              )}
            </div>
            <div className="mt-4 text-sm text-slate-600">
              {t.customize.preview}: <span className="font-mono text-slate-900">{previewIcon?.slug}</span>
              {scopeMode === 'multi' && selectedIds.size > 1 && (
                <span className="ml-2 text-xs text-slate-500">+{selectedIds.size - 1} more</span>
              )}
            </div>
          </div>

          {/* Grid of icons */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-900">
                {scopeMode === 'all' ? t.customize.applyToPack : pack.nameEn}
                <span className="ml-2 text-xs text-slate-500">({gridIcons.length})</span>
              </h3>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {gridIcons.map((ic) => {
                const isEditing = scopeMode !== 'multi' && editingId === ic.id
                const isSelected = selectedIds.has(ic.id)
                const isOverridden = !!overrides[ic.id]
                return (
                  <button
                    key={ic.id}
                    onClick={() => handleIconClick(ic)}
                    title={ic.slug}
                    className={`relative aspect-square flex items-center justify-center rounded-md border transition-all ${
                      isEditing || isSelected
                        ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-900'
                        : isOverridden
                        ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={cfgFor(ic.id)} size={24} />
                    {/* Override badge */}
                    {isOverridden && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                    )}
                    {/* Selected checkmark */}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
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
                disabled={!previewIcon}
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
