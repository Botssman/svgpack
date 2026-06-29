import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PACKS } from '@/lib/packs-data'

/**
 * POST /api/admin/sync-packs — syncs packs from packs-data.ts to the DB.
 *
 * - Adds missing packs (by slug)
 * - Always updates existing packs (deletes old icons, re-inserts from code)
 *   This ensures SVG content changes are always pushed to the DB.
 */
export async function POST(req: NextRequest) {
  try {
    // Get existing packs with icon counts
    const existing = await db.pack.findMany({
      select: { id: true, slug: true, _count: { select: { icons: true } } },
    })
    const existingMap = new Map(existing.map(p => [p.slug, p]))

    const results = { added: 0, updated: 0, skipped: 0, iconsAdded: 0, iconsUpdated: 0, packs: [] as string[] }

    for (const pack of PACKS) {
      const existingPack = existingMap.get(pack.slug)

      if (!existingPack) {
        // New pack — insert
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
                viewBox: ic.viewBox || '0 0 24 24',
              })),
            },
          },
        })
        results.added++
        results.iconsAdded += pack.icons.length
        results.packs.push(`+ ${pack.slug}`)
        console.log(`[sync-packs] Added "${pack.slug}" — ${pack.icons.length} icons`)
      } else {
        // Existing pack — always update (SVGs may have changed even if count is the same)
        // Delete old icons then re-insert
        await db.icon.deleteMany({ where: { packId: existingPack.id } })
        await db.pack.update({
          where: { id: existingPack.id },
          data: {
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
                viewBox: ic.viewBox || '0 0 24 24',
              })),
            },
          },
        })
        results.updated++
        results.iconsUpdated += pack.icons.length
        results.packs.push(`~ ${pack.slug} (${existingPack._count.icons} → ${pack.icons.length} icons)`)
        console.log(`[sync-packs] Updated "${pack.slug}" — ${existingPack._count.icons} → ${pack.icons.length} icons`)
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
    })
  } catch (e: any) {
    console.error('[/api/admin/sync-packs] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}
