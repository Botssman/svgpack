'use client'

import { Account } from '@/views/account'
import { useNav } from '@/lib/navigation'

export default function AccountPage() {
  const nav = useNav()
  return <Account nav={nav} />
}
