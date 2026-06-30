'use client'

import { use, useMemo } from 'react'
import { Customize } from '@/views/customize'
import { useNav } from '@/lib/navigation'

export default function CustomizePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ icon?: string }>
}) {
  const { slug } = use(params)
  const { icon } = use(searchParams)
  const nav = useNav()
  const iconId = useMemo(() => icon || undefined, [icon])
  return <Customize packSlug={slug} iconId={iconId} nav={nav} />
}
