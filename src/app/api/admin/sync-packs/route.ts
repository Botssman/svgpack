import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PACKS } from '@/lib/packs-data'

/**
 * POST /api/admin/sync-packs — adds missing packs from packs-data.ts to the DB.
 * Does NOT delete or modify existing packs. Only inserts packs whose slug
 * doesn't already exist in the database, along with their icons.
 */
export async function POST(req: NextRequest) {
  try {
    // Get existing pack slugs
    const existing = await db.pack.findMany({ select: { slug: true } })
    const existingSlugs = new Set(existing.map(p => p.slug))

    // Find missing packs
    const missing = PACKS.filter(p => !existingSlugs.has(p.slug))

    if (missing.length === 0) {
      return NextResponse.json({ ok: true, message: 'All packs already in DB', added: 0 })
    }

    // Insert missing packs with their icons
    let iconCount = 0
    for (const pack of missing) {
      await db.pack.create({
        data: {
          slug: pack.slug,
          nameRu: pack.nameRu,
          nameEn: pack.nameEn,
          descRu: pack.descRu,
          descEn: pack.descEn,
          category: pack.category,
          style: pack.style,
          tags: pack.tags,
          priceCredits: pack.priceCredits,
          isFree: pack.isFree,
          icons: {
            create: pack.icons.map(ic => ({
              slug: ic.slug,
              nameRu: ic.nameRu,
              nameEn: ic.nameEn,
              keywords: ic.keywords,
              svg: ic.svg,
              viewBox: '0 0 24 24',
            })),
          },
        },
      })
      iconCount += pack.icons.length
      console.log(`[sync-packs] Added "${pack.slug}" — ${pack.icons.length} icons`)
    }

    return NextResponse.json({
      ok: true,
      added: missing.length,
      iconsAdded: iconCount,
      packs: missing.map(p => p.slug),
    })
  } catch (e: any) {
    console.error('[/api/admin/sync-packs] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}
