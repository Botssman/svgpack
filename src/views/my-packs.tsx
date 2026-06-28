'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

type SavedIcon = {
  id: string
  name: string
  config: Record<string, any> | null
  svgSnapshot: string | null
  baseIconId: string | null
}

type SavedPack = {
  id: string
  name: string
  basePack: { slug: string; nameRu: string; nameEn: string } | null
  iconCount: number
  icons: SavedIcon[]
  createdAt: string
}

export function MyPacks({ nav }: { nav: (v: View) => void }) {
  const { t, lang } = useI18n()
  const { user } = useUser()
  const { toast } = useToast()
  const [packs, setPacks] = useState<SavedPack[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPacks = async () => {
    if (!user) { setLoading(false); return }
    try {
      const res = await fetch('/api/packs/saved', {
        headers: { 'x-user-email': user.email },
      })
      const data = await res.json()
      setPacks(data.packs || [])
    } catch {
      setPacks([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchPacks() }, [user])

  const handleDelete = async (packId: string) => {
    if (!user) return
    setDeleting(packId)
    try {
      const res = await fetch(`/api/packs/saved/${packId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': user.email },
      })
      if (res.ok) {
        setPacks(prev => prev.filter(p => p.id !== packId))
        toast({ title: t.toast.saved })
      }
    } catch {}
    setDeleting(null)
  }

  const handleDownload = async (packId: string, packName: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/download/saved/${packId}`, {
        headers: { 'x-user-email': user.email },
      })
      if (res.status === 403) {
        const data = await res.json()
        toast({ title: data.message || (lang === 'ru' ? 'Лимит скачиваний' : 'Download limit') })
        return
      }
      if (!res.ok) {
        toast({ title: t.toast.error })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${packName}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: t.toast.downloaded })
    } catch {
      toast({ title: t.toast.error })
    }
  }

  if (!user) {
    return (
      <div className="container-narrow py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">
          {lang === 'ru' ? 'Мои паки' : 'My Packs'}
        </h1>
        <p className="text-slate-600 mb-6">
          {lang === 'ru' ? 'Войдите, чтобы видеть сохранённые паки' : 'Log in to see your saved packs'}
        </p>
        <button
          onClick={() => nav({ name: 'account' })}
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          {t.common.login}
        </button>
      </div>
    )
  }

  const hasActiveSub = !!user.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date())
  const buildsLeft = hasActiveSub ? '∞' : Math.max(0, 3 - user.freeBuildsUsed)

  return (
    <div className="container-wide py-10">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          {lang === 'ru' ? 'Личный кабинет' : 'Personal Account'}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
          {lang === 'ru' ? 'Мои паки' : 'My Packs'}
        </h1>
        <p className="mt-2 text-neutral-600">
          {lang === 'ru'
            ? `Сохранённые кастомизированные паки. Скачиваний осталось: ${buildsLeft} в этом месяце`
            : `Saved customized packs. Downloads left: ${buildsLeft} this month`}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-neutral-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <rect x="13" y="3" width="8" height="8" rx="1" />
              <rect x="3" y="13" width="8" height="8" rx="1" />
              <rect x="13" y="13" width="8" height="8" rx="1" />
            </svg>
          </div>
          <p className="text-neutral-600 mb-4">
            {lang === 'ru'
              ? 'У вас пока нет сохранённых паков'
              : 'You have no saved packs yet'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => nav({ name: 'catalog' })}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
            >
              {t.nav.catalog}
            </button>
            <button
              onClick={() => nav({ name: 'builder' })}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              {lang === 'ru' ? 'Собрать пак' : 'Build pack'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {packs.map(pack => (
            <div
              key={pack.id}
              className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300"
            >
              {/* Icon preview grid — like catalog cards */}
              <div className="grid w-full grid-cols-6 gap-2 bg-neutral-50/60 p-5">
                {pack.icons.slice(0, 12).map(icon => (
                  <div
                    key={icon.id}
                    className="flex aspect-square items-center justify-center rounded-lg border border-neutral-100 bg-white"
                    dangerouslySetInnerHTML={{
                      __html: icon.svgSnapshot
                        ? icon.svgSnapshot
                            .replace(/width="[^"]*"/, 'width="20"')
                            .replace(/height="[^"]*"/, 'height="20"')
                        : ''
                    }}
                  />
                ))}
                {pack.icons.length > 12 && (
                  <div className="flex aspect-square items-center justify-center rounded-lg border border-neutral-100 bg-white text-xs text-neutral-500 font-medium">
                    +{pack.icons.length - 12}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{pack.name}</h3>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {pack.basePack && (
                        <span className="font-mono">
                          {lang === 'ru' ? pack.basePack.nameRu : pack.basePack.nameEn}
                        </span>
                      )}
                      {pack.basePack && ' · '}
                      <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                    {pack.iconCount} {lang === 'ru' ? 'иконок' : 'icons'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleDownload(pack.id, pack.name)}
                    className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                  >
                    {lang === 'ru' ? 'Скачать ZIP' : 'Download ZIP'}
                  </button>
                  <button
                    onClick={() => handleDelete(pack.id)}
                    disabled={deleting === pack.id}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                  >
                    {deleting === pack.id ? '...' : (lang === 'ru' ? 'Удалить' : 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
