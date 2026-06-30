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

// GET /api/admin/packs — список паков для админки с пагинацией и фильтрацией
// Параметры: ?q=поиск&category=языки&style=outline&page=1&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').toLowerCase().trim()
  const category = searchParams.get('category') || ''
  const styleParam = searchParams.get('style') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  // Build DB-level where clause
  const where: any = {}

  if (category) {
    where.category = category
  }
  if (styleParam) {
    where.style = styleParam
  }
  if (q) {
    where.OR = [
      { nameRu: { contains: q } },
      { nameEn: { contains: q } },
      { slug: { contains: q } },
    ]
  }

  const [packs, total] = await Promise.all([
    db.pack.findMany({
      where,
      include: { _count: { select: { icons: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.pack.count({ where }),
  ])

  return NextResponse.json({
    packs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}
