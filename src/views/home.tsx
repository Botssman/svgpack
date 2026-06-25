'use client'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { View } from '@/app/page'
import { PACKS } from '@/lib/packs-data'

// Build slug -> svg map from canonical pack data.
// For home-page-only icons (copy, card, palette, globe) we use Lucide paths directly.
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
  // Lucide paths for home-only icons (ISC license)
  component: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
}

export function Home({ nav }: { nav: (v: View) => void }) {
  const { t } = useI18n()

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t.hero.badge}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05]">
                {t.hero.title}{' '}
                <span className="text-slate-400">{t.hero.titleAccent}</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
                {t.hero.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => nav({ name: 'catalog' })}
                  className="px-5 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  {t.hero.ctaPrimary}
                </button>
                <button
                  onClick={() => nav({ name: 'builder' })}
                  className="px-5 py-2.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                <Stat value={t.hero.stat1} label={t.hero.stat1Label} />
                <Stat value={t.hero.stat2} label={t.hero.stat2Label} />
                <Stat value={t.hero.stat3} label={t.hero.stat3Label} />
              </div>
            </div>

            {/* Icon grid preview */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              {PREVIEW_ICONS.map((ic, i) => (
                <div
                  key={i}
                  className="aspect-square flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-100 transition-all cursor-pointer group"
                >
                  <IconView innerSvg={ic} cfg={{ color: '#0F172A', strokeWidth: 1.5 }} size={28} className="group-hover:scale-110 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-slate-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{t.features.title}</h2>
            <p className="mt-3 text-slate-600">{t.features.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature icon={ICONS.browser} title={t.features.f1Title} desc={t.features.f1Desc} />
            <Feature icon={ICONS.palette} title={t.features.f2Title} desc={t.features.f2Desc} />
            <Feature icon={ICONS.card} title={t.features.f3Title} desc={t.features.f3Desc} />
            <Feature icon={ICONS.component} title={t.features.f4Title} desc={t.features.f4Desc} />
            <Feature icon={ICONS.copy} title={t.features.f5Title} desc={t.features.f5Desc} />
            <Feature icon={ICONS.globe} title={t.features.f6Title} desc={t.features.f6Desc} />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-b border-slate-200 py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{t.pricing.title}</h2>
            <p className="mt-3 text-slate-600">{t.pricing.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
          <p className="text-center mt-6 text-xs text-slate-500">{t.pricing.note}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-8 text-center">{t.faq.title}</h2>
          <div className="space-y-4">
            <Faq q={t.faq.q1} a={t.faq.a1} />
            <Faq q={t.faq.q2} a={t.faq.a2} />
            <Faq q={t.faq.q3} a={t.faq.a3} />
            <Faq q={t.faq.q4} a={t.faq.a4} />
            <Faq q={t.faq.q5} a={t.faq.a5} />
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center mb-4">
        <IconView innerSvg={icon} cfg={{ color: '#FFFFFF', strokeWidth: 1.75 }} size={20} />
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
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
      className={`p-6 rounded-2xl border bg-white flex flex-col ${
        highlighted ? 'border-slate-900 shadow-lg ring-1 ring-slate-900/5' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-900">{name}</h3>
        {highlighted && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-white">★</span>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 mt-2">{price}</div>
      <p className="text-sm text-slate-600 mt-2">{desc}</p>
      <ul className="mt-6 space-y-2 text-sm text-slate-700 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`mt-6 w-full py-2.5 rounded-md text-sm font-medium transition-colors ${
          highlighted
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'border border-slate-200 text-slate-900 hover:bg-slate-50'
        }`}
      >
        {cta}
      </button>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-5 rounded-lg border border-slate-200 bg-white">
      <h3 className="font-medium text-slate-900 mb-2">{q}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
    </div>
  )
}

const PREVIEW_ICONS = [
  ICONS.html5, ICONS.css3, ICONS.js, ICONS.ts,
  ICONS.react, ICONS.vue, ICONS.angular, ICONS.node,
  ICONS.git, ICONS.docker, ICONS.terminal, ICONS.figma,
  ICONS.browser, ICONS.server, ICONS.api, ICONS.database,
]
