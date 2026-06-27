import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/palettes/[id] — удалить пользовательскую палитру
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const email = req.headers.get('x-user-email')
  if (!email) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }

  const palette = await db.userPalette.findFirst({
    where: { id, userId: user.id },
  })

  if (!palette) {
    return NextResponse.json({ error: 'palette not found' }, { status: 404 })
  }

  await db.userPalette.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
