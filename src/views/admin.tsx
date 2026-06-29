'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { useUser } from '@/lib/user-store'
import { useToast } from '@/hooks/use-toast'

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

  const refresh = async () => {
    const [statsRes, packsRes] = await Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/packs').then(r => r.json()),
    ])
    setStats(statsRes)
    setPacks(packsRes.packs)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/packs').then(r => r.json()),
    ]).then(([s, p]) => {
      if (cancelled) return
      setStats(s)
      setPacks(p.packs)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label={t.admin.statsPacks} value={stats.packs} />
        <StatCard label={t.admin.statsIcons} value={stats.icons} />
        <StatCard label={t.admin.statsUsers} value={stats.users} />
        <StatCard label={t.admin.statsRevenue} value={`$${stats.revenue.toFixed(2)}`} />
      </div>

      {/* Two panes: packs list + pack editor */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Packs list */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t.admin.packs}</h2>
            <button
              onClick={() => setSelectedPack({} as Pack)}
              className="text-xs px-2 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              + {t.admin.newPack}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">...</div>
            ) : (
              packs.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    const res = await fetch(`/api/packs/${p.slug}`)
                    const d = await res.json()
                    setSelectedPack(d.pack)
                  }}
                  className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${selectedPack?.id === p.id ? 'bg-slate-50' : ''}`}
                >
                  <div className="font-medium text-sm text-slate-900">{lang === 'ru' ? p.nameRu : p.nameEn}</div>
                  <div className="text-xs text-slate-500">{p.slug} · {p._count?.icons ?? p.icons?.length ?? 0} {t.catalog.iconsCount}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Pack editor */}
        <div className="rounded-xl border border-slate-200 bg-white">
          {!selectedPack ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              ← {t.admin.packs}
            </div>
          ) : (
            <PackEditor pack={selectedPack} onSaved={refresh} onDeleted={() => { setSelectedPack(null); refresh() }} />
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

function PackEditor({ pack, onSaved, onDeleted }: { pack: Pack; onSaved: () => void; onDeleted: () => void }) {
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

  const savePack = async () => {
    if (isNew) {
      const res = await fetch('/api/admin/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: t.toast.saved })
        onSaved()
      }
    } else {
      const res = await fetch(`/api/admin/packs/${pack.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { toast({ title: t.toast.saved }); onSaved() }
    }
  }

  const deletePack = async () => {
    if (!confirm('Delete?')) return
    await fetch(`/api/admin/packs/${pack.id}`, { method: 'DELETE' })
    toast({ title: t.toast.saved })
    onDeleted()
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

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          {isNew ? t.admin.newPack : `${t.admin.editPack}: ${lang === 'ru' ? pack.nameRu : pack.nameEn}`}
        </h3>
        {!isNew && (
          <button onClick={deletePack} className="text-xs text-rose-600 hover:text-rose-700">{t.admin.delete}</button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input label={t.admin.packNameRu} value={form.nameRu} onChange={(v) => setForm({ ...form, nameRu: v })} />
        <Input label={t.admin.packNameEn} value={form.nameEn} onChange={(v) => setForm({ ...form, nameEn: v })} />
        <Input label={t.admin.packDescRu} value={form.descRu} onChange={(v) => setForm({ ...form, descRu: v })} />
        <Input label={t.admin.packDescEn} value={form.descEn} onChange={(v) => setForm({ ...form, descEn: v })} />
        <Input label={t.admin.packSlug} value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} disabled={!isNew} />
        <Select
          label={t.admin.packCategory}
          value={form.category}
          onChange={(v) => setForm({ ...form, category: v })}
          options={[
            { value: 'languages', label: 'languages' },
            { value: 'frameworks', label: 'frameworks' },
            { value: 'tools', label: 'tools' },
            { value: 'concepts', label: 'concepts' },
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

      {/* Icons in pack */}
      {!isNew && pack.icons && (
        <div className="pt-5 border-t border-slate-200">
          <h4 className="font-medium text-slate-900 mb-3">{t.admin.icons} ({pack.icons.length})</h4>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {pack.icons.map((ic) => (
              <div key={ic.id} className="aspect-square flex items-center justify-center bg-slate-50 rounded-md border border-slate-100">
                <IconView innerSvg={ic.svg} cfg={{ color: '#0F172A', strokeWidth: 1.5 }} size={24} />
              </div>
            ))}
          </div>

          {/* Add icon form */}
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
        </div>
      )}
    </div>
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
