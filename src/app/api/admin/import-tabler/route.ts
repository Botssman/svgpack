import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/admin/import-tabler
 *
 * Import Tabler icon packs in bulk.
 * Body: { packs: Array<{ slug, nameRu, nameEn, descRu, descEn, category, style, tags, isFree, icons: Array<{ slug, nameRu, nameEn, keywords, svg, viewBox }> }> }
 *
 * - Skips packs that already exist (by slug)
 * - Creates pack + all its icons in one transaction
 * - Returns summary of added/skipped
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const packsData = body.packs as Array<{
      slug: string
      nameRu: string
      nameEn: string
      descRu: string
      descEn: string
      category: string
      style: string
      tags: string
      isFree: boolean
      priceCredits?: number
      icons: Array<{
        slug: string
        nameRu: string
        nameEn: string
        keywords: string
        svg: string
        viewBox: string
      }>
    }>

    if (!Array.isArray(packsData) || packsData.length === 0) {
      return NextResponse.json({ error: 'packs array required' }, { status: 400 })
    }

    // Get existing pack slugs to skip duplicates
    const existing = await db.pack.findMany({ select: { slug: true } })
    const existingSlugs = new Set(existing.map(p => p.slug))

    let added = 0
    let skipped = 0
    let totalIcons = 0
    const results: string[] = []

    for (const packDef of packsData) {
      if (existingSlugs.has(packDef.slug)) {
        skipped++
        results.push(`↻ ${packDef.slug} — already exists`)
        continue
      }

      try {
        const pack = await db.pack.create({
          data: {
            slug: packDef.slug,
            nameRu: packDef.nameRu,
            nameEn: packDef.nameEn,
            descRu: packDef.descRu,
            descEn: packDef.descEn,
            category: packDef.category,
            style: packDef.style || 'outline',
            tags: packDef.tags || '',
            isFree: packDef.isFree ?? true,
            priceCredits: packDef.priceCredits ?? 10,
            icons: {
              create: packDef.icons.map(ic => ({
                slug: ic.slug,
                nameRu: ic.nameRu,
                nameEn: ic.nameEn,
                keywords: ic.keywords || '',
                svg: ic.svg,
                viewBox: ic.viewBox || '0 0 24 24',
              })),
            },
          },
        })
        added++
        totalIcons += packDef.icons.length
        results.push(`✓ ${packDef.slug} — ${packDef.icons.length} icons`)
      } catch (e: any) {
        results.push(`✗ ${packDef.slug} — ${e?.message || 'error'}`)
      }
    }

    return NextResponse.json({
      ok: true,
      added,
      skipped,
      totalIcons,
      results,
    })
  } catch (e: any) {
    console.error('[/api/admin/import-tabler] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}
