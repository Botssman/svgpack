'use client'

import { Billing } from '@/views/billing'
import { useNav } from '@/lib/navigation'

export default function PricingPage() {
  const nav = useNav()
  return <Billing nav={nav} />
}
