import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { makeZip } from '@/lib/svg'

// GET /api/download/saved/[id] — скачать сохранённый пак как ZIP
export async function GET(
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

  const pack = await db.customPack.findFirst({
    where: { id, userId: user.id },
    include: {
      icons: {
        include: {
          customIcon: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!pack) {
    return NextResponse.json({ error: 'pack not found' }, { status: 404 })
  }

  // Проверяем лимит бесплатных скачиваний (если нет подписки)
  const hasActiveSub = (await db.subscription.findFirst({
    where: { userId: user.id, status: 'active', expiresAt: { gt: new Date() } },
  })) !== null

  if (!hasActiveSub) {
    const now = new Date()
    const resetAt = user.freeBuildsResetAt

    if (!resetAt || isDifferentMonth(now, new Date(resetAt))) {
      await db.user.update({
        where: { id: user.id },
        data: { freeBuildsUsed: 0, freeBuildsResetAt: now },
      })
    }

    const freshUser = await db.user.findUnique({ where: { id: user.id } })
    if (freshUser && freshUser.freeBuildsUsed >= 3) {
      return NextResponse.json({
        error: 'free_builds_limit',
        message: 'Лимит бесплатных скачиваний: 3 в месяц',
        limit: 3,
        used: freshUser.freeBuildsUsed,
      }, { status: 403 })
    }

    await db.user.update({
      where: { id: user.id },
      data: { freeBuildsUsed: { increment: 1 } },
    })
  }

  // Генерируем ZIP из svgSnapshot
  const files = pack.icons
    .map(pi => {
      if (!pi.customIcon) return null
      return {
        name: `${pack.name}/${pi.customIcon.name}.svg`,
        content: pi.customIcon.svgSnapshot,
      }
    })
    .filter(Boolean) as { name: string; content: string }[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'empty pack' }, { status: 400 })
  }

  const zipBase64 = makeZip(files)
  const zipBuffer = Buffer.from(zipBase64, 'base64')

  return new NextResponse(zipBuffer as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pack.name}.zip"`,
    },
  })
}

function isDifferentMonth(a: Date, b: Date): boolean {
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth()
}
