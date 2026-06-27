import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, CustomConfig, DEFAULT_CONFIG } from '@/lib/svg'

// POST /api/packs/save
// Сохраняет кастомизированный пак в ЛК пользователя.
// Body: { name, items: [{ iconId, cfg? }] }
// Бесплатно — не требует кредитов.
export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  if (!email) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }

  const body = await req.json()
  const { name, items } = body as {
    name: string
    items: { iconId: string; cfg?: CustomConfig }[]
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  // Получаем иконки из БД
  const ids = items.map(i => i.iconId)
  const icons = await db.icon.findMany({
    where: { id: { in: ids } },
    include: { pack: true },
  })

  if (icons.length === 0) {
    return NextResponse.json({ error: 'no valid icons' }, { status: 400 })
  }

  // Определяем basePackId — если все иконки из одного пака
  const packIds = [...new Set(icons.map(i => i.packId))]
  const basePackId = packIds.length === 1 ? packIds[0] : null

  // Создаём CustomPack
  const customPack = await db.customPack.create({
    data: {
      userId: user.id,
      name: name.trim(),
      basePackId,
    },
  })

  // Создаём CustomIcon + CustomPackIcon для каждого элемента
  const packIcons: { id: string }[] = []
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const icon = icons.find(i => i.id === item.iconId)
    if (!icon) continue

    const cfg: CustomConfig = item.cfg ?? DEFAULT_CONFIG

    const svgSnapshot = renderSvg(icon.svg, icon.viewBox, cfg)

    const customIcon = await db.customIcon.create({
      data: {
        userId: user.id,
        baseIconId: icon.id,
        basePackId: icon.packId,
        name: icon.slug,
        config: JSON.stringify(cfg),
        svgSnapshot,
      },
    })

    const packIcon = await db.customPackIcon.create({
      data: {
        customPackId: customPack.id,
        customIconId: customIcon.id,
        baseIconId: icon.id,
        sortOrder: idx,
      },
    })

    packIcons.push({ id: packIcon.id })
  }

  return NextResponse.json({
    ok: true,
    pack: {
      id: customPack.id,
      name: customPack.name,
      iconCount: packIcons.length,
      createdAt: customPack.createdAt,
    },
  })
}
