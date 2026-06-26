'use client'

import { Catalog } from '@/views/catalog'
import { useNav } from '@/lib/navigation'

export default function CatalogPage() {
  const nav = useNav()
  return <Catalog nav={nav} />
}
