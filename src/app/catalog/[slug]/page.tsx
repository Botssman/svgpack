'use client'

import { use } from 'react'
import { PackView } from '@/views/pack-view'
import { useNav } from '@/lib/navigation'

export default function PackPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const nav = useNav()
  return <PackView slug={slug} nav={nav} />
}
