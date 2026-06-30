import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/packs — список паков с иконками, server-side пагинация и фильтрация
// Параметры: ?q=поиск&category=языки&style=outline&isFree=true&page=1&limit=12
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').toLowerCase().trim()
    const category = searchParams.get('category') || ''
    const style = searchParams.get('style') || ''
    const isFreeParam = searchParams.get('isFree')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12')))
    const skip = (page - 1) * limit

    // Build DB-level where clause
    const where: any = {}

    if (category && category !== 'all') {
      where.category = category
    }
    if (style) {
      where.style = style
    }
    if (isFreeParam === 'true') {
      where.isFree = true
    } else if (isFreeParam === 'false') {
      where.isFree = false
    }

    // Search by pack name/slug OR by icon names within the pack
    if (q) {
      where.OR = [
        { nameRu: { contains: q } },
        { nameEn: { contains: q } },
        { slug: { contains: q } },
        { tags: { contains: q } },
        { icons: { some: { OR: [
          { slug: { contains: q } },
          { nameRu: { contains: q } },
          { nameEn: { contains: q } },
          { keywords: { contains: q } },
        ] } } },
      ]
    }

    const [packs, total, totalIconsAll] = await Promise.all([
      db.pack.findMany({
        where,
        include: {
          icons: {
            select: { id: true, slug: true, nameRu: true, nameEn: true, keywords: true, svg: true, viewBox: true },
            // If searching by icon keywords, filter icons within matching packs
            ...(q ? {
              where: {
                OR: [
                  { slug: { contains: q } },
                  { nameRu: { contains: q } },
                  { nameEn: { contains: q } },
                  { keywords: { contains: q } },
                ],
              },
            } : {}),
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      db.pack.count({ where }),
      // Total icons across ALL packs (not just current page), respecting filters
      db.icon.count({
        where: Object.keys(where).length > 0 ? { pack: where } : {},
      }),
    ])

    return NextResponse.json({
      packs,
      total,
      totalIconsAll,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    console.error('[/api/packs] ERROR:', e?.message || e)
    console.error('[/api/packs] STACK:', e?.stack)
    console.error('[/api/packs] env:', {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasToken: !!process.env.DATABASE_AUTH_TOKEN,
      dbUrlPrefix: (process.env.DATABASE_URL || '').slice(0, 20),
    })
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error', stack: e?.stack },
      { status: 500 },
    )
  }
}
