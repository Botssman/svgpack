import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/packs — создать пак
// Если slug занят, автоматически добавляет суффикс -2, -3 и т.д.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nameRu, nameEn, descRu, descEn, slug, category, style, tags, priceCredits, isFree } = body as any
  if (!nameRu || !nameEn) {
    return NextResponse.json({ error: 'nameRu и nameEn обязательны' }, { status: 400 })
  }

  // Auto-generate slug from nameEn if not provided
  let finalSlug = slug || nameEn
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!finalSlug) {
    return NextResponse.json({ error: 'Не удалось сгенерировать slug' }, { status: 400 })
  }

  // If slug is taken, auto-append -2, -3, etc.
  const existing = await db.pack.findUnique({ where: { slug: finalSlug } })
  if (existing) {
    let suffix = 2
    let candidate = `${finalSlug}-${suffix}`
    while (await db.pack.findUnique({ where: { slug: candidate } })) {
      suffix++
      candidate = `${finalSlug}-${suffix}`
    }
    finalSlug = candidate
  }

  const pack = await db.pack.create({
    data: {
      nameRu, nameEn, descRu: descRu || '', descEn: descEn || '',
      slug: finalSlug, category: category || 'concepts', style: style || 'outline',
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
