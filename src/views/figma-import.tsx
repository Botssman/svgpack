'use client'
import { useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'

type PageInfo = {
  id: string
  name: string
  iconCount: number
  frames: FrameInfo[]
  suggestedCategory: string
  suggestedStyle: string
}

type FrameInfo = {
  id: string
  name: string
  iconCount: number
  suggestedCategory: string
  suggestedStyle: string
}

type CategoryOption = {
  slug: string
  nameRu: string
  nameEn: string
}

type FrameConfig = {
  id: string
  name: string
  pageName: string
  category: string
  style: string
  enabled: boolean
  iconCount: number
}

// ZIP multipack types
type ZipGroup = {
  name: string
  iconCount: number
  suggestedCategory: string
  suggestedStyle: string
  icons: Array<{
    slug: string
    nameRu: string
    nameEn: string
    keywords: string
    svg: string
    viewBox: string
  }>
}

type ZipGroupConfig = {
  name: string
  category: string
  style: string
  enabled: boolean
  iconCount: number
}

const STYLES = [
  { slug: 'outline', label: 'Outline', hint: 'regular / line / stroke' },
  { slug: 'filled', label: 'Filled', hint: 'solid / bold / fill' },
  { slug: 'duotone', label: 'Duotone', hint: 'two-tone / color' },
  { slug: 'thin', label: 'Thin', hint: 'light / ultra-thin' },
  { slug: 'cute', label: 'Cute', hint: 'kawaii style' },
  { slug: 'brand', label: 'Brand', hint: 'logos & social' },
]

/**
 * FigmaImport — import icons from Figma API OR ZIP archive.
 *
 * Two modes:
 * 1. Figma API — enter Token + URL → preview → import (existing flow)
 * 2. ZIP Upload — upload ZIP with SVGs → auto-group by folder/prefix → create packs
 *
 * ZIP mode completely bypasses Figma API — no rate limits!
 */
export function FigmaImportPanel() {
  const { lang } = useI18n()
  const { toast } = useToast()

  // Top-level mode switch: 'api' | 'zip'
  const [mode, setMode] = useState<'api' | 'zip'>('zip')

  return (
    <div className="space-y-6">
      {/* ── Mode switcher ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        <button
          onClick={() => setMode('zip')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'zip'
              ? 'bg-neutral-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lang === 'ru' ? '📦 ZIP-архив (без API)' : '📦 ZIP Archive (no API)'}
        </button>
        <button
          onClick={() => setMode('api')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'api'
              ? 'bg-neutral-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lang === 'ru' ? '🔗 Figma API' : '🔗 Figma API'}
        </button>
      </div>

      {/* Recommendation banner */}
      {mode === 'api' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          {lang === 'ru'
            ? '⚠️ Figma API имеет лимит запросов. Если получили ошибку 429 — используйте режим «ZIP-архив» (без API).'
            : '⚠️ Figma API has rate limits. If you get 429 errors — use "ZIP Archive" mode (no API).'}
        </div>
      )}

      {mode === 'zip' ? <ZipImportFlow /> : <ApiImportFlow />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ZIP Import Flow (NO Figma API needed!)
// ═══════════════════════════════════════════════════════════
function ZipImportFlow() {
  const { lang } = useI18n()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uploading, setUploading] = useState(false)
  const [groups, setGroups] = useState<ZipGroup[]>([])
  const [groupConfigs, setGroupConfigs] = useState<ZipGroupConfig[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [totalIcons, setTotalIcons] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [zipCount, setZipCount] = useState(0)

  // Merge new groups into existing ones (combines groups with same name)
  const mergeGroups = (existing: ZipGroup[], incoming: ZipGroup[]): ZipGroup[] => {
    const map = new Map<string, ZipGroup>()
    for (const g of existing) {
      map.set(g.name, g)
    }
    for (const g of incoming) {
      const existingGroup = map.get(g.name)
      if (existingGroup) {
        // Merge icons into existing group
        existingGroup.icons = [...existingGroup.icons, ...g.icons]
        existingGroup.iconCount = existingGroup.icons.length
      } else {
        map.set(g.name, { ...g })
      }
    }
    return Array.from(map.values())
  }

  const processFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return

    setUploading(true)
    let allNewGroups: ZipGroup[] = []
    let allNewIcons = 0
    let lastCategories: CategoryOption[] = categories
    let hasError = false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.name.endsWith('.zip')) continue

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/admin/zip-multipack', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (res.ok && data.ok) {
          allNewGroups = mergeGroups(allNewGroups, data.groups || [])
          allNewIcons += data.totalIcons || 0
          lastCategories = data.categories || []
        } else {
          toast({ title: `${file.name}: ${data.error || 'Ошибка загрузки'}` })
          hasError = true
        }
      } catch (e: any) {
        toast({ title: `${file.name}: ${e?.message || 'Ошибка'}` })
        hasError = true
      }
    }

    if (allNewGroups.length > 0) {
      // Merge with existing groups (for "Add more ZIP" flow)
      const merged = mergeGroups(groups, allNewGroups)
      setGroups(merged)
      setTotalIcons(prev => prev + allNewIcons)
      setCategories(lastCategories)

      // Build configs — keep existing config, add new groups
      const newConfigs: ZipGroupConfig[] = merged.map(g => {
        const existingConfig = groupConfigs.find(c => c.name === g.name)
        if (existingConfig) {
          return { ...existingConfig, iconCount: g.iconCount }
        }
        return {
          name: g.name,
          category: g.suggestedCategory || 'uncategorized',
          style: g.suggestedStyle || 'outline',
          enabled: true,
          iconCount: g.iconCount,
        }
      })
      setGroupConfigs(newConfigs)
      setZipCount(prev => prev + files.length)
      setStep(2)

      toast({
        title: lang === 'ru'
          ? `Найдено ${merged.reduce((s, g) => s + g.iconCount, 0)} иконок в ${merged.length} группах`
          : `Found ${merged.reduce((s, g) => s + g.iconCount, 0)} icons in ${merged.length} groups`,
      })
    } else if (!hasError) {
      toast({ title: lang === 'ru' ? 'ZIP не содержит SVG-файлов' : 'ZIP contains no SVG files' })
    }

    setUploading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await processFiles(Array.from(files))
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  const handleAddMoreZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await processFiles(Array.from(files))
    e.target.value = ''
  }

  const handleImport = async () => {
    const enabledGroups = groupConfigs
      .filter(gc => gc.enabled)
      .map(gc => {
        const group = groups.find(g => g.name === gc.name)
        return {
          name: gc.name,
          category: gc.category,
          style: gc.style,
          enabled: true,
          icons: group?.icons || [],
        }
      })
      .filter(g => g.icons.length > 0)

    if (enabledGroups.length === 0) {
      toast({ title: lang === 'ru' ? 'Выберите хотя бы одну группу' : 'Select at least one group' })
      return
    }

    setImporting(true)
    setImportResult(null)
    setStep(3)

    try {
      const res = await fetch('/api/admin/zip-multipack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: enabledGroups }),
      })
      const data = await res.json()

      if (res.ok && data.ok) {
        toast({
          title: lang === 'ru'
            ? `Импорт: ${data.totalPacks} пак(ов), ${data.totalIcons} иконок`
            : `Import: ${data.totalPacks} pack(s), ${data.totalIcons} icons`,
        })
        setImportResult(data)
      } else {
        toast({ title: data.error || 'Ошибка импорта' })
        setImportResult(data)
      }
    } catch (e: any) {
      toast({ title: e?.message || 'Сетевая ошибка' })
      setImportResult({ error: e?.message })
    } finally {
      setImporting(false)
    }
  }

  const toggleGroup = (name: string) => {
    setGroupConfigs(prev => prev.map(g =>
      g.name === name ? { ...g, enabled: !g.enabled } : g
    ))
  }

  const setCategoryForGroup = (name: string, category: string) => {
    setGroupConfigs(prev => prev.map(g =>
      g.name === name ? { ...g, category } : g
    ))
  }

  const setStyleForGroup = (name: string, style: string) => {
    setGroupConfigs(prev => prev.map(g =>
      g.name === name ? { ...g, style } : g
    ))
  }

  const toggleAll = (enabled: boolean) => {
    setGroupConfigs(prev => prev.map(g => ({ ...g, enabled })))
  }

  const enabledCount = groupConfigs.filter(g => g.enabled).length
  const enabledIcons = groupConfigs.reduce((s, g) => s + (g.enabled ? g.iconCount : 0), 0)

  return (
    <>
      {/* ── Step 1: Upload ZIP ── */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {lang === 'ru' ? 'Импорт из ZIP-архива' : 'Import from ZIP Archive'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {lang === 'ru'
                ? 'Загрузите ZIP-архив с SVG-файлами. Без запросов к Figma API — никаких лимитов! Иконки автоматически группируются по папкам или по префиксу имени файла (например "Arrow - Arrow Up" → группа "Arrow"). Каждая группа = отдельный пак.'
                : 'Upload a ZIP archive with SVG files. No Figma API calls — no rate limits! Icons are auto-grouped by folder or filename prefix (e.g. "Arrow - Arrow Up" → group "Arrow"). Each group = separate pack.'}
            </p>
          </div>

          {/* File input — supports multiple ZIPs */}
          <div className="relative">
            <input
              type="file"
              accept=".zip"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="w-full px-3 py-8 rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-neutral-900 file:text-white hover:file:bg-neutral-700 file:cursor-pointer disabled:opacity-50"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-neutral-900 rounded-full animate-spin" />
                  <span className="text-xs text-slate-500">{lang === 'ru' ? 'Обработка ZIP...' : 'Processing ZIP...'}</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            {lang === 'ru'
              ? 'Можно выбрать несколько ZIP-файлов сразу (по одному на каждую страницу Figma)'
              : 'You can select multiple ZIP files at once (one per Figma page)'}
          </p>

          {/* How-to guide */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
            <h4 className="text-sm font-medium text-emerald-800 mb-2">
              {lang === 'ru' ? 'Как экспортировать иконки из Figma' : 'How to export icons from Figma'}
            </h4>
            <ol className="text-xs text-emerald-700 space-y-1.5 list-decimal pl-4">
              <li>{lang === 'ru' ? 'Откройте файл в Figma Desktop или браузере' : 'Open the file in Figma Desktop or browser'}</li>
              <li>{lang === 'ru' ? 'Перейдите на страницу с иконками (например «Outline»)' : 'Go to the page with icons (e.g. "Outline")'}</li>
              <li>{lang === 'ru' ? 'Выделите все компоненты (Ctrl+A) → правая кнопка → Export → SVG' : 'Select all components (Ctrl+A) → right-click → Export → SVG'}</li>
              <li>{lang === 'ru' ? 'Figma скачает ZIP. Повторите для каждой страницы' : 'Figma downloads a ZIP. Repeat for each page'}</li>
              <li>{lang === 'ru' ? 'Загрузите ВСЕ ZIP-файлы сразу (можно выбрать несколько)' : 'Upload ALL ZIP files at once (select multiple)'}</li>
            </ol>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-emerald-600">
                {lang === 'ru'
                  ? '💡 Совет: если иконки называются "Arrow - Arrow Up.svg", они автоматически сгруппируются в пак "Arrow".'
                  : '💡 Tip: icons named "Arrow - Arrow Up.svg" auto-group into an "Arrow" pack.'}
              </p>
              <p className="text-xs text-emerald-600">
                {lang === 'ru'
                  ? '💡 Можно загружать по одному ZIP за раз — на шаге 2 будет кнопка «Добавить ещё ZIP».'
                  : '💡 You can upload one ZIP at a time — step 2 has an "Add more ZIP" button.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview groups ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Info header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {lang === 'ru' ? 'ZIP-импорт' : 'ZIP Import'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {zipCount} {lang === 'ru' ? (zipCount === 1 ? 'ZIP' : 'ZIP-архивов') : (zipCount === 1 ? 'ZIP' : 'ZIPs')}{' · '}
                  {groups.length} {lang === 'ru' ? (groups.length === 1 ? 'группа' : groups.length < 5 ? 'группы' : 'групп') : (groups.length === 1 ? 'group' : 'groups')}
                  {' · '}
                  {totalIcons} {lang === 'ru' ? 'иконок' : 'icons'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Add more ZIP button */}
                <label className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium hover:bg-blue-100 cursor-pointer transition-colors">
                  {lang === 'ru' ? '+ Добавить ещё ZIP' : '+ Add more ZIP'}
                  <input
                    type="file"
                    accept=".zip"
                    multiple
                    onChange={handleAddMoreZip}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => { setStep(1); setGroups([]); setGroupConfigs([]); setZipCount(0); setTotalIcons(0) }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  {lang === 'ru' ? 'Сбросить' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          {/* Selection summary */}
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <div className="text-sm text-emerald-800">
              {lang === 'ru' ? 'Выбрано' : 'Selected'}: <strong>{enabledCount}</strong> {lang === 'ru' ? (enabledCount === 1 ? 'группа' : enabledCount < 5 ? 'группы' : 'групп') : (enabledCount === 1 ? 'group' : 'groups')}
              {' · '}
              <strong>{enabledIcons}</strong> {lang === 'ru' ? 'иконок' : 'icons'}
              {' · '}
              <strong>{enabledCount}</strong> {lang === 'ru' ? (enabledCount === 1 ? 'пак' : enabledCount < 5 ? 'пака' : 'паков') : (enabledCount === 1 ? 'pack' : 'packs')}
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
                {lang === 'ru' ? 'Выбрать все' : 'Select all'}
              </button>
              <span className="text-emerald-300">|</span>
              <button onClick={() => toggleAll(false)} className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
                {lang === 'ru' ? 'Снять все' : 'Deselect all'}
              </button>
            </div>
          </div>

          {/* Groups list */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-100">
              {groupConfigs.map((gc, idx) => {
                const group = groups.find(g => g.name === gc.name)
                const previewIcons = group?.icons?.slice(0, 8) || []

                return (
                  <div
                    key={gc.name}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      gc.enabled ? 'bg-white' : 'bg-slate-50 opacity-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleGroup(gc.name)}
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded border-2 transition-colors shrink-0 ${
                        gc.enabled
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {gc.enabled && (
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>

                    {/* Preview icons */}
                    <div className="flex gap-0.5 shrink-0">
                      {previewIcons.map((ic, i) => (
                        <div key={i} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-white" title={ic.nameEn}>
                          <div dangerouslySetInnerHTML={{ __html: `<svg viewBox="${ic.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;color:#0a0a0a">${ic.svg}</svg>` }} />
                        </div>
                      ))}
                      {gc.iconCount > 8 && (
                        <div className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-slate-50 text-[8px] text-slate-500">
                          +{gc.iconCount - 8}
                        </div>
                      )}
                    </div>

                    {/* Group name + count */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-900 truncate">{gc.name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">{gc.iconCount}</span>
                    </div>

                    {/* Style selector */}
                    <div className="w-32 shrink-0">
                      <select
                        value={gc.style}
                        onChange={e => setStyleForGroup(gc.name, e.target.value)}
                        disabled={!gc.enabled}
                        className="w-full px-2 py-1 rounded-md border border-slate-200 text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {STYLES.map(s => (
                          <option key={s.slug} value={s.slug}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Category selector */}
                    <div className="w-44 shrink-0">
                      <select
                        value={gc.category}
                        onChange={e => setCategoryForGroup(gc.name, e.target.value)}
                        disabled={!gc.enabled}
                        className="w-full px-2 py-1 rounded-md border border-slate-200 text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {categories.map(c => (
                          <option key={c.slug} value={c.slug}>
                            {lang === 'ru' ? c.nameRu : c.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep(1); setGroups([]); setGroupConfigs([]) }}
              className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {lang === 'ru' ? '← Назад' : '← Back'}
            </button>
            <button
              onClick={handleImport}
              disabled={enabledCount === 0}
              className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {lang === 'ru'
                ? `Импортировать ${enabledCount} ${enabledCount === 1 ? 'группу' : enabledCount < 5 ? 'группы' : 'групп'} → ${enabledCount} ${enabledCount === 1 ? 'пак' : enabledCount < 5 ? 'пака' : 'паков'} (${enabledIcons} иконок)`
                : `Import ${enabledCount} groups → ${enabledCount} packs (${enabledIcons} icons)`
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Importing / Results ── */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          {importing ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">
                {lang === 'ru' ? 'Импортирование...' : 'Importing...'}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {lang === 'ru'
                  ? 'Создание паков из ZIP-архива. Это может занять некоторое время для больших файлов.'
                  : 'Creating packs from ZIP archive. This may take a while for large files.'}
              </p>
            </div>
          ) : importResult ? (
            <>
              {importResult.ok ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-900">
                        {lang === 'ru' ? 'Импорт завершён!' : 'Import complete!'}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-900">{importResult.totalPacks}</div>
                      <div className="text-xs text-slate-500">{lang === 'ru' ? 'Паков создано' : 'Packs created'}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-900">{importResult.totalIcons}</div>
                      <div className="text-xs text-slate-500">{lang === 'ru' ? 'Иконок импортировано' : 'Icons imported'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-4">
                  <h3 className="text-sm font-medium text-rose-800 mb-1">
                    {lang === 'ru' ? 'Ошибка импорта' : 'Import error'}
                  </h3>
                  <p className="text-sm text-rose-700">{importResult.error}</p>
                </div>
              )}

              {/* Detailed results log */}
              {importResult.results && importResult.results.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    {lang === 'ru' ? 'Детали импорта' : 'Import details'}
                  </h4>
                  <div className="text-xs font-mono text-slate-600 space-y-0.5 max-h-60 overflow-y-auto">
                    {importResult.results.map((r: string, i: number) => (
                      <div key={i} className={r.startsWith('✓') ? 'text-emerald-700' : r.startsWith('✗') ? 'text-rose-600' : ''}>{r}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(1)
                    setGroups([])
                    setGroupConfigs([])
                    setImportResult(null)
                  }}
                  className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
                >
                  {lang === 'ru' ? 'Импортировать ещё' : 'Import more'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// API Import Flow (original Figma API import)
// ═══════════════════════════════════════════════════════════
function ApiImportFlow() {
  const { lang } = useI18n()
  const { toast } = useToast()

  // Step management
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Input
  const [figmaToken, setFigmaToken] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [defaultStyle, setDefaultStyle] = useState('outline')

  // Step 2: Preview
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [totalIcons, setTotalIcons] = useState(0)
  const [pages, setPages] = useState<PageInfo[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [frameConfigs, setFrameConfigs] = useState<FrameConfig[]>([])

  // Step 3: Importing
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Debug
  const [debugTree, setDebugTree] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  // Rate-limit state
  const [rateLimited, setRateLimited] = useState(false)
  const [testingToken, setTestingToken] = useState(false)
  const [tokenTestResult, setTokenTestResult] = useState<string | null>(null)

  const extractFileKey = (url: string): string => {
    const match = url.match(/figma\.com\/(?:file|design|proto|community)\/([A-Za-z0-9]+)/)
    return match ? match[1] : url.trim()
  }

  // Test Figma token + file access via server-side API
  const handleTestToken = useCallback(async () => {
    if (!figmaToken) {
      toast({ title: lang === 'ru' ? 'Введите Token' : 'Enter Token' })
      return
    }
    setTestingToken(true)
    setTokenTestResult(null)
    try {
      const fileKey = extractFileKey(fileUrl)
      const params = new URLSearchParams({ figmaToken, ...(fileKey ? { fileKey } : {}) })
      const res = await fetch(`/api/admin/figma-test?${params}`)
      const data = await res.json()

      if (!res.ok) {
        setTokenTestResult(`❌ Ошибка сервера: ${data.error || res.status}`)
        setTestingToken(false)
        return
      }

      const me = data.me
      const file = data.file_depth1

      if (!me || !me.ok) {
        if (me?.status === 429) {
          setTokenTestResult('❌ 429 Rate Limit — полный лимит Figma. Подождите 5+ минут.')
          setRateLimited(true)
        } else {
          setTokenTestResult(`❌ Токен недействителен (${me?.status || 'нет ответа'})`)
        }
        setTestingToken(false)
        return
      }

      const email = me.data?.email || me.data?.handle || 'OK'

      if (!fileKey || !file) {
        setTokenTestResult(`✅ Токен работает: ${email}`)
        setRateLimited(false)
        setTestingToken(false)
        return
      }

      if (file.status === 429) {
        setTokenTestResult(`✅ Токен OK (${email}), но ❌ 429 на /files/. Подождите.`)
        setRateLimited(true)
      } else if (file.status === 403) {
        setTokenTestResult(`✅ Токен OK, но ❌ нет доступа к файлу`)
      } else if (file.status === 404) {
        setTokenTestResult(`✅ Токен OK, но ❌ файл не найден (проверьте URL)`)
      } else if (file.ok) {
        const fName = file.data?.name || 'OK'
        setTokenTestResult(`✅ Токен OK, файл: "${fName}". Можно загружать!`)
        setRateLimited(false)
      } else {
        setTokenTestResult(`✅ Токен OK, но ошибка файла: ${file.status}`)
      }
    } catch {
      setTokenTestResult('❌ Сетевая ошибка')
    } finally {
      setTestingToken(false)
    }
  }, [figmaToken, fileUrl, lang, toast])

  // Step 1 → 2: Fetch file structure
  const handlePreview = useCallback(async () => {
    const fileKey = extractFileKey(fileUrl)
    if (!figmaToken || !fileKey) {
      toast({ title: lang === 'ru' ? 'Укажите Token и URL файла' : 'Provide Token and File URL' })
      return
    }

    setRateLimited(false)
    setLoading(true)
    try {
      const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=3`, {
        headers: { 'X-Figma-Token': figmaToken },
      })

      if (figmaRes.status === 429) {
        setRateLimited(true)
        toast({ title: 'Figma API: лимит запросов (429). Подождите несколько минут.', variant: 'destructive' })
        setLoading(false)
        return
      }

      if (figmaRes.status === 403) {
        toast({ title: lang === 'ru' ? 'Неверный Figma Token или нет доступа к файлу' : 'Invalid token or no file access' })
        setLoading(false)
        return
      }

      if (figmaRes.status === 404) {
        toast({ title: lang === 'ru' ? 'Файл не найден. Проверьте URL.' : 'File not found. Check URL.' })
        setLoading(false)
        return
      }

      if (!figmaRes.ok) {
        toast({ title: `Figma API ошибка: ${figmaRes.status}` })
        setLoading(false)
        return
      }

      const figmaData = await figmaRes.json()

      const serverRes = await fetch('/api/admin/figma-import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figmaData, fileKey }),
      })

      const data = await serverRes.json()

      if (!serverRes.ok) {
        toast({ title: data.error || 'Ошибка обработки структуры' })
        setLoading(false)
        return
      }

      setFileName(data.fileName)
      setTotalIcons(data.totalIcons)
      setPages(data.pages || [])
      setCategories(data.categories || [])
      setDebugTree(data.debugTree || null)

      const configs: FrameConfig[] = []
      for (const page of data.pages || []) {
        for (const frame of page.frames) {
          configs.push({
            id: frame.id,
            name: frame.name,
            pageName: page.name,
            category: frame.suggestedCategory || 'uncategorized',
            style: frame.suggestedStyle || defaultStyle,
            enabled: true,
            iconCount: frame.iconCount,
          })
        }
      }
      setFrameConfigs(configs)
      setStep(2)
    } catch (e: any) {
      toast({ title: e?.message || 'Сетевая ошибка' })
    } finally {
      setLoading(false)
    }
  }, [figmaToken, fileUrl, defaultStyle, lang, toast])

  // Step 2 → 3: Import selected frames
  const handleImport = useCallback(async () => {
    const fileKey = extractFileKey(fileUrl)
    const enabledFrames = frameConfigs.filter(f => f.enabled)

    if (enabledFrames.length === 0) {
      toast({ title: lang === 'ru' ? 'Выберите хотя бы один фрейм' : 'Select at least one frame' })
      return
    }

    setImporting(true)
    setImportResult(null)
    setStep(3)

    try {
      const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=3`, {
        headers: { 'X-Figma-Token': figmaToken },
      })
      if (!figmaRes.ok) {
        toast({ title: `Figma API ошибка: ${figmaRes.status}` })
        setImportResult({ error: `Figma API: ${figmaRes.status}` })
        setImporting(false)
        return
      }
      const figmaData = await figmaRes.json()

      const res = await fetch('/api/admin/figma-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaToken,
          fileKey,
          style: defaultStyle,
          figmaData,
          frames: enabledFrames.map(f => ({
            id: f.id,
            name: f.name,
            category: f.category,
            style: f.style,
            enabled: true,
            pageName: f.pageName,
          })),
        }),
      })

      const data = await res.json()

      if (res.ok && data.ok) {
        const warning = data.svgExportErrors > 0
          ? ` (${data.svgExportErrors} SVG не скачались — лимит Figma)`
          : ''
        toast({
          title: lang === 'ru'
            ? `Импорт: ${data.totalPacks} пак(ов), ${data.totalIcons} иконок${warning}`
            : `Import: ${data.totalPacks} pack(s), ${data.totalIcons} icons${warning}`,
        })
        setImportResult(data)
      } else {
        toast({ title: data.error || 'Ошибка импорта' })
        setImportResult(data)
      }
    } catch (e: any) {
      toast({ title: e?.message || 'Сетевая ошибка' })
      setImportResult({ error: e?.message })
    } finally {
      setImporting(false)
    }
  }, [figmaToken, fileUrl, defaultStyle, frameConfigs, lang, toast])

  const toggleFrame = (frameId: string) => {
    setFrameConfigs(prev => prev.map(f =>
      f.id === frameId ? { ...f, enabled: !f.enabled } : f
    ))
  }

  const setCategoryForFrame = (frameId: string, category: string) => {
    setFrameConfigs(prev => prev.map(f =>
      f.id === frameId ? { ...f, category } : f
    ))
  }

  const setStyleForFrame = (frameId: string, style: string) => {
    setFrameConfigs(prev => prev.map(f =>
      f.id === frameId ? { ...f, style } : f
    ))
  }

  const setCategoryForPage = (pageName: string, category: string) => {
    setFrameConfigs(prev => prev.map(f =>
      f.pageName === pageName ? { ...f, category } : f
    ))
  }

  const setStyleForPage = (pageName: string, style: string) => {
    setFrameConfigs(prev => prev.map(f =>
      f.pageName === pageName ? { ...f, style } : f
    ))
  }

  const toggleAllFrames = (enabled: boolean) => {
    setFrameConfigs(prev => prev.map(f => ({ ...f, enabled })))
  }

  const toggleAllFramesInPage = (pageName: string, enabled: boolean) => {
    setFrameConfigs(prev => prev.map(f =>
      f.pageName === pageName ? { ...f, enabled } : f
    ))
  }

  const enabledCount = frameConfigs.filter(f => f.enabled).length
  const enabledIcons = frameConfigs.reduce((s, f) => s + (f.enabled ? f.iconCount : 0), 0)

  return (
    <>
      {/* ── Step 1: Input ── */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {lang === 'ru' ? 'Импорт из Figma API' : 'Import from Figma API'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {lang === 'ru'
                ? 'Импортируйте иконки из Figma через API. Иконки автоматически группируются по категориям и стилям. Каждый стиль + категория = отдельный пак.'
                : 'Import icons from Figma via API. Icons are auto-grouped by category and style. Each style + category = separate pack.'}
            </p>
          </div>

          {/* Figma Token */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Figma Personal Access Token
            </label>
            <input
              type="password"
              value={figmaToken}
              onChange={e => setFigmaToken(e.target.value)}
              placeholder="figd_xxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm font-mono focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'ru' ? 'Настройки → Personal access tokens → Generate new token' : 'Settings → Personal access tokens → Generate new token'}
            </p>
          </div>

          {/* File URL */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'ru' ? 'URL файла Figma' : 'Figma File URL'}
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={e => setFileUrl(e.target.value)}
              placeholder="https://www.figma.com/design/ABC123/My-Icon-Pack"
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Default Style */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'ru' ? 'Стиль по умолчанию' : 'Default Style'}
              <span className="text-slate-400 font-normal ml-1">({lang === 'ru' ? 'определяется автоматически' : 'auto-detected'})</span>
            </label>
            <div className="flex gap-2">
              {STYLES.map(s => (
                <button
                  key={s.slug}
                  onClick={() => setDefaultStyle(s.slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    defaultStyle === s.slug
                      ? 'bg-neutral-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview & Test buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePreview}
              disabled={loading || !figmaToken || !fileUrl}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? (lang === 'ru' ? 'Загрузка структуры...' : 'Loading structure...')
                : (lang === 'ru' ? 'Предпросмотр файла' : 'Preview File')
              }
            </button>
            <button
              onClick={handleTestToken}
              disabled={testingToken || !figmaToken}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testingToken
                ? (lang === 'ru' ? 'Проверка...' : 'Testing...')
                : (lang === 'ru' ? 'Проверить токен' : 'Test Token')
              }
            </button>
            {tokenTestResult && (
              <span className={`text-xs ${tokenTestResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {tokenTestResult}
              </span>
            )}
            {rateLimited && (
              <span className="text-xs text-amber-600">
                {lang === 'ru' ? 'Лимит запросов. Подождите 2-3 минуты и нажмите «Проверить токен».' : 'Rate limited. Wait 2-3 min and click "Test Token".'}
              </span>
            )}
          </div>

          {/* Help */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              {lang === 'ru' ? 'Как получить Figma Token' : 'How to get Figma Token'}
            </h4>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal pl-4">
              <li>{lang === 'ru' ? 'Откройте Figma → Settings → Personal access tokens' : 'Open Figma → Settings → Personal access tokens'}</li>
              <li>{lang === 'ru' ? 'Нажмите "Generate new token"' : 'Click "Generate new token"'}</li>
              <li>{lang === 'ru' ? 'Скопируйте токен (он показывается только один раз!)' : 'Copy the token (shown only once!)'}</li>
              <li>{lang === 'ru' ? 'Вставьте URL файла Figma (из адресной строки)' : 'Paste the Figma file URL (from address bar)'}</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{fileName}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {pages.length} {lang === 'ru' ? (pages.length === 1 ? 'страница' : pages.length < 5 ? 'страницы' : 'страниц') : (pages.length === 1 ? 'page' : 'pages')}
                  {' · '}
                  {totalIcons} {lang === 'ru' ? 'иконок' : 'icons'}
                </p>
              </div>
              <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 underline">
                {lang === 'ru' ? 'Изменить' : 'Change'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <div className="text-sm text-emerald-800">
              {lang === 'ru' ? 'Выбрано' : 'Selected'}: <strong>{enabledCount}</strong> {lang === 'ru' ? (enabledCount === 1 ? 'фрейм' : enabledCount < 5 ? 'фрейма' : 'фреймов') : 'frames'}
              {' · '}
              <strong>{enabledIcons}</strong> {lang === 'ru' ? 'иконок' : 'icons'}
              {' · '}
              <strong>{enabledCount}</strong> {lang === 'ru' ? (enabledCount === 1 ? 'пак' : enabledCount < 5 ? 'пака' : 'паков') : 'packs'}
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAllFrames(true)} className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
                {lang === 'ru' ? 'Выбрать все' : 'Select all'}
              </button>
              <span className="text-emerald-300">|</span>
              <button onClick={() => toggleAllFrames(false)} className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
                {lang === 'ru' ? 'Снять все' : 'Deselect all'}
              </button>
            </div>
          </div>

          {pages.map((page) => {
            const pageFrames = frameConfigs.filter(f => f.pageName === page.name)
            const allEnabled = pageFrames.length > 0 && pageFrames.every(f => f.enabled)
            const someEnabled = pageFrames.some(f => f.enabled)

            return (
              <div key={page.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <button
                    onClick={() => toggleAllFramesInPage(page.name, !allEnabled)}
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors shrink-0 ${
                      allEnabled
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : someEnabled
                          ? 'border-emerald-600 bg-emerald-100'
                          : 'border-slate-300 bg-white'
                    }`}
                  >
                    {allEnabled && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900">{page.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {page.iconCount} {lang === 'ru' ? 'иконок' : 'icons'} · {pageFrames.length} {lang === 'ru' ? 'фреймов' : 'frames'}
                    </span>
                  </div>
                  <div className="w-32">
                    <select value="" onChange={e => { if (e.target.value) setStyleForPage(page.name, e.target.value) }} className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-500">
                      <option value="">{lang === 'ru' ? 'Стиль всем...' : 'Set style...'}</option>
                      {STYLES.map(s => (<option key={s.slug} value={s.slug}>{s.label}</option>))}
                    </select>
                  </div>
                  <div className="w-44">
                    <select value="" onChange={e => { if (e.target.value) setCategoryForPage(page.name, e.target.value) }} className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-500">
                      <option value="">{lang === 'ru' ? 'Категорию всем...' : 'Set category...'}</option>
                      {categories.map(c => (<option key={c.slug} value={c.slug}>{lang === 'ru' ? c.nameRu : c.nameEn}</option>))}
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {pageFrames.map((frame) => (
                    <div key={frame.id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${frame.enabled ? 'bg-white' : 'bg-slate-50 opacity-50'}`}>
                      <button onClick={() => toggleFrame(frame.id)} className={`flex h-4.5 w-4.5 items-center justify-center rounded border-2 transition-colors shrink-0 ${frame.enabled ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {frame.enabled && (<svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-900 truncate">{frame.name}</span>
                        <span className="text-xs text-slate-400 ml-1.5">{frame.iconCount}</span>
                      </div>
                      <div className="w-32 shrink-0">
                        <select value={frame.style} onChange={e => setStyleForFrame(frame.id, e.target.value)} disabled={!frame.enabled} className="w-full px-2 py-1 rounded-md border border-slate-200 text-xs bg-white disabled:opacity-50">
                          {STYLES.map(s => (<option key={s.slug} value={s.slug}>{s.label}</option>))}
                        </select>
                      </div>
                      <div className="w-44 shrink-0">
                        <select value={frame.category} onChange={e => setCategoryForFrame(frame.id, e.target.value)} disabled={!frame.enabled} className="w-full px-2 py-1 rounded-md border border-slate-200 text-xs bg-white disabled:opacity-50">
                          {categories.map(c => (<option key={c.slug} value={c.slug}>{lang === 'ru' ? c.nameRu : c.nameEn}</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
              {lang === 'ru' ? '← Назад' : '← Back'}
            </button>
            <button onClick={handleImport} disabled={enabledCount === 0} className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {lang === 'ru'
                ? `Импортировать ${enabledCount} фреймов → ${enabledCount} паков (${enabledIcons} иконок)`
                : `Import ${enabledCount} frames → ${enabledCount} packs (${enabledIcons} icons)`}
            </button>
            {debugTree && (
              <button onClick={() => setShowDebug(!showDebug)} className="px-4 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100">
                {showDebug ? (lang === 'ru' ? 'Скрыть структуру' : 'Hide structure') : (lang === 'ru' ? 'Структура Figma' : 'Figma Structure')}
              </button>
            )}
          </div>

          {showDebug && debugTree && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <pre className="text-xs font-mono text-amber-900 bg-white rounded-lg p-3 border border-amber-200 overflow-auto max-h-96 whitespace-pre-wrap">
                {JSON.stringify(debugTree, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Importing / Results ── */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          {importing ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">{lang === 'ru' ? 'Импортирование...' : 'Importing...'}</h3>
              <p className="text-sm text-slate-500 mt-2">
                {lang === 'ru' ? 'Скачивание SVG из Figma и создание паков.' : 'Downloading SVGs from Figma and creating packs.'}
              </p>
            </div>
          ) : importResult ? (
            <>
              {importResult.ok ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-900">{lang === 'ru' ? 'Импорт завершён!' : 'Import complete!'}</h3>
                      <p className="text-sm text-emerald-700">{lang === 'ru' ? 'Файл' : 'File'}: {importResult.fileName}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-900">{importResult.totalPacks}</div>
                      <div className="text-xs text-slate-500">{lang === 'ru' ? 'Паков создано' : 'Packs created'}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-900">{importResult.totalIcons}</div>
                      <div className="text-xs text-slate-500">{lang === 'ru' ? 'Иконок импортировано' : 'Icons imported'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-4">
                  <h3 className="text-sm font-medium text-rose-800 mb-1">{lang === 'ru' ? 'Ошибка импорта' : 'Import error'}</h3>
                  <p className="text-sm text-rose-700">{importResult.error}</p>
                </div>
              )}
              {importResult.results && importResult.results.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{lang === 'ru' ? 'Детали импорта' : 'Import details'}</h4>
                  <div className="text-xs font-mono text-slate-600 space-y-0.5 max-h-60 overflow-y-auto">
                    {importResult.results.map((r: string, i: number) => (
                      <div key={i} className={r.startsWith('✓') ? 'text-emerald-700' : r.startsWith('✗') ? 'text-rose-600' : ''}>{r}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setImportResult(null) }} className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors">
                  {lang === 'ru' ? 'Импортировать ещё' : 'Import more'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  )
}
