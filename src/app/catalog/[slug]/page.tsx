'use client'

import { use } from 'react'
import { PackView } from '@/views/pack-view'

export default function PackPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  return <PackView slug={slug} />
}
