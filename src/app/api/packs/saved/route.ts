import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/packs/saved — список сохранённых паков пользователя
export async function GET(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  if (!email) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }

  const packs = await db.customPack.findMany({
    where: { userId: user.id },
    include: {
      basePack: { select: { nameRu: true, nameEn: true, slug: true } },
      icons: {
        include: {
          customIcon: {
            select: {
              id: true,
              name: true,
              config: true,
              svgSnapshot: true,
              baseIconId: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = packs.map(p => ({
    id: p.id,
    name: p.name,
    basePack: p.basePack ? { slug: p.basePack.slug, nameRu: p.basePack.nameRu, nameEn: p.basePack.nameEn } : null,
    iconCount: p.icons.length,
    icons: p.icons.map(pi => ({
      id: pi.customIcon?.id ?? pi.id,
      name: pi.customIcon?.name ?? 'icon',
      config: pi.customIcon?.config ? JSON.parse(pi.customIcon.config) : null,
      svgSnapshot: pi.customIcon?.svgSnapshot ?? null,
      baseIconId: pi.baseIconId ?? pi.customIcon?.baseIconId,
    })),
    createdAt: p.createdAt,
  }))

  return NextResponse.json({ packs: result })
}
