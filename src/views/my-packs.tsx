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
        toast({ title: data.message || 'Лимит скачиваний' })
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {lang === 'ru' ? 'Мои паки' : 'My Packs'}
          </h1>
          <p className="mt-2 text-slate-600">
            {lang === 'ru'
              ? `Сохранённые кастомизированные паки. Скачиваний осталось: ${buildsLeft} в этом месяце`
              : `Saved customized packs. Downloads left: ${buildsLeft} this month`}
          </p>
        </div>
        <button
          onClick={() => nav({ name: 'builder' })}
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          {lang === 'ru' ? 'Собрать новый пак' : 'Build new pack'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-slate-600 mb-4">
            {lang === 'ru'
              ? 'У вас пока нет сохранённых паков'
              : 'You have no saved packs yet'}
          </p>
          <button
            onClick={() => nav({ name: 'catalog' })}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            {t.nav.catalog}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {packs.map(pack => (
            <div key={pack.id} className="p-5 rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{pack.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span>{pack.iconCount} {lang === 'ru' ? 'иконок' : 'icons'}</span>
                    {pack.basePack && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-medium">
                        {lang === 'ru' ? pack.basePack.nameRu : pack.basePack.nameEn}
                      </span>
                    )}
                    <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(pack.id, pack.name)}
                    className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    {lang === 'ru' ? 'Скачать ZIP' : 'Download ZIP'}
                  </button>
                  <button
                    onClick={() => handleDelete(pack.id)}
                    disabled={deleting === pack.id}
                    className="px-3 py-2 rounded-md border border-slate-200 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                  >
                    {deleting === pack.id ? '...' : (lang === 'ru' ? 'Удалить' : 'Delete')}
                  </button>
                </div>
              </div>
              {/* Иконки превью */}
              <div className="flex flex-wrap gap-2">
                {pack.icons.slice(0, 16).map(icon => (
                  <div
                    key={icon.id}
                    className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100"
                    dangerouslySetInnerHTML={{
                      __html: icon.svgSnapshot
                        ? icon.svgSnapshot.replace(/width="\d+"/, 'width="24"').replace(/height="\d+"/, 'height="24"')
                        : ''
                    }}
                  />
                ))}
                {pack.icons.length > 16 && (
                  <div className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100 text-xs text-slate-500 font-medium">
                    +{pack.icons.length - 16}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
