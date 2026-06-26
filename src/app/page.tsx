'use client'

import { Home } from '@/views/home'
import { useNav } from '@/lib/navigation'

export default function HomePage() {
  const nav = useNav()
  return <Home nav={nav} />
}
