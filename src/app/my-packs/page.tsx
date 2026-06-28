'use client'

import { MyPacks } from '@/views/my-packs'
import { useNav } from '@/lib/navigation'

export default function MyPacksPage() {
  const nav = useNav()
  return <MyPacks nav={nav} />
}
