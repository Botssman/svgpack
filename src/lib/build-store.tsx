'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type BuildItem = {
  iconId: string
  slug: string
  name: string
  svg: string
  viewBox: string
  packSlug: string
}

type Ctx = {
  items: BuildItem[]
  add: (item: BuildItem) => void
  remove: (iconId: string) => void
  clear: () => void
  has: (iconId: string) => boolean
}

const BuildContext = createContext<Ctx | null>(null)

export function BuildProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BuildItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('build')
      if (raw) requestAnimationFrame(() => setItems(JSON.parse(raw)))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('build', JSON.stringify(items))
  }, [items])

  const add = (item: BuildItem) => {
    setItems((prev) => (prev.find((i) => i.iconId === item.iconId) ? prev : [...prev, item]))
  }
  const remove = (iconId: string) => setItems((prev) => prev.filter((i) => i.iconId !== iconId))
  const clear = () => setItems([])
  const has = (iconId: string) => items.some((i) => i.iconId === iconId)

  return (
    <BuildContext.Provider value={{ items, add, remove, clear, has }}>
      {children}
    </BuildContext.Provider>
  )
}

export function useBuild() {
  const ctx = useContext(BuildContext)
  if (!ctx) throw new Error('useBuild must be inside BuildProvider')
  return ctx
}
