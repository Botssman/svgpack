'use client'
import { useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import { CATEGORIES } from '@/lib/categories'

type PageInfo = {
  id: string
  name: string
  iconCount: number
  frames: { id: string; name: string; iconCount: number }[]
  suggestedCategory: string
}

type CategoryOption = {
  slug: string
  nameRu: string
  nameEn: string
  icon: string
}

/**
 * FigmaImport — advanced Figma import with file preview and per-page category assignment.
 *
 * Steps:
 * 1. Enter Figma Token + File URL
 * 2. Preview file structure (pages, icon counts, auto-suggested categories)
 * 3. Select pages → assign categories → import
 */
export function FigmaImportPanel() {
  const { lang } = useI18n()
  const { toast } = useToast()

  // Step management
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Input
  const [figmaToken, setFigmaToken] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [style, setStyle] = useState('outline')

  // Step 2: Preview
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [totalIcons, setTotalIcons] = useState(0)
  const [pages, setPages] = useState<PageInfo[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [pageCategories, setPageCategories] = useState<Record<string, { category: string; enabled: boolean }>>({})

  // Step 3: Importing
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const extractFileKey = (url: string): string => {
    // https://www.figma.com/design/RDLvxevo8yDIisoKR7efMb/Icon--2400-Icons?node-id=168-1995 → RDLvxevo8yDIisoKR7efMb
    const match = url.match(/figma\.com\/(?:file|design|proto|community)\/([A-Za-z0-9]+)/)
    return match ? match[1] : url.trim()
  }

  // Step 1 → 2: Fetch file structure
  const handlePreview = useCallback(async () => {
    const fileKey = extractFileKey(fileUrl)
    if (!figmaToken || !fileKey) {
      toast({ title: lang === 'ru' ? 'Укажите Token и URL файла' : 'Provide Token and File URL' })
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ figmaToken, fileKey })
      const res = await fetch(`/api/admin/figma-import?${params}`)
      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error || 'Ошибка получения структуры файла' })
        setLoading(false)
        return
      }

      setFileName(data.fileName)
      setTotalIcons(data.totalIcons)
      setPages(data.pages || [])
      setCategories(data.categories || [])

      // Initialize page categories with suggestions, all enabled by default
      const initial: Record<string, { category: string; enabled: boolean }> = {}
      for (const page of data.pages || []) {
        initial[page.name] = {
          category: page.suggestedCategory || 'system',
          enabled: true,
        }
      }
      setPageCategories(initial)
      setStep(2)
    } catch (e: any) {
      toast({ title: e?.message || 'Сетевая ошибка' })
    } finally {
      setLoading(false)
    }
  }, [figmaToken, fileUrl, lang, toast])

  // Step 2 → 3: Import selected pages with their categories
  const handleImport = useCallback(async () => {
    const fileKey = extractFileKey(fileUrl)
    const enabledPages = Object.entries(pageCategories)
      .filter(([, val]) => val.enabled)
      .map(([name, val]) => ({ name, category: val.category, enabled: true }))

    if (enabledPages.length === 0) {
      toast({ title: lang === 'ru' ? 'Выберите хотя бы одну страницу' : 'Select at least one page' })
      return
    }

    setImporting(true)
    setImportResult(null)
    setStep(3)

    try {
      const res = await fetch('/api/admin/figma-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaToken,
          fileKey,
          style,
          pages: enabledPages,
        }),
      })

      const data = await res.json()

      if (res.ok && data.ok) {
        toast({
          title: lang === 'ru'
            ? `Импорт завершён: ${data.totalPacks} пак(ов), ${data.totalIcons} иконок`
            : `Import complete: ${data.totalPacks} pack(s), ${data.totalIcons} icons`,
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
  }, [figmaToken, fileUrl, style, pageCategories, lang, toast])

  const togglePage = (name: string) => {
    setPageCategories(prev => ({
      ...prev,
      [name]: { ...prev[name], enabled: !prev[name].enabled },
    }))
  }

  const setCategoryForPage = (name: string, category: string) => {
    setPageCategories(prev => ({
      ...prev,
      [name]: { ...prev[name], category },
    }))
  }

  const toggleAllPages = (enabled: boolean) => {
    setPageCategories(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], enabled }
      }
      return next
    })
  }

  const enabledCount = Object.values(pageCategories).filter(v => v.enabled).length
  const enabledIcons = pages.reduce((s, p) =>
    s + (pageCategories[p.name]?.enabled ? p.iconCount : 0), 0)

  const catLabel = (slug: string) => {
    const c = categories.find(cat => cat.slug === slug)
    return c ? `${c.icon} ${lang === 'ru' ? c.nameRu : c.nameEn}` : slug
  }

  return (
    <div className="space-y-6">
      {/* ── Step 1: Input ── */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {lang === 'ru' ? '🎨 Импорт из Figma' : '🎨 Import from Figma'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {lang === 'ru'
                ? 'Импортируйте иконки напрямую из Figma-файла. Система автоматически определит структуру файла и предложит разбивку на категории.'
                : 'Import icons directly from a Figma file. The system will automatically detect the file structure and suggest category assignments.'}
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

          {/* Style */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'ru' ? 'Стиль иконок' : 'Icon Style'}
            </label>
            <div className="flex gap-2">
              {[
                { slug: 'outline', label: 'Outline' },
                { slug: 'filled', label: 'Filled' },
                { slug: 'duotone', label: 'Duotone' },
              ].map(s => (
                <button
                  key={s.slug}
                  onClick={() => setStyle(s.slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    style === s.slug
                      ? 'bg-neutral-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <button
            onClick={handlePreview}
            disabled={loading || !figmaToken || !fileUrl}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? (lang === 'ru' ? 'Загрузка структуры...' : 'Loading structure...')
              : (lang === 'ru' ? '🔍 Предпросмотр файла' : '🔍 Preview File')
            }
          </button>

          {/* Help section */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              {lang === 'ru' ? '💡 Как получить Figma Token' : '💡 How to get Figma Token'}
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

      {/* ── Step 2: Preview & Category Assignment ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* File info header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{fileName}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {pages.length} {lang === 'ru' ? (pages.length === 1 ? 'страница' : pages.length < 5 ? 'страницы' : 'страниц') : (pages.length === 1 ? 'page' : 'pages')}
                  {' · '}
                  {totalIcons} {lang === 'ru' ? 'иконок' : 'icons'}
                  {' · '}
                  {lang === 'ru' ? 'Стиль' : 'Style'}: {style}
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                {lang === 'ru' ? 'Изменить' : 'Change'}
              </button>
            </div>
          </div>

          {/* Selection summary */}
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <div className="text-sm text-emerald-800">
              {lang === 'ru' ? 'Выбрано' : 'Selected'}: <strong>{enabledCount}</strong> {lang === 'ru' ? (enabledCount === 1 ? 'страница' : enabledCount < 5 ? 'страницы' : 'страниц') : (enabledCount === 1 ? 'page' : 'pages')}
              {' · '}
              <strong>{enabledIcons}</strong> {lang === 'ru' ? 'иконок' : 'icons'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAllPages(true)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                {lang === 'ru' ? 'Выбрать все' : 'Select all'}
              </button>
              <span className="text-emerald-300">|</span>
              <button
                onClick={() => toggleAllPages(false)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                {lang === 'ru' ? 'Снять все' : 'Deselect all'}
              </button>
            </div>
          </div>

          {/* Pages list with category selectors */}
          <div className="space-y-3">
            {pages.map((page) => {
              const cfg = pageCategories[page.name]
              if (!cfg) return null

              return (
                <div
                  key={page.id}
                  className={`rounded-xl border bg-white transition-colors ${
                    cfg.enabled ? 'border-slate-200' : 'border-slate-100 opacity-50'
                  }`}
                >
                  <div className="p-4">
                    {/* Page header row */}
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => togglePage(page.name)}
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          cfg.enabled
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {cfg.enabled && (
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>

                      {/* Page name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{page.name}</div>
                        <div className="text-xs text-slate-500">
                          {page.iconCount} {lang === 'ru' ? 'иконок' : 'icons'}
                          {page.frames.length > 0 && (
                            <> · {page.frames.length} {lang === 'ru' ? 'фреймов' : 'frames'}</>
                          )}
                        </div>
                      </div>

                      {/* Category selector */}
                      <div className="w-52">
                        <select
                          value={cfg.category}
                          onChange={e => setCategoryForPage(page.name, e.target.value)}
                          disabled={!cfg.enabled}
                          className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {categories.map(c => (
                            <option key={c.slug} value={c.slug}>
                              {c.icon} {lang === 'ru' ? c.nameRu : c.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Frame details (collapsible) */}
                    {cfg.enabled && page.frames.length > 0 && (
                      <div className="mt-3 pl-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                        {page.frames.map((frame) => (
                          <div
                            key={frame.id}
                            className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
                          >
                            <span className="text-slate-400">─</span>
                            <span className="truncate">{frame.name}</span>
                            <span className="ml-auto text-slate-400 shrink-0">{frame.iconCount}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
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
                ? `🎨 Импортировать ${enabledCount} ${enabledCount === 1 ? 'страницу' : enabledCount < 5 ? 'страницы' : 'страниц'} (${enabledIcons} иконок)`
                : `🎨 Import ${enabledCount} page(s) (${enabledIcons} icons)`
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
                  ? 'Скачивание SVG из Figma и создание паков. Это может занять несколько минут для больших файлов.'
                  : 'Downloading SVGs from Figma and creating packs. This may take a few minutes for large files.'}
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
                      <p className="text-sm text-emerald-700">
                        {lang === 'ru' ? 'Файл' : 'File'}: {importResult.fileName}
                      </p>
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
                    setImportResult(null)
                  }}
                  className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
                >
                  {lang === 'ru' ? '🎨 Импортировать ещё' : '🎨 Import more'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
