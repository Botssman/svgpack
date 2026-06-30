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
  const pack = await db.pack.update({ where: { id }, data: body })
  return NextResponse.json({ pack })
}

// DELETE /api/admin/packs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.pack.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
