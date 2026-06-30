import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/icons — поиск иконок по всем пакам
// Параметры: ?q=поиск&category=языки&style=outline&pack=slug&page=1&limit=60
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').toLowerCase().trim()
    const category = searchParams.get('category') || ''
    const style = searchParams.get('style') || ''
    const packSlug = searchParams.get('pack') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '60')))
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (q) {
      where.OR = [
        { slug: { contains: q } },
        { nameRu: { contains: q } },
        { nameEn: { contains: q } },
        { keywords: { contains: q } },
      ]
    }

    // Filter by pack properties via relation
    if (category || style || packSlug) {
      where.pack = {}
      if (category) where.pack.category = category
      if (style) where.pack.style = style
      if (packSlug) where.pack.slug = packSlug
    }

    const [icons, total] = await Promise.all([
      db.icon.findMany({
        where,
        select: {
          id: true,
          slug: true,
          nameRu: true,
          nameEn: true,
          keywords: true,
          svg: true,
          viewBox: true,
          packId: true,
          pack: {
            select: {
              id: true,
              slug: true,
              nameRu: true,
              nameEn: true,
              category: true,
              style: true,
              isFree: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      db.icon.count({ where }),
    ])

    return NextResponse.json({
      icons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    console.error('[/api/icons] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}
