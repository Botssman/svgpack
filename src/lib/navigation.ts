'use client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * View discriminator — kept identical to the original SPA-style navigation
 * shape so existing views (Home, Catalog, PackView, Customize, Builder,
 * Billing, Account, Admin) keep working without code changes.
 *
 * Under the hood we translate each View to a real URL and call
 * router.push() — so back button, deep links, and SEO all work.
 */
export type View =
  | { name: 'home' }
  | { name: 'catalog' }
  | { name: 'icons' }
  | { name: 'pack'; slug: string }
  | { name: 'customize'; packSlug: string; iconId?: string }
  | { name: 'builder' }
  | { name: 'my-packs' }
  | { name: 'billing' }
  | { name: 'account' }
  | { name: 'admin' }

/** Translate a View to a real URL path. */
export function viewToHref(v: View): string {
  switch (v.name) {
    case 'home':
      return '/'
    case 'catalog':
      return '/catalog'
    case 'icons':
      return '/icons'
    case 'pack':
      return `/catalog/${v.slug}`
    case 'customize':
      return v.iconId
        ? `/catalog/${v.packSlug}/customize?icon=${encodeURIComponent(v.iconId)}`
        : `/catalog/${v.packSlug}/customize`
    case 'builder':
      return '/builder'
    case 'my-packs':
      return '/my-packs'
    case 'billing':
      return '/pricing'
    case 'account':
      return '/account'
    case 'admin':
      return '/admin'
  }
}

/**
 * Returns a `nav` function with the same shape existing views expect
 * (`(v: View) => void`). Internally calls `router.push(viewToHref(v))`.
 *
 * Drop-in replacement for the old setState-based navigation.
 */
export function useNav(): (v: View) => void {
  const router = useRouter()
  return useCallback(
    (v: View) => {
      router.push(viewToHref(v))
    },
    [router]
  )
}
