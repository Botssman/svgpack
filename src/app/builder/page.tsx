'use client'

import { Builder } from '@/views/builder'
import { useNav } from '@/lib/navigation'

export default function BuilderPage() {
  const nav = useNav()
  return <Builder nav={nav} />
}
