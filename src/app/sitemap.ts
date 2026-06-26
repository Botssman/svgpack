import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

/**
 * Auto-generated sitemap.
 *
 * Static routes (/, /catalog, /pricing, /builder) are listed first.
 * Then every Pack in the DB gets its own URL: /catalog/[slug].
 *
 * NB: this route is dynamic and re-renders on each request — when packs
 * are added/removed via admin, the sitemap picks them up automatically.
 */
export const dynamic = 'force-dynamic'

const BASE = 'https://iconpackhub.dev' // change to real domain when known

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/catalog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/builder`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  let packEntries: MetadataRoute.Sitemap = []
  try {
    const packs = await db.pack.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { slug: 'asc' },
    })
    packEntries = packs.map((p) => ({
      url: `${BASE}/catalog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (e) {
    // DB not yet seeded — return static-only sitemap
    console.error('[sitemap] failed to read packs:', e)
  }

  return [...staticEntries, ...packEntries]
}
