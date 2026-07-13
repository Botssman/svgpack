'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import { CATEGORIES } from '@/lib/categories'

/**
 * Admin Import Panel — two sub-tabs:
 * 1. ZIP upload (existing upload-icons endpoint)
 * 2. Tabler import (re-import from local Tabler clone)
 *
 * Figma import is now a separate top-level admin tab.
 */
export function ImportPanel() {
  const { lang } = useI18n()
  const { toast } = useToast()
  const [subTab, setSubTab] = useState<'zip' | 'tabler'>('zip')

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 border-b border-slate-200">
        <SubTabBtn active={subTab === 'zip'} onClick={() => setSubTab('zip')}>
          {lang === 'ru' ? '📦 ZIP-архив' : '📦 ZIP Archive'}
        </SubTabBtn>
        <SubTabBtn active={subTab === 'tabler'} onClick={() => setSubTab('tabler')}>
          {lang === 'ru' ? '🗂 Tabler Icons' : '🗂 Tabler Icons'}
        </SubTabBtn>
      </div>

      {subTab === 'zip' && <ZipImport />}
      {subTab === 'tabler' && <TablerImport />}
    </div>
  )
}

// ─── Sub-tab button ─────────────────────────────────────
function SubTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

// ─── ZIP Import ────────────────────────────────────────
function ZipImport() {
  const { lang } = useI18n()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [parsedIcons, setParsedIcons] = useState<any[]>([])
  const [packInfo, setPackInfo] = useState<any>(null)
  const [category, setCategory] = useState('system')
  const [style, setStyle] = useState('outline')
  const [creating, setCreating] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload-icons', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.ok) {
        setParsedIcons(data.icons || [])
        setPackInfo(data.packInfo || null)
        toast({ title: lang === 'ru' ? `Распознано ${data.icons.length} иконок из ${data.totalFiles} файлов` : `Parsed ${data.icons.length} icons from ${data.totalFiles} files` })
      } else {
        toast({ title: data.error || 'Ошибка загрузки' })
      }
    } catch (e: any) {
      toast({ title: e?.message || 'Ошибка' })
    } finally {
      setUploading(false)
    }
  }

  const createPackFromParsed = async () => {
    if (parsedIcons.length === 0) return
    setCreating(true)

    try {
      const name = packInfo?.nameEn || 'Uploaded Pack'
      const res = await fetch('/api/admin/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameRu: packInfo?.nameRu || name,
          nameEn: name,
          descRu: packInfo?.descriptionRu || `Загружено из ZIP — ${parsedIcons.length} иконок`,
          descEn: packInfo?.descriptionEn || `Uploaded from ZIP — ${parsedIcons.length} icons`,
          category,
          style,
          isFree: true,
          icons: parsedIcons,
        }),
      })

      const data = await res.json()
      if (res.ok && data.pack) {
        toast({ title: lang === 'ru' ? `Пак "${name}" создан с ${data.pack._count?.icons || parsedIcons.length} иконками` : `Pack "${name}" created with ${data.pack._count?.icons || parsedIcons.length} icons` })
        setParsedIcons([])
        setPackInfo(null)
      } else {
        toast({ title: data.error || 'Ошибка создания пака' })
      }
    } catch (e: any) {
      toast({ title: e?.message || 'Ошибка' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          {lang === 'ru' ? 'Загрузка из ZIP-архива' : 'Upload from ZIP Archive'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'ru'
            ? 'Загрузите ZIP-архив с SVG-файлами. Иконки будут автоматически распознаны и разбиты по имени файла.'
            : 'Upload a ZIP archive with SVG files. Icons will be automatically parsed and named from filenames.'}
        </p>
      </div>

      {/* File input */}
      <div className="relative">
        <input
          type="file"
          accept=".zip"
          onChange={handleFileUpload}
          disabled={uploading}
          className="w-full px-3 py-8 rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-neutral-900 file:text-white hover:file:bg-neutral-700 file:cursor-pointer disabled:opacity-50"
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-neutral-900 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Parsed icons preview */}
      {parsedIcons.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm font-medium text-slate-900">
            {lang === 'ru' ? `Найдено ${parsedIcons.length} иконок` : `Found ${parsedIcons.length} icons`}
          </div>

          {/* Category + Style for pack creation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{lang === 'ru' ? 'Категория' : 'Category'}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white">
                {CATEGORIES.map(c => (
                  <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.nameRu : c.nameEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{lang === 'ru' ? 'Стиль' : 'Style'}</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white">
                <option value="outline">Outline</option>
                <option value="filled">Filled</option>
                <option value="duotone">Duotone</option>
              </select>
            </div>
          </div>

          {/* Icon grid preview */}
          <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50">
            {parsedIcons.slice(0, 96).map((ic, idx) => (
              <div key={idx} className="flex aspect-square items-center justify-center rounded border border-slate-200 bg-white" title={ic.nameEn}>
                <div dangerouslySetInnerHTML={{ __html: `<svg viewBox="${ic.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;color:#0a0a0a">${ic.svg}</svg>` }} />
              </div>
            ))}
            {parsedIcons.length > 96 && (
              <div className="flex aspect-square items-center justify-center rounded border border-slate-200 bg-slate-100 text-xs text-slate-500">
                +{parsedIcons.length - 96}
              </div>
            )}
          </div>

          <button
            onClick={createPackFromParsed}
            disabled={creating}
            className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {creating
              ? (lang === 'ru' ? 'Создание пака...' : 'Creating pack...')
              : (lang === 'ru' ? `📦 Создать пак (${parsedIcons.length} иконок)` : `📦 Create Pack (${parsedIcons.length} icons)`)
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tabler Import ─────────────────────────────────────
function TablerImport() {
  const { lang } = useI18n()
  const { toast } = useToast()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string[]>([])

  const handleImport = async () => {
    setImporting(true)
    setResult([])

    try {
      const res = await fetch('/api/admin/import-tabler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packs: [] }), // Server-side reads Tabler from its own files
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: lang === 'ru' ? `Импорт Tabler завершён` : `Tabler import complete` })
        setResult(data.results || [data.error || 'Unknown response'])
      } else {
        toast({ title: data.error || 'Ошибка' })
        setResult([data.error || 'Unknown error'])
      }
    } catch (e: any) {
      toast({ title: e?.message || 'Сетевая ошибка' })
      setResult([e?.message || 'Network error'])
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Tabler Icons
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'ru'
            ? 'Коллекция Tabler Icons (MIT License) — 5000+ иконок в 22 категориях. Каждый пак создается с outline и filled вариантами.'
            : 'Tabler Icons collection (MIT License) — 5000+ icons in 22 categories. Each pack is created with outline and filled variants.'}
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">5093</div>
          <div className="text-xs text-slate-500">{lang === 'ru' ? 'Outline иконок' : 'Outline icons'}</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">1053</div>
          <div className="text-xs text-slate-500">{lang === 'ru' ? 'Filled иконок' : 'Filled icons'}</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">22</div>
          <div className="text-xs text-slate-500">{lang === 'ru' ? 'Категорий' : 'Categories'}</div>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        {lang === 'ru'
          ? 'Иконки уже импортированы в базу данных. Повторный импорт пропустит существующие паки.'
          : 'Icons are already imported into the database. Re-import will skip existing packs.'}
      </div>

      {/* Result log */}
      {result.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-mono text-slate-600 max-h-60 overflow-y-auto space-y-0.5">
          {result.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={importing}
        className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      >
        {importing
          ? (lang === 'ru' ? 'Импортирование...' : 'Importing...')
          : (lang === 'ru' ? '🗂 Переимпортировать Tabler' : '🗂 Re-import Tabler')
        }
      </button>
    </div>
  )
}
