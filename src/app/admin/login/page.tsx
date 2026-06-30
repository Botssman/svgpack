'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-store'
import { useToast } from '@/hooks/use-toast'

const ADMIN_EMAILS = ['admin@iconhub.test', 'moderator@iconhub.test']

export default function AdminLoginPage() {
  const { t } = useI18n()
  const { user, login } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const [email, setEmail] = useState('admin@iconhub.test')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in as admin, redirect
  if (user && (user.role === 'admin' || user.role === 'moderator')) {
    router.push('/admin')
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await login(email)

      // Check role after login
      const meRes = await fetch('/api/me', { headers: { 'x-user-email': email } })
      const meData = await meRes.json()

      if (meData.user && (meData.user.role === 'admin' || meData.user.role === 'moderator')) {
        toast({ title: '✓ Вход выполнен' })
        router.push('/admin')
      } else {
        toast({ title: 'Нет прав администратора', description: `Роль: ${meData.user?.role || 'user'}` })
      }
    } catch {
      toast({ title: 'Ошибка входа' })
    }
    setLoading(false)
  }

  return (
    <div className="container-narrow flex min-h-[70vh] items-center justify-center py-20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Вход в админку</h1>
          <p className="mt-2 text-sm text-neutral-500">Только для администраторов и модераторов</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 p-6 rounded-xl border border-neutral-200 bg-white">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              placeholder="admin@iconhub.test"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
          <div className="pt-2 space-y-1.5">
            {ADMIN_EMAILS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmail(e)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400 text-center">Демо-режим: пароль не требуется</p>
        </form>

        <div className="mt-6 text-center">
          <a href="/account" className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
            Обычный вход →
          </a>
        </div>
      </div>
    </div>
  )
}
