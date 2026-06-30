'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { View } from '@/lib/navigation'
import { PACKS } from '@/lib/packs-data'

/* ──────────────────────────────────────────────────────────────
   Local inline icons (consistent 1.5px stroke).
   ────────────────────────────────────────────────────────────── */
const Icon = {
  Arrow: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
  Palette: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 004-4 8 8 0 00-9-8z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6L3 12l5 6M16 6l5 6-5 6M14 4l-4 16" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 012-2h10" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  ),
  Browser: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
    </svg>
  ),
  Component: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  Card: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
}

/* Build slug -> svg map from canonical pack data */
function svgBySlug(slug: string): string {
  for (const pack of PACKS) {
    const found = pack.icons.find((i) => i.slug === slug)
    if (found) return found.svg
  }
  return ''
}

const ICONS: Record<string, string> = {
  html5: svgBySlug('html5'),
  css3: svgBySlug('css3'),
  js: svgBySlug('javascript'),
  ts: svgBySlug('typescript'),
  react: svgBySlug('react'),
  vue: svgBySlug('vue'),
  angular: svgBySlug('angular'),
  node: svgBySlug('nodejs'),
  git: svgBySlug('git'),
  docker: svgBySlug('docker'),
  terminal: svgBySlug('terminal'),
  figma: svgBySlug('figma'),
  browser: svgBySlug('browser'),
  server: svgBySlug('server'),
  api: svgBySlug('api'),
  database: svgBySlug('database'),
}

/* Pack theme colors for the hero preview cards */
const PACK_THEMES = [
  { name: 'Frontend essentials', count: 12, icons: ['js', 'ts', 'react', 'vue'] },
  { name: 'Backend tools', count: 7, icons: ['node', 'docker', 'git', 'api'] },
] as const

export function Home({ nav }: { nav: (v: View) => void }) {
  const { t, lang } = useI18n()

  // Fetch live stats from DB
  const [stats, setStats] = useState({ packs: 0, icons: 0 })
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setStats({ packs: d.packs || 0, icons: d.icons || 0 }))
      .catch(() => {})
  }, [])

  const totalPacks = stats.packs
  const totalIcons = stats.icons

  return (
    <div>
      {/* ────────── HERO ────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[50rem] w-[90rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-100/40 via-white to-transparent blur-3xl" />
        </div>

        <div className="container-wide pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm">
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
                {t.hero.badge}
              </div>

              <h1 className="mt-6 text-[4rem] font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-[4.8rem] md:text-[5.6rem] lg:text-[6.4rem]">
                {t.hero.title}
                <br />
                <span className="text-neutral-400">{t.hero.titleAccent}</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-600">
                {t.hero.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => nav({ name: 'catalog' })}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-soft transition-all hover:bg-neutral-700 hover:shadow-lift"
                >
                  {t.hero.ctaPrimary}
                  <Icon.Arrow />
                </button>
                <button
                  onClick={() => nav({ name: 'builder' })}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>

              {/* Mini stats */}
              <div className="mt-12 flex flex-wrap gap-8">
                <Stat value={`${totalIcons} ${lang === 'ru' ? 'иконок' : 'icons'}`} label={`${lang === 'ru' ? 'в' : 'in'} ${totalPacks} ${lang === 'ru' ? 'паков' : 'packs'}`} />
                <Stat value={t.hero.stat2} label={t.hero.stat2Label} />
                <Stat value={t.hero.stat3} label={t.hero.stat3Label} />
              </div>
            </div>

            {/* Right — icon grid card */}
            <div className="relative">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-lift">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                      Popular
                    </div>
                    <div className="mt-1 text-sm font-semibold text-neutral-900">
                      {PACK_THEMES[0].name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    {PACK_THEMES[0].count} icons
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-3">
                  {PREVIEW_ICONS.map((ic, i) => (
                    <div
                      key={i}
                      className="group flex aspect-square items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50/50 transition-colors hover:border-neutral-200 hover:bg-white"
                    >
                      <IconView
                        innerSvg={ic}
                        cfg={{ color: '#0a0a0a', strokeWidth: 1.5 }}
                        size={28}
                        className="transition-transform group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <div className="flex -space-x-2">
                    {PREVIEW_ICONS.slice(0, 3).map((ic, i) => (
                      <div key={i} className="rounded-full bg-white p-1 ring-2 ring-white">
                        <div className="h-6 w-6">
                          <IconView innerSvg={ic} cfg={{ color: '#0a0a0a', strokeWidth: 1.5 }} fill />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => nav({ name: 'catalog' })}
                    className="text-xs font-medium text-neutral-900 hover:text-neutral-600"
                  >
                    {t.packView.customizePack} →
                  </button>
                </div>
              </div>

              {/* Floating preview chip */}
              <div className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-lift sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                  <Icon.Copy />
                </div>
                <div>
                  <div className="text-[1.1rem] font-medium text-neutral-900">Copy SVG</div>
                  <div className="text-[1rem] text-neutral-500">{t.features.f5Title.toLowerCase()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── FEATURES ────────── */}
      <section className="border-t border-neutral-200 bg-neutral-50/60">
        <div className="container-wide py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {t.features.title}
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              {t.features.subtitle}
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Icon.Browser />} title={t.features.f1Title} desc={t.features.f1Desc} />
            <Feature icon={<Icon.Palette />} title={t.features.f2Title} desc={t.features.f2Desc} />
            <Feature icon={<Icon.Card />} title={t.features.f3Title} desc={t.features.f3Desc} />
            <Feature icon={<Icon.Component />} title={t.features.f4Title} desc={t.features.f4Desc} />
            <Feature icon={<Icon.Copy />} title={t.features.f5Title} desc={t.features.f5Desc} />
            <Feature icon={<Icon.Globe />} title={t.features.f6Title} desc={t.features.f6Desc} />
          </div>
        </div>
      </section>

      {/* ────────── PRICING ────────── */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="container-wide py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {t.pricing.title}
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              {t.pricing.subtitle}
            </h2>
          </div>

          <div className="mx-auto mt-14 grid max-w-[120rem] gap-5 md:grid-cols-3">
            <PriceCard
              name={t.pricing.oneTime}
              price={t.pricing.oneTimePrice}
              desc={t.pricing.oneTimeDesc}
              features={[t.pricing.oneTimeF1, t.pricing.oneTimeF2, t.pricing.oneTimeF3]}
              cta={t.pricing.oneTimeCta}
              onClick={() => nav({ name: 'billing' })}
            />
            <PriceCard
              name={t.pricing.sub}
              price={t.pricing.subPrice}
              desc={t.pricing.subDesc}
              features={[t.pricing.subF1, t.pricing.subF2, t.pricing.subF3]}
              cta={t.pricing.subCta}
              highlighted
              onClick={() => nav({ name: 'billing' })}
            />
            <PriceCard
              name={t.pricing.credits}
              price={t.pricing.creditsPrice}
              desc={t.pricing.creditsDesc}
              features={[t.pricing.creditsF1, t.pricing.creditsF2, t.pricing.creditsF3]}
              cta={t.pricing.creditsCta}
              onClick={() => nav({ name: 'billing' })}
            />
          </div>

          <p className="mt-8 text-center text-xs text-neutral-500">{t.pricing.note}</p>
        </div>
      </section>

      {/* ────────── FAQ ────────── */}
      <section className="border-t border-neutral-200 bg-neutral-50/60">
        <div className="container-narrow py-20 md:py-28">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">FAQ</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              {t.faq.title}
            </h2>
          </div>
          <div className="mt-12 space-y-3">
            <Faq q={t.faq.q1} a={t.faq.a1} />
            <Faq q={t.faq.q2} a={t.faq.a2} />
            <Faq q={t.faq.q3} a={t.faq.a3} />
            <Faq q={t.faq.q4} a={t.faq.a4} />
            <Faq q={t.faq.q5} a={t.faq.a5} />
          </div>
        </div>
      </section>

      {/* ────────── CTA ────────── */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="container-wide py-20 md:py-28">
          <div className="relative overflow-hidden rounded-3xl bg-neutral-900 px-8 py-16 text-center md:px-16 md:py-20">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-64 w-[60rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
                {t.account.credits} — 10 / {t.common.ctaStart.toLowerCase()}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-neutral-400">
                {t.features.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => nav({ name: 'account' })}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                >
                  {t.common.ctaStart}
                  <Icon.Arrow />
                </button>
                <button
                  onClick={() => nav({ name: 'catalog' })}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  {t.hero.ctaPrimary}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tracking-tight text-neutral-900">{value}</div>
      <div className="mt-1 text-sm text-neutral-500">{label}</div>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white transition-colors group-hover:bg-blue-600">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{desc}</p>
    </div>
  )
}

function PriceCard({
  name,
  price,
  desc,
  features,
  cta,
  highlighted,
  onClick,
}: {
  name: string
  price: string
  desc: string
  features: string[]
  cta: string
  highlighted?: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-7 ${
        highlighted
          ? 'border-2 border-neutral-900 bg-neutral-900 text-white shadow-lift'
          : 'border border-neutral-200 bg-white'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          ★ Popular
        </span>
      )}
      <h3 className={`text-lg font-semibold ${highlighted ? 'text-white' : 'text-neutral-900'}`}>
        {name}
      </h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className={`text-4xl font-bold tracking-tight ${highlighted ? 'text-white' : 'text-neutral-900'}`}>
          {price}
        </span>
      </div>
      <p className={`mt-3 text-sm ${highlighted ? 'text-neutral-400' : 'text-neutral-600'}`}>{desc}</p>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                highlighted ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-white'
              }`}
            >
              <Icon.Check />
            </span>
            <span className={highlighted ? 'text-neutral-200' : 'text-neutral-700'}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        className={`mt-8 w-full rounded-xl py-3 text-sm font-medium transition-colors ${
          highlighted
            ? 'bg-white text-neutral-900 hover:bg-neutral-100'
            : 'bg-neutral-900 text-white hover:bg-neutral-700'
        }`}
      >
        {cta}
      </button>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-neutral-200 bg-white p-5 open:shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="font-semibold text-neutral-900">{q}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-transform group-open:rotate-45">
          <Icon.Plus />
        </span>
      </summary>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600">{a}</p>
    </details>
  )
}

const PREVIEW_ICONS = [
  ICONS.html5, ICONS.css3, ICONS.js, ICONS.ts,
  ICONS.react, ICONS.vue, ICONS.angular, ICONS.node,
  ICONS.git, ICONS.docker, ICONS.terminal, ICONS.figma,
  ICONS.browser, ICONS.server, ICONS.api, ICONS.database,
]
