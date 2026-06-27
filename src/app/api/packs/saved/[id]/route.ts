import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/packs/saved/[id] — удалить сохранённый пак
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

  // Проверяем, что пак принадлежит пользователю
  const pack = await db.customPack.findFirst({
    where: { id, userId: user.id },
    include: { icons: { include: { customIcon: true } } },
  })

  if (!pack) {
    return NextResponse.json({ error: 'pack not found' }, { status: 404 })
  }

  // Удаляем CustomIcon (каскадно удалятся CustomPackIcon)
  const customIconIds = pack.icons.map(pi => pi.customIcon?.id).filter(Boolean) as string[]

  // Удаляем CustomPackIcon сначала
  await db.customPackIcon.deleteMany({ where: { customPackId: pack.id } })

  // Удаляем CustomIcon
  if (customIconIds.length > 0) {
    await db.customIcon.deleteMany({ where: { id: { in: customIconIds } } })
  }

  // Удаляем CustomPack
  await db.customPack.delete({ where: { id: pack.id } })

  return NextResponse.json({ ok: true })
}
