'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { dict, Lang, Dict } from './dict'

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: Dict
}

const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('lang')) as Lang | null
    if (saved === 'ru' || saved === 'en') {
      requestAnimationFrame(() => setLangState(saved))
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem('lang', l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dict[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
