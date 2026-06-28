'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { CustomConfig, DEFAULT_CONFIG, renderSvg, StrokeStyle, LineCap, LineJoin, BgShape, ShadowType, AnimType, EasingType, ExportFormat } from '@/lib/svg'
import { useUser } from '@/lib/user-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

type Icon = { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }
type Pack = {
  id: string; slug: string; nameRu: string; nameEn: string; descRu: string; descEn: string;
  category: string; style: string; tags: string; isFree: boolean; priceCredits: number; icons: Icon[]
}

type UserPalette = {
  id: string
  nameRu: string
  nameEn: string
  color1: string
  color2: string
  bgColor1: string
  bgColor2: string
  isGradient: boolean
  isBgGradient: boolean
  gradientAngle: number
  mode: string
}

const COST = 5 // credits per customization save

type ScopeMode = 'all' | 'single' | 'multi'
type ControlTab = 'style' | 'animation'

// Built-in palettes
const BUILTIN_PALETTES = [
  { nameRu: 'Тёмный', nameEn: 'Dark', color1: '#0F172A', color2: '#F8FAFC', bgColor1: '#F8FAFC', bgColor2: '#F8FAFC', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
  { nameRu: 'Неон', nameEn: 'Neon', color1: '#A855F7', color2: '#1E1B4B', bgColor1: '#1E1B4B', bgColor2: '#0F0720', isGradient: true, isBgGradient: true, gradientAngle: 135, mode: 'duotone' },
  { nameRu: 'Закат', nameEn: 'Sunset', color1: '#F97316', color2: '#FFF7ED', bgColor1: '#FFF7ED', bgColor2: '#FED7AA', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
  { nameRu: 'Пастель', nameEn: 'Pastel', color1: '#818CF8', color2: '#F5F3FF', bgColor1: '#F5F3FF', bgColor2: '#E0E7FF', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
  { nameRu: 'Лес', nameEn: 'Forest', color1: '#059669', color2: '#ECFDF5', bgColor1: '#ECFDF5', bgColor2: '#A7F3D0', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
  { nameRu: 'Океан', nameEn: 'Ocean', color1: '#0284C7', color2: '#F0F9FF', bgColor1: '#F0F9FF', bgColor2: '#BAE6FD', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
  { nameRu: 'Вишня', nameEn: 'Cherry', color1: '#E11D48', color2: '#FFF1F2', bgColor1: '#FFF1F2', bgColor2: '#FECDD3', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
  { nameRu: 'Моно', nameEn: 'Mono', color1: '#18181B', color2: '#FAFAFA', bgColor1: '#FAFAFA', bgColor2: '#E4E4E7', isGradient: false, isBgGradient: false, gradientAngle: 135, mode: 'mono' },
]

// Animation type labels with icons
const ANIM_TYPES: { value: AnimType; labelRu: string; labelEn: string; icon: string }[] = [
  { value: 'none', labelRu: 'Нет', labelEn: 'None', icon: '⊘' },
  { value: 'spin', labelRu: 'Spin', labelEn: 'Spin', icon: '↻' },
  { value: 'pulse', labelRu: 'Pulse', labelEn: 'Pulse', icon: '◉' },
  { value: 'bounce', labelRu: 'Bounce', labelEn: 'Bounce', icon: '⇵' },
  { value: 'shake', labelRu: 'Shake', labelEn: 'Shake', icon: '≋' },
  { value: 'wobble', labelRu: 'Wobble', labelEn: 'Wobble', icon: '⟳' },
  { value: 'swing', labelRu: 'Swing', labelEn: 'Swing', icon: '⤴' },
  { value: 'fade', labelRu: 'Fade', labelEn: 'Fade', icon: '◐' },
  { value: 'float', labelRu: 'Float', labelEn: 'Float', icon: '↑' },
  { value: 'blink', labelRu: 'Blink', labelEn: 'Blink', icon: '⏻' },
  { value: 'slide', labelRu: 'Slide', labelEn: 'Slide', icon: '→' },
]

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
  const [saving, setSaving] = useState(false)
  const [controlTab, setControlTab] = useState<ControlTab>('style')

  // User palettes
  const [userPalettes, setUserPalettes] = useState<UserPalette[]>([])
  const [showPaletteDialog, setShowPaletteDialog] = useState(false)
  const [paletteForm, setPaletteForm] = useState({
    nameRu: '',
    nameEn: '',
    color1: '#0F172A',
    color2: '#38BDF8',
    bgColor1: '#F1F5F9',
    bgColor2: '#CBD5E1',
    isGradient: false,
    isBgGradient: false,
    gradientAngle: 135,
    mode: 'mono' as 'mono' | 'duotone',
  })

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

  // Fetch user palettes
  useEffect(() => {
    if (!user) return
    fetch('/api/palettes', {
      headers: { 'x-user-email': user.email },
    })
      .then(r => r.json())
      .then(d => setUserPalettes(d.palettes || []))
      .catch(() => {})
  }, [user])

  const isPaidUser = !!user && (user.credits >= COST || user.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date()))
  const hasActiveSub = !!user?.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date())

  // Effective cfg for an icon: override if exists, else baseCfg
  const cfgFor = useCallback((icId: string) => overrides[icId] ?? baseCfg, [overrides, baseCfg])

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
      setBaseCfg(next)
    }
  }

  const updateField = <K extends keyof CustomConfig>(key: K, value: CustomConfig[K]) => {
    setEditorCfg({ ...editorCfg, [key]: value })
  }

  // Apply a palette to the config
  const applyPalette = (p: typeof BUILTIN_PALETTES[0] | UserPalette) => {
    const next: CustomConfig = {
      ...editorCfg,
      color: p.color1,
      color2: p.color2,
      bgColor: p.bgColor1,
      mode: (p.mode as 'mono' | 'duotone') || 'mono',
      colorGradient: p.isGradient,
      bgGradient: p.isBgGradient,
      gradientAngle: p.gradientAngle || 135,
      bgGradientAngle: p.gradientAngle || 135,
      colorGradientStops: p.isGradient
        ? [{ offset: 0, color: p.color1 }, { offset: 100, color: p.color2 }]
        : editorCfg.colorGradientStops,
      bgGradientStops: p.isBgGradient
        ? [{ offset: 0, color: p.bgColor1 }, { offset: 100, color: p.bgColor2 }]
        : editorCfg.bgGradientStops,
    }
    setEditorCfg(next)
  }

  // Save user palette
  const handleSavePalette = async () => {
    if (!user) {
      toast({ title: lang === 'ru' ? 'Войдите, чтобы сохранить палитру' : 'Log in to save palette' })
      nav({ name: 'account' })
      return
    }
    try {
      const res = await fetch('/api/palettes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify(paletteForm),
      })
      const data = await res.json()
      if (data.ok) {
        setUserPalettes(prev => [data.palette, ...prev])
        setShowPaletteDialog(false)
        toast({ title: lang === 'ru' ? 'Палитра сохранена!' : 'Palette saved!' })
        // Reset form
        setPaletteForm({
          nameRu: '', nameEn: '', color1: '#0F172A', color2: '#38BDF8',
          bgColor1: '#F1F5F9', bgColor2: '#CBD5E1', isGradient: false,
          isBgGradient: false, gradientAngle: 135, mode: 'mono',
        })
      } else {
        toast({ title: data.error || t.toast.error })
      }
    } catch {
      toast({ title: t.toast.error })
    }
  }

  // Delete user palette
  const handleDeletePalette = async (id: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/palettes/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': user.email },
      })
      if (res.ok) {
        setUserPalettes(prev => prev.filter(p => p.id !== id))
        toast({ title: lang === 'ru' ? 'Палитра удалена' : 'Palette deleted' })
      }
    } catch {}
  }

  const handleIconClick = (ic: Icon) => {
    if (scopeMode === 'single') {
      setEditingId(ic.id)
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

  // Автоматическое сохранение пака в ЛК при оплате
  const savePackToAccount = async () => {
    if (!user || !pack) return
    try {
      const items = pack.icons.map(ic => ({
        iconId: ic.id,
        cfg: overrides[ic.id] ?? baseCfg,
      }))
      await fetch('/api/packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          name: (lang === 'ru' ? pack.nameRu : pack.nameEn) + ' (custom)',
          items,
        }),
      })
    } catch {}
  }

  // Скачать пак с кастомизацией через POST (конфиг в теле, не в URL)
  const downloadCustomizedPack = async () => {
    if (!pack) return
    const cfgMap = buildCfgMap()
    try {
      const res = await fetch('/api/download/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: pack.slug,
          cfg: cfgMap ? undefined : baseCfg,
          cfgMap: cfgMap ?? undefined,
        }),
      })
      if (!res.ok) {
        toast({ title: t.toast.error })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pack.slug}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: t.toast.error })
    }
  }

  const handlePay = async () => {
    if (!user) {
      toast({ title: t.toast.error, description: lang === 'ru' ? 'Войдите в аккаунт' : 'Login required' })
      nav({ name: 'account' })
      return
    }
    if (!pack) return

    setSaving(true)
    try {
      if (!hasActiveSub) {
        if (user.credits < COST) {
          toast({ title: t.toast.noCredits })
          nav({ name: 'billing' })
          return
        }
        const res = await fetch('/api/billing/onetime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
          body: JSON.stringify({
            email: user.email,
            kind: 'icon',
            refId: editingId || pack.id || 'unknown',
            amount: 0.49,
            creditsCost: COST,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast({ title: data.error || t.toast.error })
          return
        }
        await refresh()
      }

      // Сохраняем пак в ЛК
      await savePackToAccount()

      // Скачиваем с кастомизацией
      await downloadCustomizedPack()

      toast({ title: t.toast.paid })
    } catch (e) {
      console.error('handlePay error:', e)
      toast({ title: t.toast.error })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadFree = async () => {
    await downloadCustomizedPack()
    toast({ title: t.toast.downloaded })
  }

  const handleSave = async () => {
    if (!user) {
      toast({ title: t.toast.error, description: 'Login required' })
      nav({ name: 'account' })
      return
    }
    if (!pack) return

    setSaving(true)
    try {
      const items = pack.icons.map(ic => ({
        iconId: ic.id,
        cfg: overrides[ic.id] ?? baseCfg,
      }))

      const res = await fetch('/api/packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          name: (lang === 'ru' ? pack.nameRu : pack.nameEn) + ' (custom)',
          items,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: lang === 'ru' ? 'Пак сохранён в мои паки!' : 'Pack saved to my packs!' })
      } else {
        toast({ title: data.error || t.toast.error })
      }
    } catch {
      toast({ title: t.toast.error })
    }
    setSaving(false)
  }

  const previewIcon: Icon | null = useMemo(() => {
    if (!pack) return null
    if (scopeMode === 'multi') {
      const firstSelectedId = Array.from(selectedIds)[0]
      return pack.icons.find(i => i.id === firstSelectedId) ?? pack.icons[0]
    }
    return pack.icons.find(i => i.id === editingId) ?? pack.icons[0]
  }, [pack, scopeMode, selectedIds, editingId])

  const gridIcons = useMemo(() => {
    if (!pack) return []
    if (scopeMode === 'all') return pack.icons.slice(0, 12)
    return pack.icons
  }, [pack, scopeMode])

  if (loading) return <div className="container-wide py-20"><div className="h-96 bg-slate-100 animate-pulse rounded-xl" /></div>
  if (!pack) return <div className="container-wide py-20 text-slate-500">404</div>

  const editedCount = Object.keys(overrides).length
  const hint = scopeMode === 'all' ? t.customize.scopeAllHint
    : scopeMode === 'single' ? t.customize.scopeSingleHint
    : t.customize.scopeMultiHint

  // Generate preview swatch for a palette
  const paletteSwatchStyle = (p: typeof BUILTIN_PALETTES[0] | UserPalette) => {
    if (p.isGradient) {
      return { background: `linear-gradient(${p.gradientAngle || 135}deg, ${p.color1} 50%, ${p.color2} 50%)` }
    }
    return { background: p.color1 }
  }

  return (
    <div className="container-wide py-10">
      <button onClick={() => nav({ name: 'pack', slug: pack.slug })} className="text-sm text-slate-600 hover:text-slate-900 mb-6">
        {t.packView.back}
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.customize.title}</h1>
        <p className="mt-2 text-slate-600">{t.customize.subtitle} · {lang === 'ru' ? pack.nameRu : pack.nameEn}</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Controls */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          {/* Tab system */}
          <div className="flex gap-6 mb-5 border-b border-slate-200">
            <button
              onClick={() => setControlTab('style')}
              className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                controlTab === 'style'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {lang === 'ru' ? 'Стиль' : 'Style'}
            </button>
            <button
              onClick={() => setControlTab('animation')}
              className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                controlTab === 'animation'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {lang === 'ru' ? 'Анимация' : 'Animation'}
            </button>
          </div>

          {/* ============ STYLE TAB ============ */}
          {controlTab === 'style' && (
            <div className="space-y-5">
              {/* PALETTE */}
              <Field label={lang === 'ru' ? 'Палитра' : 'Palette'}>
                <div className="space-y-3">
                  {/* Built-in palettes */}
                  <div className="flex gap-2 flex-wrap">
                    {BUILTIN_PALETTES.map((p, i) => (
                      <button
                        key={i}
                        title={lang === 'ru' ? p.nameRu : p.nameEn}
                        onClick={() => applyPalette(p)}
                        className="cursor-pointer w-8 h-8 rounded-lg border-2 border-slate-200 hover:border-slate-400 transition-colors"
                        style={paletteSwatchStyle(p)}
                      />
                    ))}
                  </div>
                  {/* User palettes */}
                  {userPalettes.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {userPalettes.map(p => (
                        <div key={p.id} className="relative group">
                          <button
                            title={lang === 'ru' ? p.nameRu : p.nameEn}
                            onClick={() => applyPalette(p)}
                            className="cursor-pointer w-8 h-8 rounded-lg border-2 border-blue-300 hover:border-blue-500 transition-colors ring-1 ring-blue-100"
                            style={paletteSwatchStyle(p)}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePalette(p.id) }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Create new palette button */}
                  {user && (
                    <button
                      onClick={() => setShowPaletteDialog(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {lang === 'ru' ? '+ Создать свою палитру' : '+ Create custom palette'}
                    </button>
                  )}
                </div>
              </Field>

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

              {/* Цвет / Color */}
              <Field label={lang === 'ru' ? 'Цвет' : 'Color'}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editorCfg.color}
                      onChange={(e) => {
                        const newColor = e.target.value
                        if (editorCfg.colorGradient && editorCfg.colorGradientStops.length > 0) {
                          const newStops = [...editorCfg.colorGradientStops]
                          newStops[0] = { ...newStops[0], color: newColor }
                          setEditorCfg({ ...editorCfg, color: newColor, colorGradientStops: newStops })
                        } else {
                          updateField('color', newColor)
                        }
                      }}
                      className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editorCfg.color}
                      onChange={(e) => {
                        const newColor = e.target.value
                        if (editorCfg.colorGradient && editorCfg.colorGradientStops.length > 0) {
                          const newStops = [...editorCfg.colorGradientStops]
                          newStops[0] = { ...newStops[0], color: newColor }
                          setEditorCfg({ ...editorCfg, color: newColor, colorGradientStops: newStops })
                        } else {
                          updateField('color', newColor)
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                    />
                    <Toggle active={editorCfg.colorGradient} onClick={() => updateField('colorGradient', !editorCfg.colorGradient)}>
                      {lang === 'ru' ? 'Градиент' : 'Gradient'}
                    </Toggle>
                  </div>
                  {editorCfg.colorGradient && (
                    <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                      {/* Gradient stops editor */}
                      {editorCfg.colorGradientStops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-3">{idx + 1}</span>
                          <input
                            type="color"
                            value={stop.color}
                            onChange={(e) => {
                              const newStops = [...editorCfg.colorGradientStops]
                              newStops[idx] = { ...newStops[idx], color: e.target.value }
                              updateField('colorGradientStops', newStops)
                            }}
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                          />
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={stop.offset}
                            onChange={(e) => {
                              const newStops = [...editorCfg.colorGradientStops]
                              newStops[idx] = { ...newStops[idx], offset: parseInt(e.target.value) }
                              updateField('colorGradientStops', newStops)
                            }}
                            className="flex-1 accent-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 w-7">{stop.offset}%</span>
                          {editorCfg.colorGradientStops.length > 2 && idx > 0 && idx < editorCfg.colorGradientStops.length - 1 && (
                            <button
                              onClick={() => {
                                const newStops = editorCfg.colorGradientStops.filter((_, i) => i !== idx)
                                updateField('colorGradientStops', newStops)
                              }}
                              className="text-rose-400 hover:text-rose-600 text-xs leading-none"
                            >×</button>
                          )}
                        </div>
                      ))}
                      {editorCfg.colorGradientStops.length < 6 && (
                        <button
                          onClick={() => {
                            const stops = editorCfg.colorGradientStops
                            // Insert a new stop at 50% between last two
                            const lastOffset = stops[stops.length - 1]?.offset ?? 100
                            const prevOffset = stops.length >= 2 ? stops[stops.length - 2]?.offset ?? 0 : 0
                            const midOffset = Math.round((lastOffset + prevOffset) / 2)
                            const newStops = [...stops, { offset: midOffset, color: '#94A3B8' }].sort((a, b) => a.offset - b.offset)
                            updateField('colorGradientStops', newStops)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          + {lang === 'ru' ? 'Добавить точку' : 'Add stop'}
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">{lang === 'ru' ? 'Угол' : 'Angle'}</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={15}
                          value={editorCfg.gradientAngle}
                          onChange={(e) => updateField('gradientAngle', parseInt(e.target.value))}
                          className="flex-1 accent-slate-900"
                        />
                        <span className="text-xs text-slate-600 w-8">{editorCfg.gradientAngle}°</span>
                      </div>
                      {/* Preview */}
                      <div
                        className="h-6 rounded-md"
                        style={{ background: `linear-gradient(${editorCfg.gradientAngle}deg, ${editorCfg.colorGradientStops.map(s => `${s.color} ${s.offset}%`).join(', ')})` }}
                      />
                    </div>
                  )}
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

              {/* Толщина линий / Stroke width */}
              <Field label={`${lang === 'ru' ? 'Толщина линий' : 'Stroke width'}: ${editorCfg.strokeWidth}px`}>
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

              {/* Стиль штриха / Stroke style */}
              <Field label={lang === 'ru' ? 'Стиль штриха' : 'Stroke style'}>
                <div className="flex gap-2">
                  <Toggle active={editorCfg.strokeStyle === 'solid'} onClick={() => updateField('strokeStyle', 'solid' as StrokeStyle)}>
                    {lang === 'ru' ? 'Сплошной' : 'Solid'}
                  </Toggle>
                  <Toggle active={editorCfg.strokeStyle === 'dashed'} onClick={() => updateField('strokeStyle', 'dashed' as StrokeStyle)}>
                    {lang === 'ru' ? 'Пунктир' : 'Dashed'}
                  </Toggle>
                  <Toggle active={editorCfg.strokeStyle === 'dotted'} onClick={() => updateField('strokeStyle', 'dotted' as StrokeStyle)}>
                    {lang === 'ru' ? 'Точки' : 'Dotted'}
                  </Toggle>
                </div>
              </Field>

              {/* Концы линий / Line cap */}
              <Field label={lang === 'ru' ? 'Концы линий' : 'Line cap'}>
                <div className="flex gap-2">
                  <Toggle active={editorCfg.lineCap === 'round'} onClick={() => updateField('lineCap', 'round' as LineCap)}>
                    {lang === 'ru' ? 'Скруглённые' : 'Round'}
                  </Toggle>
                  <Toggle active={editorCfg.lineCap === 'square'} onClick={() => updateField('lineCap', 'square' as LineCap)}>
                    {lang === 'ru' ? 'Квадратные' : 'Square'}
                  </Toggle>
                  <Toggle active={editorCfg.lineCap === 'butt'} onClick={() => updateField('lineCap', 'butt' as LineCap)}>
                    {lang === 'ru' ? 'Обрезанные' : 'Butt'}
                  </Toggle>
                </div>
              </Field>

              {/* Соединение / Line join */}
              <Field label={lang === 'ru' ? 'Соединение' : 'Line join'}>
                <div className="flex gap-2">
                  <Toggle active={editorCfg.lineJoin === 'round'} onClick={() => updateField('lineJoin', 'round' as LineJoin)}>
                    {lang === 'ru' ? 'Скруглённое' : 'Round'}
                  </Toggle>
                  <Toggle active={editorCfg.lineJoin === 'miter'} onClick={() => updateField('lineJoin', 'miter' as LineJoin)}>
                    {lang === 'ru' ? 'Острое' : 'Miter'}
                  </Toggle>
                  <Toggle active={editorCfg.lineJoin === 'bevel'} onClick={() => updateField('lineJoin', 'bevel' as LineJoin)}>
                    {lang === 'ru' ? 'Срезанное' : 'Bevel'}
                  </Toggle>
                </div>
              </Field>

              {/* Прозрачность / Opacity */}
              <Field label={`${lang === 'ru' ? 'Прозрачность' : 'Opacity'}: ${editorCfg.opacity.toFixed(2)}`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={editorCfg.opacity}
                  onChange={(e) => updateField('opacity', parseFloat(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </Field>

              {/* Размер экспорта / Export size */}
              <Field label={`${lang === 'ru' ? 'Размер экспорта' : 'Export size'}: ${editorCfg.size}px`}>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {[16, 20, 24, 32, 48, 64].map((s) => (
                      <Toggle key={s} active={editorCfg.size === s} onClick={() => updateField('size', s)}>
                        {s}
                      </Toggle>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{lang === 'ru' ? 'Другой' : 'Custom'}</span>
                    <input
                      type="number"
                      min={8}
                      max={512}
                      value={editorCfg.size}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        if (v >= 8 && v <= 512) updateField('size', v)
                      }}
                      className="w-20 px-2 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                    />
                    <span className="text-xs text-slate-500">px</span>
                  </div>
                </div>
              </Field>

              {/* Отступ / Padding */}
              <Field label={`${lang === 'ru' ? 'Отступ' : 'Padding'}: ${editorCfg.padding ?? 0}px`}>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={editorCfg.padding ?? 0}
                  onChange={(e) => updateField('padding', parseFloat(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </Field>

              {/* Фон / Background */}
              <Field label={lang === 'ru' ? 'Фон' : 'Background'}>
                <div className="flex gap-2 flex-wrap">
                  <Toggle active={editorCfg.background === 'none'} onClick={() => updateField('background', 'none' as BgShape)}>
                    {lang === 'ru' ? 'Нет' : 'None'}
                  </Toggle>
                  <Toggle active={editorCfg.background === 'circle'} onClick={() => updateField('background', 'circle' as BgShape)}>
                    {lang === 'ru' ? 'Круг' : 'Circle'}
                  </Toggle>
                  <Toggle active={editorCfg.background === 'square'} onClick={() => updateField('background', 'square' as BgShape)}>
                    {lang === 'ru' ? 'Квадрат' : 'Square'}
                  </Toggle>
                  <Toggle active={editorCfg.background === 'hexagon'} onClick={() => updateField('background', 'hexagon' as BgShape)}>
                    {lang === 'ru' ? 'Шестиуг.' : 'Hexagon'}
                  </Toggle>
                  <Toggle active={editorCfg.background === 'diamond'} onClick={() => updateField('background', 'diamond' as BgShape)}>
                    {lang === 'ru' ? 'Ромб' : 'Diamond'}
                  </Toggle>
                </div>
              </Field>

              {editorCfg.background !== 'none' && (
                <Field label={lang === 'ru' ? 'Цвет фона' : 'Background color'}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editorCfg.bgColor}
                        onChange={(e) => {
                          const newBg = e.target.value
                          if (editorCfg.bgGradient && editorCfg.bgGradientStops.length > 0) {
                            const newStops = [...editorCfg.bgGradientStops]
                            newStops[0] = { ...newStops[0], color: newBg }
                            setEditorCfg({ ...editorCfg, bgColor: newBg, bgGradientStops: newStops })
                          } else {
                            updateField('bgColor', newBg)
                          }
                        }}
                        className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editorCfg.bgColor}
                        onChange={(e) => {
                          const newBg = e.target.value
                          if (editorCfg.bgGradient && editorCfg.bgGradientStops.length > 0) {
                            const newStops = [...editorCfg.bgGradientStops]
                            newStops[0] = { ...newStops[0], color: newBg }
                            setEditorCfg({ ...editorCfg, bgColor: newBg, bgGradientStops: newStops })
                          } else {
                            updateField('bgColor', newBg)
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                      />
                    </div>
                    {/* BG Gradient toggle */}
                    <Toggle active={editorCfg.bgGradient} onClick={() => updateField('bgGradient', !editorCfg.bgGradient)}>
                      {lang === 'ru' ? 'Градиент фона' : 'BG Gradient'}
                    </Toggle>
                    {editorCfg.bgGradient && (
                      <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                        {/* BG gradient stops editor */}
                        {editorCfg.bgGradientStops.map((stop, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 w-3">{idx + 1}</span>
                            <input
                              type="color"
                              value={stop.color}
                              onChange={(e) => {
                                const newStops = [...editorCfg.bgGradientStops]
                                newStops[idx] = { ...newStops[idx], color: e.target.value }
                                updateField('bgGradientStops', newStops)
                              }}
                              className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                            />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={stop.offset}
                              onChange={(e) => {
                                const newStops = [...editorCfg.bgGradientStops]
                                newStops[idx] = { ...newStops[idx], offset: parseInt(e.target.value) }
                                updateField('bgGradientStops', newStops)
                              }}
                              className="flex-1 accent-slate-900"
                            />
                            <span className="text-[10px] text-slate-500 w-7">{stop.offset}%</span>
                            {editorCfg.bgGradientStops.length > 2 && idx > 0 && idx < editorCfg.bgGradientStops.length - 1 && (
                              <button
                                onClick={() => {
                                  const newStops = editorCfg.bgGradientStops.filter((_, i) => i !== idx)
                                  updateField('bgGradientStops', newStops)
                                }}
                                className="text-rose-400 hover:text-rose-600 text-xs leading-none"
                              >×</button>
                            )}
                          </div>
                        ))}
                        {editorCfg.bgGradientStops.length < 6 && (
                          <button
                            onClick={() => {
                              const stops = editorCfg.bgGradientStops
                              const lastOffset = stops[stops.length - 1]?.offset ?? 100
                              const prevOffset = stops.length >= 2 ? stops[stops.length - 2]?.offset ?? 0 : 0
                              const midOffset = Math.round((lastOffset + prevOffset) / 2)
                              const newStops = [...stops, { offset: midOffset, color: '#CBD5E1' }].sort((a, b) => a.offset - b.offset)
                              updateField('bgGradientStops', newStops)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            + {lang === 'ru' ? 'Добавить точку' : 'Add stop'}
                          </button>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-14">{lang === 'ru' ? 'Угол' : 'Angle'}</span>
                          <input
                            type="range"
                            min={0}
                            max={360}
                            step={15}
                            value={editorCfg.bgGradientAngle}
                            onChange={(e) => updateField('bgGradientAngle', parseInt(e.target.value))}
                            className="flex-1 accent-slate-900"
                          />
                          <span className="text-xs text-slate-600 w-8">{editorCfg.bgGradientAngle}°</span>
                        </div>
                        <div
                          className="h-6 rounded-md"
                          style={{ background: `linear-gradient(${editorCfg.bgGradientAngle}deg, ${editorCfg.bgGradientStops.map(s => `${s.color} ${s.offset}%`).join(', ')})` }}
                        />
                      </div>
                    )}
                  </div>
                </Field>
              )}

              {/* Тень / Свечение / Shadow & Glow */}
              <Field label={lang === 'ru' ? 'Тень / Свечение' : 'Shadow / Glow'}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Toggle active={editorCfg.shadowType === 'none'} onClick={() => updateField('shadowType', 'none' as ShadowType)}>
                      {lang === 'ru' ? 'Нет' : 'None'}
                    </Toggle>
                    <Toggle active={editorCfg.shadowType === 'shadow'} onClick={() => updateField('shadowType', 'shadow' as ShadowType)}>
                      {lang === 'ru' ? 'Тень' : 'Shadow'}
                    </Toggle>
                    <Toggle active={editorCfg.shadowType === 'glow'} onClick={() => updateField('shadowType', 'glow' as ShadowType)}>
                      {lang === 'ru' ? 'Свечение' : 'Glow'}
                    </Toggle>
                  </div>
                  {(editorCfg.shadowType === 'shadow' || editorCfg.shadowType === 'glow') && (
                    <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                      {/* Shadow color */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">{lang === 'ru' ? 'Цвет' : 'Color'}</span>
                        <input
                          type="color"
                          value={editorCfg.shadowColor}
                          onChange={(e) => updateField('shadowColor', e.target.value)}
                          className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editorCfg.shadowColor}
                          onChange={(e) => updateField('shadowColor', e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      {/* Blur */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">{lang === 'ru' ? 'Размытие' : 'Blur'}</span>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.5}
                          value={editorCfg.shadowBlur}
                          onChange={(e) => updateField('shadowBlur', parseFloat(e.target.value))}
                          className="flex-1 accent-slate-900"
                        />
                        <span className="text-xs text-slate-600 w-8">{editorCfg.shadowBlur}</span>
                      </div>
                      {/* Offset X */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">X</span>
                        <input
                          type="range"
                          min={-5}
                          max={5}
                          step={0.5}
                          value={editorCfg.shadowOffsetX}
                          onChange={(e) => updateField('shadowOffsetX', parseFloat(e.target.value))}
                          className="flex-1 accent-slate-900"
                        />
                        <span className="text-xs text-slate-600 w-8">{editorCfg.shadowOffsetX}</span>
                      </div>
                      {/* Offset Y */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">Y</span>
                        <input
                          type="range"
                          min={-5}
                          max={5}
                          step={0.5}
                          value={editorCfg.shadowOffsetY}
                          onChange={(e) => updateField('shadowOffsetY', parseFloat(e.target.value))}
                          className="flex-1 accent-slate-900"
                        />
                        <span className="text-xs text-slate-600 w-8">{editorCfg.shadowOffsetY}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {/* Rotation */}
              <Field label={`${lang === 'ru' ? 'Поворот' : 'Rotation'}: ${editorCfg.rotation}°`}>
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
          )}

          {/* ============ ANIMATION TAB ============ */}
          {controlTab === 'animation' && (
            <div className="space-y-5">
              {/* Тип анимации / Animation type */}
              <Field label={lang === 'ru' ? 'Тип анимации' : 'Animation type'}>
                <div className="flex gap-2 flex-wrap">
                  {ANIM_TYPES.map((a) => (
                    <Toggle
                      key={a.value}
                      active={editorCfg.animation === a.value}
                      onClick={() => updateField('animation', a.value)}
                    >
                      <span className="mr-1">{a.icon}</span>
                      {lang === 'ru' ? a.labelRu : a.labelEn}
                    </Toggle>
                  ))}
                </div>
              </Field>

              {/* Длительность / Duration */}
              <Field label={`${lang === 'ru' ? 'Длительность' : 'Duration'}: ${editorCfg.animDuration}s`}>
                <input
                  type="range"
                  min={0.3}
                  max={5}
                  step={0.1}
                  value={editorCfg.animDuration}
                  onChange={(e) => updateField('animDuration', parseFloat(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </Field>

              {/* Плавность / Easing */}
              <Field label={lang === 'ru' ? 'Плавность' : 'Easing'}>
                <div className="flex gap-2 flex-wrap">
                  {(['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'] as EasingType[]).map((e) => (
                    <Toggle
                      key={e}
                      active={editorCfg.animEasing === e}
                      onClick={() => updateField('animEasing', e)}
                    >
                      {e}
                    </Toggle>
                  ))}
                </div>
              </Field>

              {/* Задержка / Delay */}
              <Field label={`${lang === 'ru' ? 'Задержка' : 'Delay'}: ${editorCfg.animDelay}s`}>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.1}
                  value={editorCfg.animDelay}
                  onChange={(e) => updateField('animDelay', parseFloat(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </Field>

              {/* Повторы / Iterations */}
              <Field label={lang === 'ru' ? 'Повторы' : 'Iterations'}>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 0, label: '∞' },
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                  ].map((it) => (
                    <Toggle
                      key={it.value}
                      active={editorCfg.animIterations === it.value}
                      onClick={() => updateField('animIterations', it.value)}
                    >
                      {it.label}
                    </Toggle>
                  ))}
                </div>
              </Field>

              {/* Формат экспорта / Export format */}
              <Field label={lang === 'ru' ? 'Формат экспорта' : 'Export format'}>
                <div className="flex gap-2 flex-wrap">
                  {(['svg', 'png', 'react', 'vue'] as ExportFormat[]).map((f) => (
                    <Toggle
                      key={f}
                      active={editorCfg.exportFormat === f}
                      onClick={() => updateField('exportFormat', f)}
                    >
                      {f.toUpperCase()}
                    </Toggle>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-5">
          {/* Big preview */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg overflow-visible">
              {previewIcon && (
                <IconView
                  innerSvg={previewIcon.svg}
                  viewBox={previewIcon.viewBox}
                  cfg={cfgFor(previewIcon.id)}
                  size={cfgFor(previewIcon.id).animation !== 'none' ? Math.min(96, editorCfg.size * 3) : Math.min(128, editorCfg.size * 4)}
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

          {/* Scope mode selector — ABOVE the icon grid */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
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
                    className={`relative aspect-square flex items-center justify-center rounded-md border transition-all hover:scale-110 overflow-visible ${
                      isEditing || isSelected
                        ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-900'
                        : isOverridden
                        ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={cfgFor(ic.id)} size={cfgFor(ic.id).animation !== 'none' ? 18 : 24} />
                    {isOverridden && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                    )}
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
            {user && pack && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 rounded-md border border-slate-900 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {saving ? '...' : (lang === 'ru' ? 'Сохранить в мои паки' : 'Save to my packs')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Palette Dialog */}
      {showPaletteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {lang === 'ru' ? 'Создать палитру' : 'Create Palette'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {lang === 'ru' ? 'Название (RU)' : 'Name (RU)'}
                  </label>
                  <input
                    type="text"
                    value={paletteForm.nameRu}
                    onChange={(e) => setPaletteForm(p => ({ ...p, nameRu: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                    placeholder="Тёмная ночь"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {lang === 'ru' ? 'Название (EN)' : 'Name (EN)'}
                  </label>
                  <input
                    type="text"
                    value={paletteForm.nameEn}
                    onChange={(e) => setPaletteForm(p => ({ ...p, nameEn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                    placeholder="Dark Night"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'ru' ? 'Основной цвет' : 'Primary Color'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={paletteForm.color1}
                    onChange={(e) => setPaletteForm(p => ({ ...p, color1: e.target.value }))}
                    className="w-10 h-10 rounded-md border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={paletteForm.color1}
                    onChange={(e) => setPaletteForm(p => ({ ...p, color1: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 mb-1">
                  <input
                    type="checkbox"
                    checked={paletteForm.isGradient}
                    onChange={(e) => setPaletteForm(p => ({ ...p, isGradient: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  {lang === 'ru' ? 'Градиент цвета' : 'Color Gradient'}
                </label>
                {paletteForm.isGradient && (
                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{lang === 'ru' ? 'Цвет 2' : 'Color 2'}</span>
                      <input
                        type="color"
                        value={paletteForm.color2}
                        onChange={(e) => setPaletteForm(p => ({ ...p, color2: e.target.value }))}
                        className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={paletteForm.color2}
                        onChange={(e) => setPaletteForm(p => ({ ...p, color2: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{lang === 'ru' ? 'Угол' : 'Angle'}</span>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={paletteForm.gradientAngle}
                        onChange={(e) => setPaletteForm(p => ({ ...p, gradientAngle: parseInt(e.target.value) }))}
                        className="flex-1 accent-slate-900"
                      />
                      <span className="text-xs text-slate-600 w-8">{paletteForm.gradientAngle}°</span>
                    </div>
                    <div
                      className="h-6 rounded-md"
                      style={{ background: `linear-gradient(${paletteForm.gradientAngle}deg, ${paletteForm.color1}, ${paletteForm.color2})` }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'ru' ? 'Режим' : 'Mode'}
                </label>
                <div className="flex gap-2">
                  <Toggle active={paletteForm.mode === 'mono'} onClick={() => setPaletteForm(p => ({ ...p, mode: 'mono' }))}>
                    {t.customize.modeMono}
                  </Toggle>
                  <Toggle active={paletteForm.mode === 'duotone'} onClick={() => setPaletteForm(p => ({ ...p, mode: 'duotone' }))}>
                    {t.customize.modeDuotone}
                  </Toggle>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'ru' ? 'Цвет фона (если есть фон)' : 'Background Color (if bg enabled)'}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={paletteForm.bgColor1}
                      onChange={(e) => setPaletteForm(p => ({ ...p, bgColor1: e.target.value }))}
                      className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={paletteForm.bgColor1}
                      onChange={(e) => setPaletteForm(p => ({ ...p, bgColor1: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={paletteForm.isBgGradient}
                      onChange={(e) => setPaletteForm(p => ({ ...p, isBgGradient: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    {lang === 'ru' ? 'Градиент фона' : 'Background Gradient'}
                  </label>
                  {paletteForm.isBgGradient && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{lang === 'ru' ? 'Цвет 2' : 'Color 2'}</span>
                      <input
                        type="color"
                        value={paletteForm.bgColor2}
                        onChange={(e) => setPaletteForm(p => ({ ...p, bgColor2: e.target.value }))}
                        className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={paletteForm.bgColor2}
                        onChange={(e) => setPaletteForm(p => ({ ...p, bgColor2: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview swatch */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'ru' ? 'Превью' : 'Preview'}
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-lg border border-slate-200"
                    style={{
                      background: paletteForm.isGradient
                        ? `linear-gradient(${paletteForm.gradientAngle}deg, ${paletteForm.color1}, ${paletteForm.color2})`
                        : paletteForm.color1
                    }}
                  />
                  <div
                    className="w-12 h-12 rounded-lg border border-slate-200"
                    style={{
                      background: paletteForm.isBgGradient
                        ? `linear-gradient(${paletteForm.gradientAngle}deg, ${paletteForm.bgColor1}, ${paletteForm.bgColor2})`
                        : paletteForm.bgColor1
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSavePalette}
                disabled={!paletteForm.nameRu || !paletteForm.nameEn}
                className="flex-1 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {lang === 'ru' ? 'Сохранить' : 'Save'}
              </button>
              <button
                onClick={() => setShowPaletteDialog(false)}
                className="px-4 py-2.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
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
        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}
