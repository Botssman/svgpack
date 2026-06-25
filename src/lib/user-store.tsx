'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type User = {
  id: string
  email: string
  name: string | null
  role: string
  credits: number
  subscriptions: { id: string; status: string; expiresAt: string; plan: string }[]
  purchases: { id: string; kind: string; refId: string | null; amount: number; credits: number; createdAt: string }[]
}

type Ctx = {
  user: User | null
  loading: boolean
  login: (email: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const UserContext = createContext<Ctx | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
    if (!email) { setUser(null); setLoading(false); return }
    try {
      const res = await fetch('/api/me', { headers: { 'x-user-email': email } })
      const data = await res.json()
      setUser(data.user)
    } catch { setUser(null) }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const email = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
    if (!email) {
      requestAnimationFrame(() => { if (!cancelled) setLoading(false) })
      return
    }
    fetch('/api/me', { headers: { 'x-user-email': email } })
      .then(r => r.json())
      .then(data => { if (!cancelled) setUser(data.user) })
      .catch(() => { if (!cancelled) setUser(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const login = async (email: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (data.user) {
      localStorage.setItem('userEmail', email)
      setUser(data.user)
    }
  }

  const logout = () => {
    localStorage.removeItem('userEmail')
    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be inside UserProvider')
  return ctx
}
