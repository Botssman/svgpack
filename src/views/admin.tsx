'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useUser } from '@/lib/user-store'
import { useToast } from '@/hooks/use-toast'

type UploadedIcon = {
  slug: string
  nameRu: string
  nameEn: string
  keywords: string
  svg: string
  viewBox: string
}

type Pack = {
  id: string; slug: string; nameRu: string; nameEn: string; descRu: string; descEn: string;
  category: string; style: string; tags: string; priceCredits: number; isFree: boolean;
  _count?: { icons: number }
  icons?: { id: string; slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }[]
}

export function Admin() {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const { user } = useUser()
  const [stats, setStats] = useState({ packs: 0, icons: 0, users: 0, revenue: 0 })
  const [packs, setPacks] = useState<Pack[]>([])
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Pack | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Server-side pagination + filters
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  // Filter state (search is debounced)
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStyle, setFilterStyle] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQ(value)
      setPage(1)
    }, 300)
  }

  const clearSearch = () => {
    setSearchInput('')
    setQ('')
    setPage(1)
  }

  // Fetch packs with server-side filtering + pagination
  const fetchPacks = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (q) params.set('q', q)
    if (filterCategory) params.set('category', filterCategory)
    if (filterStyle) params.set('style', filterStyle)
    const res = await fetch(`/api/admin/packs?${params}`)
    const data = await res.json()
    setPacks(data.packs || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 1)
    setLoading(false)
  }, [page, q, filterCategory, filterStyle])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const statsRes = await fetch('/api/admin/stats').then(r => r.json())
    setStats(statsRes)
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchStats(), fetchPacks()])
  }, [fetchStats, fetchPacks])

  // Initial load
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Fetch packs when filters/pagination change
  useEffect(() => {
    fetchPacks()
  }, [fetchPacks])

  const deletePackFromList = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/packs/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        const info = data.deleted ? ` (${data.deleted.icons} иконок)` : ''
        toast({ title: `Пак «${lang === 'ru' ? deleteTarget.nameRu : deleteTarget.nameEn}» удалён${info}` })
        if (selectedPack?.id === deleteTarget.id) setSelectedPack(null)
        setDeleteTarget(null)
        refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: data.error || 'Ошибка удаления пака' })
      }
    } catch {
      toast({ title: 'Ошибка удаления пака' })
    } finally {
      setDeleting(false)
    }
  }

  const syncPacks = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/sync-packs?force=1', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        const parts: string[] = []
        if (data.added > 0) parts.push(`Добавлено ${data.added} пак(ов)`)
        if (data.updated > 0) parts.push(`Обновлено ${data.updated} пак(ов)`)
        if (data.skipped > 0) parts.push(`Без изменений ${data.skipped}`)
        toast({ title: parts.length > 0 ? parts.join(', ') : 'Все паки актуальны' })
        refresh()
      } else {
        toast({ title: `Ошибка: ${data.error}` })
      }
    } catch {
      toast({ title: 'Ошибка синхронизации' })
    } finally {
      setSyncing(false)
    }
  }



  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="container-narrow flex min-h-[50vh] flex-col items-center justify-center py-20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">Доступ ограничен</h2>
        <p className="text-sm text-neutral-500 mb-5">Только для администраторов и модераторов</p>
        <a
          href="/admin/login"
          className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
        >
          Войти в админку
        </a>
      </div>
    )
  }

  return (
    <div className="container-wide py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.admin.title}</h1>
        <p className="mt-2 text-slate-600">{t.admin.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label={t.admin.statsPacks} value={stats.packs} />
        <StatCard label={t.admin.statsIcons} value={stats.icons} />
        <StatCard label={t.admin.statsUsers} value={stats.users} />
        <StatCard label={t.admin.statsRevenue} value={`$${stats.revenue.toFixed(2)}`} />
      </div>

      {/* Sync + Fix buttons */}
      <div className="mb-8 flex flex-wrap gap-3">
        <div>
          <button
            onClick={syncPacks}
            disabled={syncing}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Синхронизация...' : '🔄 Синхронизировать паки из кода'}
          </button>
          <p className="mt-1 text-xs text-slate-500">Обновляет все паки из кода в базу данных</p>
        </div>
        <div>
          <button
            onClick={async () => {
              setSyncing(true)
              try {
                const res = await fetch('/api/admin/fix-viewbox', { method: 'POST' })
                const data = await res.json()
                if (data.ok) {
                  toast({ title: `Исправлено ${data.fixed} иконок (из ${data.total})` })
                  refresh()
                } else {
                  toast({ title: 'Ошибка исправления viewBox' })
                }
              } catch {
                toast({ title: 'Ошибка исправления viewBox' })
              } finally {
                setSyncing(false)
              }
            }}
            disabled={syncing}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            🔧 Исправить viewBox
          </button>
          <p className="mt-1 text-xs text-slate-500">Автоисправление viewBox для иконок с обрезанными превью</p>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Удалить пак?</h3>
            <p className="text-sm text-slate-600 mb-1">
              Пак <strong>«{lang === 'ru' ? deleteTarget.nameRu : deleteTarget.nameEn}»</strong> будет удалён навсегда.
            </p>
            <p className="text-sm text-rose-600 mb-5">
              Все иконки в этом паке ({deleteTarget._count?.icons ?? deleteTarget.icons?.length ?? 0} шт.) будут также удалены из базы данных.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={deletePackFromList}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two panes: packs list + pack editor */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Packs list */}
        <div className="rounded-xl border border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{t.admin.packs} <span className="text-slate-400 font-normal">({total})</span></h2>
              <button
                onClick={() => setSelectedPack({} as Pack)}
                className="text-xs px-2 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800"
              >
                + {t.admin.newPack}
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <svg viewBox="0 0 24 24" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Поиск по названию или slug..."
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              {searchInput && (
                <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>
            {/* Filters row */}
            <div className="flex gap-2">
              {/* Category filter */}
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
                className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Все категории</option>
                <option value="languages">languages</option>
                <option value="frameworks">frameworks</option>
                <option value="tools">tools</option>
                <option value="concepts">concepts</option>
                <option value="education">education</option>
              </select>
              {/* Style filter */}
              <select
                value={filterStyle}
                onChange={(e) => { setFilterStyle(e.target.value); setPage(1) }}
                className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Все стили</option>
                <option value="outline">outline</option>
                <option value="filled">filled</option>
                <option value="duotone">duotone</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0" style={{ maxHeight: 'calc(100vh - 480px)' }}>
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Загрузка...</div>
            ) : packs.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">{total === 0 ? 'Нет паков' : 'Ничего не найдено'}</div>
            ) : (
              packs.map((p) => (
                <div
                  key={p.id}
                  className={`group flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors cursor-pointer ${selectedPack?.id === p.id ? 'bg-slate-50' : ''}`}
                >
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/packs/${p.id}`)
                        if (!res.ok) { toast({ title: `Ошибка загрузки: HTTP ${res.status}` }); return }
                        const d = await res.json()
                        if (d.pack) setSelectedPack(d.pack)
                        else toast({ title: 'Пак не найден в базе' })
                      } catch { toast({ title: 'Ошибка загрузки пака' }) }
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-medium text-sm text-slate-900 truncate">{lang === 'ru' ? p.nameRu : p.nameEn}</div>
                    <div className="text-xs text-slate-500 truncate">{p.slug} · {p._count?.icons ?? p.icons?.length ?? 0} {t.catalog.iconsCount} · <span className="text-slate-400">{p.category}</span> · <span className="text-slate-400">{p.style}</span></div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                    className="flex-shrink-0 p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Удалить пак"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Назад
              </button>
              <span className="text-xs text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>

        {/* Pack editor */}
        <div className="rounded-xl border border-slate-200 bg-white">
          {!selectedPack ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              ← {t.admin.packs}
            </div>
          ) : (
            <PackEditor pack={selectedPack} onSaved={refresh} onReloadPack={(p) => setSelectedPack(p)} onDeleted={() => { setSelectedPack(null); refresh() }} onDeleteRequest={(p) => setDeleteTarget(p)} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  )
}

function PackEditor({ pack, onSaved, onDeleted, onDeleteRequest, onReloadPack }: { pack: Pack; onSaved: () => void; onDeleted: () => void; onDeleteRequest: (p: Pack) => void; onReloadPack: (p: Pack) => void }) {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const isNew = !pack.id
  const [form, setForm] = useState({
    nameRu: pack.nameRu || '',
    nameEn: pack.nameEn || '',
    descRu: pack.descRu || '',
    descEn: pack.descEn || '',
    slug: pack.slug || '',
    category: pack.category || 'concepts',
    style: pack.style || 'outline',
    tags: pack.tags || '',
    priceCredits: pack.priceCredits ?? 10,
    isFree: pack.isFree ?? true,
  })
  const [newIcon, setNewIcon] = useState({ slug: '', nameRu: '', nameEn: '', keywords: '', svg: '' })
  const [uploadedIcons, setUploadedIcons] = useState<UploadedIcon[]>([])
  const [uploading, setUploading] = useState(false)
  const [savingIcons, setSavingIcons] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert English name to slug: transliterate, kebab-case, lowercase
  const nameEnToSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove non-latin chars
      .replace(/\s+/g, '-')           // spaces to hyphens
      .replace(/-+/g, '-')            // collapse hyphens
      .replace(/^-|-$/g, '')          // trim hyphens
  }

  const handleNameEnChange = (v: string) => {
    const updated = { ...form, nameEn: v }
    if (!slugManuallyEdited) {
      updated.slug = nameEnToSlug(v)
    }
    setForm(updated)
  }

  const handleSlugChange = (v: string) => {
    setSlugManuallyEdited(true)
    setForm({ ...form, slug: v })
  }

  const savePack = async () => {
    // Ensure slug is filled from nameEn if empty
    const dataToSave = { ...form }
    if (!dataToSave.slug && dataToSave.nameEn) {
      dataToSave.slug = nameEnToSlug(dataToSave.nameEn)
      setForm({ ...form, slug: dataToSave.slug })
    }

    if (isNew) {
      const res = await fetch('/api/admin/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })
      if (res.ok) {
        toast({ title: t.toast.saved })
        onSaved()
      } else {
        const d = await res.json().catch(() => ({}))
        toast({ title: d.error || 'Ошибка сохранения' })
      }
    } else {
      const res = await fetch(`/api/admin/packs/${pack.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })
      if (res.ok) { toast({ title: t.toast.saved }); onSaved() }
      else {
        const d = await res.json().catch(() => ({}))
        toast({ title: d.error || 'Ошибка сохранения' })
      }
    }
  }

  const addIcon = async () => {
    if (!newIcon.slug || !newIcon.svg || !newIcon.nameRu) {
      toast({ title: t.toast.error })
      return
    }
    const res = await fetch('/api/admin/icons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newIcon, packId: pack.id, viewBox: '0 0 24 24' }),
    })
    if (res.ok) {
      toast({ title: t.toast.saved })
      setNewIcon({ slug: '', nameRu: '', nameEn: '', keywords: '', svg: '' })
      onSaved()
    }
  }

  const processZipFile = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast({ title: 'Только .zip файлы' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-icons', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.ok && data.icons?.length > 0) {
        setUploadedIcons(data.icons)
        // Auto-fill pack form from pack-info.json if present
        if (data.packInfo) {
          const updates: Partial<typeof form> = {}
          if (data.packInfo.nameEn && !form.nameEn) updates.nameEn = data.packInfo.nameEn
          if (data.packInfo.nameRu && !form.nameRu) updates.nameRu = data.packInfo.nameRu
          if (data.packInfo.descriptionEn && !form.descEn) updates.descEn = data.packInfo.descriptionEn
          if (data.packInfo.descriptionRu && !form.descRu) updates.descRu = data.packInfo.descriptionRu
          if (Object.keys(updates).length > 0) {
            setForm(prev => {
              const next = { ...prev, ...updates }
              // Auto-generate slug from nameEn if slug wasn't manually edited
              if (!slugManuallyEdited && updates.nameEn) {
                next.slug = nameEnToSlug(updates.nameEn)
              }
              return next
            })
          }
          toast({ title: `Извлечено ${data.icons.length} иконок + описание пака из архива` })
        } else {
          toast({ title: `Извлечено ${data.icons.length} иконок из архива` })
        }
      } else {
        toast({ title: data.error || 'В архиве не найдено SVG-файлов' })
      }
    } catch {
      toast({ title: 'Ошибка загрузки архива' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleZipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processZipFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processZipFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const updateUploadedIcon = (index: number, field: string, value: string) => {
    setUploadedIcons(prev => prev.map((ic, i) => i === index ? { ...ic, [field]: value } : ic))
  }

  const removeUploadedIcon = (index: number) => {
    setUploadedIcons(prev => prev.filter((_, i) => i !== index))
  }

  const savePackAndReturnId = async (): Promise<string | null> => {
    if (!isNew) return pack.id
    // Auto-save new pack first
    if (!form.slug || !form.nameRu) {
      toast({ title: 'Заполните slug и название перед добавлением иконок' })
      return null
    }
    const res = await fetch('/api/admin/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      toast({ title: t.toast.saved })
      onSaved()
      return data.pack?.id || data.id || null
    }
    toast({ title: 'Ошибка создания пака' })
    return null
  }

  const saveAllUploadedIcons = async () => {
    if (uploadedIcons.length === 0) return
    setSavingIcons(true)
    try {
      let packId = pack.id
      if (!packId) {
        const id = await savePackAndReturnId()
        if (!id) { setSavingIcons(false); return }
        packId = id
      }
      let added = 0
      let errors = 0
      const errorMessages: string[] = []
      for (const icon of uploadedIcons) {
        const res = await fetch('/api/admin/icons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...icon, packId }),
        })
        if (res.ok) {
          added++
        } else {
          errors++
          const errData = await res.json().catch(() => ({}))
          const msg = errData.error || `HTTP ${res.status}`
          // Only show first few unique errors
          if (errorMessages.length < 3 && !errorMessages.includes(msg)) {
            errorMessages.push(msg)
          }
        }
      }
      if (errors > 0) {
        toast({ title: `Добавлено ${added}, ошибок: ${errors}. ${errorMessages.join('; ')}` })
      } else {
        toast({ title: `Добавлено ${added} иконок` })
      }
      setUploadedIcons([])
      // Reload the selected pack to show new icons in the editor
      try {
        const reloadRes = await fetch(`/api/admin/packs/${packId}`)
        if (reloadRes.ok) {
          const d = await reloadRes.json()
          if (d.pack) onReloadPack(d.pack)
        }
      } catch {}
      onSaved()
    } catch {
      toast({ title: 'Ошибка сохранения иконок' })
    } finally {
      setSavingIcons(false)
    }
  }

  return (
    <>
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          {isNew ? t.admin.newPack : `${t.admin.editPack}: ${lang === 'ru' ? pack.nameRu : pack.nameEn}`}
        </h3>
        {!isNew && (
          <button
            onClick={() => onDeleteRequest(pack)}
            className="px-3 py-1.5 rounded-md bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            {t.admin.delete}
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input label={t.admin.packNameRu} value={form.nameRu} onChange={(v) => setForm({ ...form, nameRu: v })} />
        <Input label={t.admin.packNameEn} value={form.nameEn} onChange={handleNameEnChange} />
        <Input label={t.admin.packDescRu} value={form.descRu} onChange={(v) => setForm({ ...form, descRu: v })} />
        <Input label={t.admin.packDescEn} value={form.descEn} onChange={(v) => setForm({ ...form, descEn: v })} />
        <Input label={t.admin.packSlug} value={form.slug} onChange={handleSlugChange} />
        <Select
          label={t.admin.packCategory}
          value={form.category}
          onChange={(v) => setForm({ ...form, category: v })}
          options={[
            { value: 'languages', label: 'languages' },
            { value: 'frameworks', label: 'frameworks' },
            { value: 'tools', label: 'tools' },
            { value: 'concepts', label: 'concepts' },
            { value: 'education', label: 'education' },
          ]}
        />
        <Select
          label={t.admin.packStyle}
          value={form.style}
          onChange={(v) => setForm({ ...form, style: v })}
          options={[
            { value: 'outline', label: 'outline' },
            { value: 'filled', label: 'filled' },
            { value: 'duotone', label: 'duotone' },
          ]}
        />
        <Input label={t.admin.packTags} value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
        <Input
          label={t.admin.packPrice}
          type="number"
          value={String(form.priceCredits)}
          onChange={(v) => setForm({ ...form, priceCredits: parseInt(v) || 0 })}
        />
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
              className="rounded border-slate-300"
            />
            {t.admin.packFree}
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={savePack}
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          {t.admin.save}
        </button>
      </div>

      {/* Icons section — always show for existing packs, and ZIP upload for new too */}
      {!isNew && pack.icons && pack.icons.length > 0 && (
        <div className="pt-5 border-t border-slate-200">
          <h4 className="font-medium text-slate-900 mb-3">{t.admin.icons} ({pack.icons.length})</h4>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {pack.icons.map((ic) => (
              <div key={ic.id} className="aspect-square flex items-center justify-center bg-slate-50 rounded-md border border-slate-100 overflow-hidden">
                <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={{ color: '#0F172A', strokeWidth: 1.5 }} size={24} className="max-w-full max-h-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add icon manually — only for existing packs */}
      {!isNew && (
        <div className="p-4 rounded-lg bg-slate-50 space-y-3">
          <div className="text-sm font-medium text-slate-900">{t.admin.addIcon}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label={t.admin.iconSlug} value={newIcon.slug} onChange={(v) => setNewIcon({ ...newIcon, slug: v })} />
            <Input label={t.admin.iconNameRu} value={newIcon.nameRu} onChange={(v) => setNewIcon({ ...newIcon, nameRu: v })} />
            <Input label={t.admin.iconNameEn} value={newIcon.nameEn} onChange={(v) => setNewIcon({ ...newIcon, nameEn: v })} />
            <Input label={t.admin.iconKeywords} value={newIcon.keywords} onChange={(v) => setNewIcon({ ...newIcon, keywords: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.admin.iconSvg}</label>
            <textarea
              value={newIcon.svg}
              onChange={(e) => setNewIcon({ ...newIcon, svg: e.target.value })}
              placeholder={t.admin.svgHint}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
            />
          </div>
          {newIcon.svg && (
            <div className="flex items-center gap-2 p-3 bg-white rounded-md border border-slate-200">
              <span className="text-xs text-slate-500">Preview:</span>
              <IconView innerSvg={newIcon.svg} cfg={{ color: '#0F172A', strokeWidth: 1.75 }} size={32} />
            </div>
          )}
          <button
            onClick={addIcon}
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
          >
            + {t.admin.addIcon}
          </button>
        </div>
      )}

      {/* Upload ZIP section — always visible */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
        <div className="text-sm font-medium text-slate-900">Загрузить из ZIP-архива</div>
        {isNew && (
          <p className="text-xs text-amber-700 font-medium">
            Для новых паков: заполните slug и название, загрузите архив — пак создастся автоматически при сохранении иконок.
          </p>
        )}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            dragOver
              ? 'border-amber-500 bg-amber-100'
              : 'border-amber-300 bg-white/50 hover:border-amber-400 hover:bg-amber-50'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <svg viewBox="0 0 24 24" className={`w-8 h-8 ${dragOver ? 'text-amber-600' : 'text-amber-400'}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className={`text-sm font-medium ${dragOver ? 'text-amber-700' : 'text-amber-600'}`}>
            {uploading ? 'Обработка...' : dragOver ? 'Отпустите для загрузки' : 'Перетащите ZIP-архив сюда'}
          </span>
          <span className="text-xs text-slate-400">или нажмите для выбора файла</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {uploadedIcons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Извлечено: {uploadedIcons.length} иконок
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadedIcons([])}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Очистить
                </button>
                <button
                  onClick={saveAllUploadedIcons}
                  disabled={savingIcons}
                  className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {savingIcons ? 'Сохранение...' : `Добавить все в пак (${uploadedIcons.length})`}
                </button>
              </div>
            </div>

            {/* Preview grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {uploadedIcons.map((ic, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded-md border border-amber-200">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-50 rounded border border-slate-100 overflow-hidden">
                    <IconView innerSvg={ic.svg} viewBox={ic.viewBox} cfg={{ color: '#0F172A', strokeWidth: 1.5 }} size={24} className="max-w-full max-h-full" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        value={ic.slug}
                        onChange={(e) => updateUploadedIcon(idx, 'slug', e.target.value)}
                        placeholder="slug"
                        className="px-2 py-0.5 rounded border border-slate-200 text-xs"
                      />
                      <input
                        value={ic.nameRu}
                        onChange={(e) => updateUploadedIcon(idx, 'nameRu', e.target.value)}
                        placeholder="Название RU"
                        className="px-2 py-0.5 rounded border border-slate-200 text-xs"
                      />
                      <input
                        value={ic.nameEn}
                        onChange={(e) => updateUploadedIcon(idx, 'nameEn', e.target.value)}
                        placeholder="Name EN"
                        className="px-2 py-0.5 rounded border border-slate-200 text-xs"
                      />
                      <input
                        value={ic.keywords}
                        onChange={(e) => updateUploadedIcon(idx, 'keywords', e.target.value)}
                        placeholder="Ключевые слова"
                        className="px-2 py-0.5 rounded border border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeUploadedIcon(idx)}
                    className="flex-shrink-0 text-slate-400 hover:text-rose-500 text-xs"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

function Input({ label, value, onChange, type = 'text', disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
