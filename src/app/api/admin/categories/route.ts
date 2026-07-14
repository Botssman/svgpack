import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/admin/categories
 * List all categories sorted by sortOrder.
 */
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ categories })
  } catch (e: any) {
    console.error('[/api/admin/categories GET] ERROR:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/categories
 * Create a new category.
 * Body: { slug, nameRu, nameEn, descRu?, descEn?, sortOrder? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, nameRu, nameEn, descRu, descEn, sortOrder } = body

    if (!slug || !nameRu || !nameEn) {
      return NextResponse.json({ error: 'slug, nameRu, nameEn обязательны' }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: `Категория со slug "${slug}" уже существует` }, { status: 409 })
    }

    const category = await db.category.create({
      data: {
        slug,
        nameRu,
        nameEn,
        descRu: descRu || '',
        descEn: descEn || '',
        sortOrder: sortOrder ?? 100,
      },
    })

    return NextResponse.json({ ok: true, category }, { status: 201 })
  } catch (e: any) {
    console.error('[/api/admin/categories POST] ERROR:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
