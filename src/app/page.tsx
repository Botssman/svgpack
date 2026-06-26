'use client'
import { useState, useEffect, useRef } from 'react'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { UserProvider, useUser } from '@/lib/user-store'
import { BuildProvider, useBuild } from '@/lib/build-store'
import { Home } from '@/views/home'
import { Catalog } from '@/views/catalog'
import { PackView } from '@/views/pack-view'
import { Customize } from '@/views/customize'
import { Builder } from '@/views/builder'
import { Billing } from '@/views/billing'
import { Account } from '@/views/account'
import { Admin } from '@/views/admin'

export type View =
  | { name: 'home' }
  | { name: 'catalog' }
  | { name: 'pack'; slug: string }
  | { name: 'customize'; packSlug: string; iconId?: string }
  | { name: 'builder' }
  | { name: 'billing' }
  | { name: 'account' }
  | { name: 'admin' }

/* ──────────────────────────────────────────────────────────────
   Inline icons — consistent 1.5px stroke, 24px viewBox.
   Kept locally so the header is self-contained.
   ────────────────────────────────────────────────────────────── */
const HIcon = {
  Logo: () => (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
      {/* outer rounded square — solid neutral-900 */}
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#0a0a0a" />
      {/* abstract "stack of icons" mark in white */}
      <rect x="8" y="8" width="7" height="7" rx="1.5" fill="#ffffff" />
      <rect x="17" y="8" width="7" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.55" />
      <rect x="8" y="17" width="7" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.55" />
      <rect x="17" y="17" width="7" height="7" rx="1.5" fill="#ffffff" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Chevron: () => (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  ),
}

/* ──────────────────────────────────────────────────────────────
   Language switcher — globe + dropdown.
   Closes on outside-click / escape / option pick.
   ────────────────────────────────────────────────────────────── */
function LangSwitcher() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const options: { code: 'ru' | 'en'; label: string; native: string }[] = [
    { code: 'ru', label: 'Русский', native: 'RU' },
    { code: 'en', label: 'English', native: 'EN' },
  ]
  const current = options.find((o) => o.code === lang)!

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch language"
      >
        <HIcon.Globe />
        <span className="font-medium">{current.native}</span>
        <HIcon.Chevron />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lift"
        >
          {options.map((o) => (
            <button
              key={o.code}
              role="option"
              aria-selected={o.code === lang}
              onClick={() => {
                setLang(o.code)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                o.code === lang
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="font-medium">{o.label}</span>
              <span className="font-mono text-[1.1rem] uppercase tracking-wider text-neutral-400">
                {o.native}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Header — the main rework.
   Design principles:
   • Logo + wordmark on the left, with a thin separator strip after
   • Inline desktop nav with subtle hover backgrounds and a small
     "new" pip on the Builder when there are items in the build cart
   • Right side: language switcher (globe dropdown), ghost "Войти"
     button, solid primary CTA with a micro-arrow
   • Mobile: hamburger -> full-width drawer with the same items
   ────────────────────────────────────────────────────────────── */
function Header({ nav, itemsCount, user, t }: {
  nav: (v: View) => void
  itemsCount: number
  user: { email: string; role: string } | null
  t: ReturnType<typeof useI18n>['t']
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [mobileOpen])

  const navItems: { label: string; onClick: () => void; badge?: number; adminOnly?: boolean }[] = [
    { label: t.nav.catalog, onClick: () => nav({ name: 'catalog' }) },
    { label: t.nav.builder, onClick: () => nav({ name: 'builder' }), badge: itemsCount },
    { label: t.nav.billing, onClick: () => nav({ name: 'billing' }) },
    { label: t.nav.admin, onClick: () => nav({ name: 'admin' }), adminOnly: true },
  ].filter((i) => !i.adminOnly || user?.role === 'admin')

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo block */}
        <button
          onClick={() => nav({ name: 'home' })}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <HIcon.Logo />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.5rem] font-semibold tracking-tight text-neutral-900">
              IconPack
            </span>
            <span className="text-[1.5rem] font-medium tracking-tight text-neutral-400">
              Hub
            </span>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="relative rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[1rem] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <div className="hidden sm:block">
            <LangSwitcher />
          </div>

          <button
            onClick={() => nav({ name: 'account' })}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:block"
          >
            {user ? user.email.split('@')[0] : t.common.login}
          </button>

          <button
            onClick={() => nav({ name: 'account' })}
            className="ml-1 hidden items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-700 hover:shadow-soft sm:flex"
          >
            {t.common.ctaStart}
            <HIcon.Arrow />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
            aria-label="Open menu"
          >
            <HIcon.Menu />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm overflow-y-auto border-l border-neutral-200 bg-white p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { nav({ name: 'home' }); setMobileOpen(false) }}
                className="flex items-center gap-2"
              >
                <HIcon.Logo />
                <span className="text-[1.5rem] font-semibold tracking-tight">IconPack Hub</span>
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
                aria-label="Close menu"
              >
                <HIcon.Close />
              </button>
            </div>

            <div className="mt-6 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.onClick(); setMobileOpen(false) }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                >
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[1.1rem] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-5">
              <div className="mb-3 text-[1.1rem] font-semibold uppercase tracking-wider text-neutral-400">
                {t.common.language}
              </div>
              <div className="flex gap-2">
                <MobileLangButton code="ru" label="Русский" />
                <MobileLangButton code="en" label="English" />
              </div>
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-5">
              <button
                onClick={() => { nav({ name: 'account' }); setMobileOpen(false) }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-3 text-sm font-medium text-white hover:bg-neutral-700"
              >
                {user ? user.email.split('@')[0] : t.common.ctaStart}
                <HIcon.Arrow />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function MobileLangButton({ code, label }: { code: 'ru' | 'en'; label: string }) {
  const { lang, setLang } = useI18n()
  const active = lang === code
  return (
    <button
      onClick={() => setLang(code)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-neutral-900 text-white'
          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
      }`}
    >
      {label}
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────
   Shell — wires providers, header, view routing, footer.
   ────────────────────────────────────────────────────────────── */
function Shell() {
  const [view, setView] = useState<View>({ name: 'home' })
  const { t } = useI18n()
  const { user } = useUser()
  const { items } = useBuild()

  const nav = (next: View) => setView(next)

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <Header
        nav={nav}
        itemsCount={items.length}
        user={user}
        t={t}
      />

      <main className="flex-1">
        {view.name === 'home' && <Home nav={nav} />}
        {view.name === 'catalog' && <Catalog nav={nav} />}
        {view.name === 'pack' && <PackView slug={view.slug} nav={nav} />}
        {view.name === 'customize' && <Customize packSlug={view.packSlug} iconId={view.iconId} nav={nav} />}
        {view.name === 'builder' && <Builder nav={nav} />}
        {view.name === 'billing' && <Billing nav={nav} />}
        {view.name === 'account' && <Account nav={nav} />}
        {view.name === 'admin' && <Admin />}
      </main>

      <Footer t={t} nav={nav} />
    </div>
  )
}

/* Refined footer — keeps the same info but styled like the new design */
function Footer({ t, nav }: { t: ReturnType<typeof useI18n>['t']; nav: (v: View) => void }) {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <HIcon.Logo />
            <span className="text-sm font-semibold tracking-tight text-neutral-900">
              IconPack Hub
            </span>
            <span className="ml-2 text-xs text-neutral-400">© {new Date().getFullYear()}</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500">
            <button onClick={() => nav({ name: 'catalog' })} className="hover:text-neutral-900">
              {t.nav.catalog}
            </button>
            <button onClick={() => nav({ name: 'builder' })} className="hover:text-neutral-900">
              {t.nav.builder}
            </button>
            <button onClick={() => nav({ name: 'billing' })} className="hover:text-neutral-900">
              {t.nav.billing}
            </button>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-900"
            >
              MIT
            </a>
          </nav>

          <div className="text-xs text-neutral-400">
            {t.common.demoMode}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <UserProvider>
        <BuildProvider>
          <Shell />
        </BuildProvider>
      </UserProvider>
    </I18nProvider>
  )
}
