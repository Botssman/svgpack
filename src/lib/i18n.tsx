'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { dict, Lang, Dict } from './dict'
import { LANG_COOKIE, LANG_DEFAULT } from './i18n-constants'

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: Dict
}

const I18nContext = createContext<Ctx | null>(null)

/**
 * Read lang from document.cookie on the client (sync, runs during render).
 * SSR-side cookie reading is handled by getLang() in i18n-server.ts,
 * and the resulting lang is passed to I18nProvider as `initialLang` prop
 * from app/layout.tsx — so first SSR paint uses the correct language.
 */
function readLangFromCookie(): Lang {
  if (typeof document === 'undefined') return LANG_DEFAULT
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))
  const raw = match ? decodeURIComponent(match[1]) : null
  if (raw === 'ru' || raw === 'en') return raw
  return LANG_DEFAULT
}

export function I18nProvider({
  children,
  initialLang,
}: {
  children: ReactNode
  initialLang: Lang
}) {
  // initialLang comes from server (cookie read via next/headers) — guarantees
  // the first SSR render matches what the client will hydrate with.
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = (l: Lang) => {
    setLangState(l)
    if (typeof document !== 'undefined') {
      // Persist for 1 year on root path. SameSite=Lax so it survives cross-site nav.
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`
    }
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
