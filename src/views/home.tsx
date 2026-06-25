'use client'
import { useI18n } from '@/lib/i18n'
import { IconView } from '@/components/icon-view'
import { View } from '@/app/page'

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

const ICONS = {
  html5: '<path d="M4 4l1.5 16L12 22l6.5-2L20 4z"/><path d="M7 8h10l-.5 5H8.5L8.5 17 12 18l3.5-1 .3-3"/><path d="M8 6h8"/>',
  css3: '<path d="M4 4l1.5 16L12 22l6.5-2L20 4z"/><path d="M7 8h10l-.3 3H8.5L8.7 14h6.6l-.3 3-3 1-3-1-.2-2"/>',
  js: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17c0 1-.5 1.5-2 1.5"/><path d="M14 17c0 1 .8 1.5 2 1.5s2-.7 2-1.8c0-2-4-1.5-4-3.5 0-.8.6-1.3 1.7-1.3"/><path d="M11.5 13v5.5"/>',
  ts: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 11h6"/><path d="M12 11v6"/><path d="M16 16.2c0 .9.7 1.4 1.8 1.4 1 0 1.7-.5 1.7-1.4 0-2-3.5-1.2-3.5-3 0-.7.6-1.2 1.6-1.2.8 0 1.4.3 1.7.9"/>',
  react: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  vue: '<path d="M3 4l9 16L21 4z"/><path d="M7 6l5 9 5-9"/>',
  angular: '<path d="M12 2l9 4-2 12-7 4-7-4L3 6z"/><path d="M8 15l4-9 4 9"/><path d="M9.5 12h5"/>',
  node: '<path d="M12 2L4 7v10l8 5 8-5V7z"/><path d="M9 9c0-1.5 1.5-2 3-2s3 .5 3 2-1.5 2-3 2-3 .5-3 2 1.5 2 3 2 3-.5 3-2"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7"/><path d="M18 11.5c0 4-6 2-6 6.5"/>',
  docker: '<rect x="3" y="10" width="4" height="4"/><rect x="8" y="10" width="4" height="4"/><rect x="13" y="10" width="4" height="4"/><rect x="8" y="5" width="4" height="4"/><path d="M3 14c2 4 8 5 12 4 3-.7 5-3 5-5"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/>',
  figma: '<path d="M9 3h3v6H9c-1.5 0-3-1.5-3-3s1.5-3 3-3z"/><path d="M12 3h3c1.5 0 3 1.5 3 3s-1.5 3-3 3h-3z"/><path d="M9 9h3v6H9c-1.5 0-3-1.5-3-3s1.5-3 3-3z"/><path d="M12 9h3c1.5 0 3 1.5 3 3s-1.5 3-3 3h-3z"/><circle cx="10.5" cy="18" r="3"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="6" cy="6.5" r="0.5" fill="currentColor"/><circle cx="8" cy="6.5" r="0.5" fill="currentColor"/><circle cx="10" cy="6.5" r="0.5" fill="currentColor"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="0.7" fill="currentColor"/><circle cx="7" cy="17" r="0.7" fill="currentColor"/><path d="M11 7h6"/><path d="M11 17h6"/>',
  api: '<rect x="3" y="7" width="6" height="10" rx="1"/><rect x="15" y="7" width="6" height="10" rx="1"/><path d="M9 10h6"/><path d="M9 14h6"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  component: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="15" r="1" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
}

const PREVIEW_ICONS = [
  ICONS.html5, ICONS.css3, ICONS.js, ICONS.ts,
  ICONS.react, ICONS.vue, ICONS.angular, ICONS.node,
  ICONS.git, ICONS.docker, ICONS.terminal, ICONS.figma,
  ICONS.browser, ICONS.server, ICONS.api, ICONS.database,
]
