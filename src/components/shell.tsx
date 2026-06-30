'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-store'
import { useBuild } from '@/lib/build-store'

/* ═══════════════════════════════════════════════════════════════
   Header inline icons (consistent 1.5px stroke, 24px viewBox).
   Kept locally so the header is self-contained.
   ═══════════════════════════════════════════════════════════════ */
const HIcon = {
  Logo: () => (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#0a0a0a" />
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

/* ═══════════════════════════════════════════════════════════════
   Language switcher — globe + dropdown.
   ═══════════════════════════════════════════════════════════════ */
function LangSwitcher() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const options: { code: 'ru' | 'en'; label: string; native: string }[] = [
    { code: 'ru', label: 'Русский', native: 'RU' },
    { code: 'en', label: 'English', native: 'EN' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <HIcon.Globe />
        <span className="font-mono text-[1.1rem] uppercase tracking-wider">{lang}</span>
        <HIcon.Chevron />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lift"
        >
          {options.map((o) => (
            <button
              key={o.code}
              onClick={() => {
                setLang(o.code)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                lang === o.code
                  ? 'bg-neutral-900 text-white'
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

/* ═══════════════════════════════════════════════════════════════
   Header — sticky, with desktop nav and mobile drawer.
   Now uses next/link for navigation (real URLs, not client state).
   ═══════════════════════════════════════════════════════════════ */
function Header({ itemsCount }: { itemsCount: number }) {
  const { t } = useI18n()
  const { user } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [mobileOpen])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navItems: { label: string; href: string; badge?: number; adminOnly?: boolean; authOnly?: boolean }[] = [
    { label: t.nav.catalog, href: '/catalog' },
    { label: t.nav.icons, href: '/icons' },
    { label: t.nav.builder, href: '/builder', badge: itemsCount },
    { label: t.nav.myPacks, href: '/my-packs', authOnly: true },
    { label: t.nav.billing, href: '/pricing' },
    { label: t.nav.admin, href: '/admin', adminOnly: true },
  ].filter((i) => !i.adminOnly || user?.role === 'admin' || user?.role === 'moderator')
   .filter((i) => !i.authOnly || !!user)

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/85 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
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
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {item.label}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[1rem] font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <div className="hidden sm:block">
            <LangSwitcher />
          </div>

          <Link
            href="/account"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:block"
          >
            {user ? user.email.split('@')[0] : t.common.login}
          </Link>

          <Link
            href="/account"
            className="ml-1 hidden items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-700 hover:shadow-soft sm:flex"
          >
            {t.common.ctaStart}
            <HIcon.Arrow />
          </Link>

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
              <Link href="/" className="flex items-center gap-2">
                <HIcon.Logo />
                <span className="text-[1.5rem] font-semibold tracking-tight">IconPack Hub</span>
              </Link>
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
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                >
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[1.1rem] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
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
              <Link
                href="/account"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-3 text-sm font-medium text-white hover:bg-neutral-700"
              >
                {user ? user.email.split('@')[0] : t.common.ctaStart}
                <HIcon.Arrow />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Footer — 4-column layout with proper navigation.
   Columns: Brand+lang | Product | Resources | Company
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  const { t } = useI18n()
  const { lang, setLang } = useI18n()

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="container-wide py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {/* Brand + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <HIcon.Logo />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[1.5rem] font-semibold tracking-tight text-neutral-900">
                  IconPack
                </span>
                <span className="text-[1.5rem] font-medium tracking-tight text-neutral-400">
                  Hub
                </span>
              </div>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
              {t.footer.tagline}
            </p>

            {/* Inline language switch in footer (compact) */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                {t.common.language}:
              </span>
              <div className="flex gap-1">
                {(['ru', 'en'] as const).map((code) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`rounded-md px-2 py-1 text-xs font-mono uppercase transition-colors ${
                      lang === code
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white text-neutral-600 hover:bg-neutral-100 ring-1 ring-neutral-200'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {t.footer.productTitle}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/catalog" className="text-neutral-600 transition-colors hover:text-neutral-900">
                  {t.footer.catalog}
                </Link>
              </li>
              <li>
                <Link href="/icons" className="text-neutral-600 transition-colors hover:text-neutral-900">
                  {lang === 'ru' ? 'Иконки' : 'Icons'}
                </Link>
              </li>
              <li>
                <Link href="/builder" className="text-neutral-600 transition-colors hover:text-neutral-900">
                  {t.footer.builder}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neutral-600 transition-colors hover:text-neutral-900">
                  {t.footer.pricing}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {t.footer.resourcesTitle}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://opensource.org/licenses/MIT"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  {t.footer.license}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {t.footer.companyTitle}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:hello@iconpackhub.dev"
                  className="text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  {t.footer.contacts}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-neutral-200 pt-6 text-xs text-neutral-400 sm:flex-row sm:items-center">
          <div>{t.footer.copyright}</div>
          <div>{t.common.demoMode}</div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Shell — wraps page content with header + footer.
   Used by app/layout.tsx.
   ═══════════════════════════════════════════════════════════════ */
export function Shell({ children }: { children: React.ReactNode }) {
  const { items } = useBuild()
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <Header itemsCount={items.length} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
