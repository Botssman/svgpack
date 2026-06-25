'use client'
import { useState } from 'react'
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

function Shell() {
  const [view, setView] = useState<View>({ name: 'home' })
  const { t } = useI18n()
  const { user } = useUser()
  const { items } = useBuild()
  const { lang, setLang } = useI18n()

  const nav = (next: View) => setView(next)

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => nav({ name: 'home' })} className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              I
            </div>
            <span className="font-semibold tracking-tight text-slate-900 group-hover:text-slate-600 transition-colors">
              IconPack Hub
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button
              onClick={() => nav({ name: 'catalog' })}
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
            >
              {t.nav.catalog}
            </button>
            <button
              onClick={() => nav({ name: 'builder' })}
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors relative"
            >
              {t.nav.builder}
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {items.length}
                </span>
              )}
            </button>
            <button
              onClick={() => nav({ name: 'billing' })}
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
            >
              {t.nav.billing}
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => nav({ name: 'admin' })}
                className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {t.nav.admin}
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-md text-xs font-medium overflow-hidden">
              <button
                onClick={() => setLang('ru')}
                className={`px-2 py-1 transition-colors ${lang === 'ru' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                RU
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 transition-colors ${lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                EN
              </button>
            </div>
            <button
              onClick={() => nav({ name: 'account' })}
              className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {user ? (user.email.split('@')[0]) : t.common.login}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden border-b border-slate-200 bg-white px-4 py-2 flex gap-2 overflow-x-auto text-sm">
        <button onClick={() => nav({ name: 'catalog' })} className="px-3 py-1 rounded-md hover:bg-slate-100 whitespace-nowrap">{t.nav.catalog}</button>
        <button onClick={() => nav({ name: 'builder' })} className="px-3 py-1 rounded-md hover:bg-slate-100 whitespace-nowrap">
          {t.nav.builder} {items.length > 0 && `(${items.length})`}
        </button>
        <button onClick={() => nav({ name: 'billing' })} className="px-3 py-1 rounded-md hover:bg-slate-100 whitespace-nowrap">{t.nav.billing}</button>
        {user?.role === 'admin' && (
          <button onClick={() => nav({ name: 'admin' })} className="px-3 py-1 rounded-md hover:bg-slate-100 whitespace-nowrap">{t.nav.admin}</button>
        )}
      </div>

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

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">I</div>
            <span>IconPack Hub — {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{t.common.demoMode}</span>
            <span>·</span>
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer" className="hover:text-slate-900">MIT</a>
          </div>
        </div>
      </footer>
    </div>
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
