'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-store'
import { View } from '@/lib/navigation'
import { useToast } from '@/hooks/use-toast'

export function Account({ nav }: { nav: (v: View) => void }) {
  const { t } = useI18n()
  const { user, login, logout } = useUser()
  const { toast } = useToast()
  const [email, setEmail] = useState('demo@iconhub.test')

  const handleLogin = async () => {
    if (!email) return
    await login(email)
    toast({ title: t.toast.saved })
  }

  const hasActiveSub = !!user?.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date())
  const buildsLeft = hasActiveSub ? '∞' : (user ? Math.max(0, 3 - user.freeBuildsUsed) : 0)

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t.account.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.account.login}</p>
        </div>
        <div className="space-y-4 p-6 rounded-xl border border-slate-200 bg-white">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">{t.account.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            {t.common.login}
          </button>
          <p className="text-xs text-slate-500 text-center">
            {t.common.demoMode} · demo@iconhub.test / admin@iconhub.test
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">{t.account.title}</h1>

      <div className="space-y-6">
        {/* Profile */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              {user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{user.name || user.email}</div>
              <div className="text-sm text-slate-600">{user.email}</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">{t.account.credits}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{user.credits}</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">{t.account.plan}</div>
              <div className="text-lg font-semibold text-slate-900 mt-1">
                {hasActiveSub ? t.account.planSub : t.account.planFree}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">{t.account.downloadsLeft}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{buildsLeft}<span className="text-sm font-normal text-slate-500">/3</span></div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">{t.nav.myPacks}</div>
              <button
                onClick={() => nav({ name: 'my-packs' })}
                className="mt-1 text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {t.account.open} →
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => nav({ name: 'billing' })}
            className="px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50"
          >
            {t.nav.billing}
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => nav({ name: 'admin' })}
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50"
            >
              {t.account.adminLink}
            </button>
          )}
          <button
            onClick={() => { logout(); nav({ name: 'home' }) }}
            className="px-4 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            {t.account.logout}
          </button>
        </div>

        {/* Purchase history */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">{t.account.history}</h2>
          </div>
          {user.purchases.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">{t.account.empty}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">{t.billing.date}</th>
                  <th className="text-left p-3">{t.billing.type}</th>
                  <th className="text-right p-3">{t.billing.amount}</th>
                  <th className="text-right p-3">{t.customize.credits}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {user.purchases.slice().reverse().map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 text-slate-600">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-medium text-slate-900">{p.kind}</td>
                    <td className="p-3 text-right">${p.amount.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">{p.credits > 0 ? `+${p.credits}` : p.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
