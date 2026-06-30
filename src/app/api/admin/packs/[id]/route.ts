import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/packs/[id] — получить пак с иконками
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pack = await db.pack.findUnique({
    where: { id },
    include: { icons: true },
  })
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  return NextResponse.json({ pack })
}

// PATCH /api/admin/packs/[id] — обновить пак
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // If slug is being changed, check uniqueness and auto-resolve
  if (body.slug) {
    const existing = await db.pack.findFirst({
      where: { slug: body.slug, NOT: { id } },
    })
    if (existing) {
      // Auto-append suffix
      let suffix = 2
      let candidate = `${body.slug}-${suffix}`
      while (await db.pack.findFirst({ where: { slug: candidate, NOT: { id } } })) {
        suffix++
        candidate = `${body.slug}-${suffix}`
      }
      body.slug = candidate
    }
  }

  // Only allow specific fields to be updated
  const allowed = ['nameRu', 'nameEn', 'descRu', 'descEn', 'slug', 'category', 'style', 'tags', 'priceCredits', 'isFree']
  const data: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const pack = await db.pack.update({ where: { id }, data })
  return NextResponse.json({ pack })
}

// DELETE /api/admin/packs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.pack.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
