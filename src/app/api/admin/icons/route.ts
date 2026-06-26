import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/icons — добавить иконку в пак
// body: { packId, slug, nameRu, nameEn, keywords, svg, viewBox }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { packId, slug, nameRu, nameEn, keywords, svg, viewBox } = body as any
  if (!packId || !slug || !nameRu || !svg) {
    return NextResponse.json({ error: 'packId, slug, nameRu, svg required' }, { status: 400 })
  }
  const icon = await db.icon.create({
    data: {
      packId,
      slug,
      nameRu,
      nameEn: nameEn || nameRu,
      keywords: keywords || '',
      svg,
      viewBox: viewBox || '0 0 24 24',
    },
  })
  return NextResponse.json({ icon })
}

// GET /api/admin/icons?packId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const packId = searchParams.get('packId')
  const icons = await db.icon.findMany({ where: packId ? { packId } : undefined, include: { pack: true } })
  return NextResponse.json({ icons })
}
