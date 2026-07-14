import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/categories
 * Public: list all categories sorted by sortOrder.
 * Used by catalog sidebar and figma-import UI.
 */
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameEn: true,
        descRu: true,
        descEn: true,
        sortOrder: true,
      },
    })
    return NextResponse.json({ categories })
  } catch (e: any) {
    console.error('[/api/categories GET] ERROR:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
