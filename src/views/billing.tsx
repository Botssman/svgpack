'use client'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-store'
import { View } from '@/app/page'
import { useToast } from '@/hooks/use-toast'

export function Billing({ nav }: { nav: (v: View) => void }) {
  const { t } = useI18n()
  const { user, refresh } = useUser()
  const { toast } = useToast()

  const hasActiveSub = !!user?.subscriptions?.some(s => s.status === 'active' && new Date(s.expiresAt) > new Date())

  const buyCredits = async (credits: number, amount: number) => {
    if (!user) { nav({ name: 'account' }); return }
    const res = await fetch('/api/billing/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, credits, amount }),
    })
    if (res.ok) {
      await refresh()
      toast({ title: t.toast.paid, description: `+${credits} ${t.billing.credits}` })
    }
  }

  const subscribe = async (plan: 'monthly' | 'yearly', amount: number) => {
    if (!user) { nav({ name: 'account' }); return }
    const res = await fetch('/api/billing/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, plan, amount }),
    })
    if (res.ok) {
      await refresh()
      toast({ title: t.toast.paid, description: t.billing.active })
    }
  }

  const buyOneTime = async () => {
    if (!user) { nav({ name: 'account' }); return }
    // mock: списываем 10 кредитов за разовую покупку пака
    const res = await fetch('/api/billing/onetime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, kind: 'pack', refId: 'any', amount: 0.99, creditsCost: 10 }),
    })
    if (res.ok) {
      await refresh()
      toast({ title: t.toast.paid })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.billing.title}</h1>
        <p className="mt-2 text-slate-600">{t.pricing.subtitle}</p>
      </div>

      {/* Balance */}
      <div className="mb-8 p-6 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-600">{t.billing.balance}</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">{user?.credits ?? 0}</span>
            <span className="text-slate-500">{t.billing.credits}</span>
            {hasActiveSub && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 font-medium">
                {t.pricing.sub} {t.billing.active}
              </span>
            )}
          </div>
        </div>
        {!user && (
          <button
            onClick={() => nav({ name: 'account' })}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            {t.common.login}
          </button>
        )}
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <PlanCard
          name={t.pricing.oneTime}
          price={t.pricing.oneTimePrice}
          desc={t.pricing.oneTimeDesc}
          features={[t.pricing.oneTimeF1, t.pricing.oneTimeF2, t.pricing.oneTimeF3]}
          cta={t.pricing.oneTimeCta}
          onClick={buyOneTime}
        />
        <PlanCard
          name={t.pricing.sub}
          price={t.pricing.subPrice}
          desc={t.pricing.subDesc}
          features={[t.pricing.subF1, t.pricing.subF2, t.pricing.subF3]}
          cta={hasActiveSub ? t.billing.active : t.pricing.subCta}
          highlighted
          disabled={hasActiveSub}
          onClick={() => subscribe('monthly', 4.99)}
        />
        <PlanCard
          name={t.pricing.credits}
          price={t.pricing.creditsPrice}
          desc={t.pricing.creditsDesc}
          features={[t.pricing.creditsF1, t.pricing.creditsF2, t.pricing.creditsF3]}
          cta={t.pricing.creditsCta}
          onClick={() => buyCredits(100, 4.99)}
        />
      </div>

      {/* History */}
      {user && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">{t.billing.history}</h2>
          </div>
          {user.purchases.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">{t.billing.empty}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">{t.billing.date}</th>
                  <th className="text-left p-3">{t.billing.type}</th>
                  <th className="text-right p-3">{t.billing.amount}</th>
                  <th className="text-right p-3">{t.customize.credits}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {user.purchases.slice().reverse().map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 text-slate-600">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-medium text-slate-900">{p.kind}</td>
                    <td className="p-3 text-right">${p.amount.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">
                      {p.credits > 0 ? `+${p.credits}` : p.credits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function PlanCard({
  name, price, desc, features, cta, highlighted, disabled, onClick,
}: {
  name: string; price: string; desc: string; features: string[]; cta: string;
  highlighted?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <div className={`p-6 rounded-2xl border bg-white flex flex-col ${highlighted ? 'border-slate-900 shadow-lg ring-1 ring-slate-900/5' : 'border-slate-200'}`}>
      <h3 className="font-semibold text-slate-900">{name}</h3>
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
        disabled={disabled}
        className={`mt-6 w-full py-2.5 rounded-md text-sm font-medium transition-colors ${
          disabled
            ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed'
            : highlighted
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'border border-slate-200 text-slate-900 hover:bg-slate-50'
        }`}
      >
        {cta}
      </button>
    </div>
  )
}
