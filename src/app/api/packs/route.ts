import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/packs — список паков с иконками, поддержка поиска и фильтра
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').toLowerCase().trim()
    const category = searchParams.get('category') || ''

    const packs = await db.pack.findMany({
      include: { icons: { select: { id: true, slug: true, nameRu: true, nameEn: true, keywords: true, svg: true } } },
      orderBy: { createdAt: 'asc' },
    })

    let filtered = packs
    if (category && category !== 'all') {
      filtered = filtered.filter((p) => p.category === category)
    }
    if (q) {
      filtered = filtered
        .map((p) => ({
          ...p,
          icons: (p.icons || []).filter(
            (ic) =>
              (ic?.slug?.toLowerCase() ?? '').includes(q) ||
              (ic?.nameRu?.toLowerCase() ?? '').includes(q) ||
              (ic?.nameEn?.toLowerCase() ?? '').includes(q) ||
              (ic?.keywords?.toLowerCase() ?? '').includes(q),
          ),
        }))
        .filter((p) => p.icons.length > 0)
    }

    return NextResponse.json({ packs: filtered })
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
