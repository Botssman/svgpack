import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/packs — создать пак
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nameRu, nameEn, descRu, descEn, slug, category, style, tags, priceCredits, isFree } = body as any
  if (!nameRu || !nameEn || !slug) {
    return NextResponse.json({ error: 'nameRu, nameEn, slug required' }, { status: 400 })
  }
  const existing = await db.pack.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: 'slug exists' }, { status: 400 })

  const pack = await db.pack.create({
    data: {
      nameRu, nameEn, descRu: descRu || '', descEn: descEn || '',
      slug, category: category || 'concepts', style: style || 'outline',
      tags: tags || '', priceCredits: priceCredits ?? 10, isFree: isFree ?? true,
    },
  })
  return NextResponse.json({ pack })
}

// GET /api/admin/packs — список всех паков (для админки, без иконок)
export async function GET() {
  const packs = await db.pack.findMany({
    include: { _count: { select: { icons: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ packs })
}
