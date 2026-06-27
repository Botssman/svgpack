import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, CustomConfig } from '@/lib/svg'

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

    const cfg: CustomConfig = item.cfg ?? {
      color: '#0F172A',
      color2: '#38BDF8',
      strokeWidth: 1.75,
      size: 24,
      background: 'none',
      bgColor: '#F1F5F9',
      bgGradient: false,
      bgGradientStops: [{ offset: 0, color: '#F1F5F9' }, { offset: 100, color: '#CBD5E1' }],
      bgGradientAngle: 135,
      colorGradient: false,
      colorGradientStops: [{ offset: 0, color: '#0F172A' }, { offset: 100, color: '#38BDF8' }],
      gradientAngle: 135,
      rotation: 0,
      mode: 'mono',
      cornerStyle: 'rounded',
      padding: 0,
      bgRadius: 3,
      opacity: 100,
      flipH: false,
      flipV: false,
      strokeDash: 'solid',
      lineCap: 'round',
      lineJoin: 'round',
      bgBorder: false,
      bgBorderColor: '#E2E8F0',
      bgBorderWidth: 1,
      shadow: 'none',
      shadowColor: '#000000',
      shadowBlur: 3,
      shadowX: 1,
      shadowY: 1,
      bgRotation: 0,
      animation: 'none',
      animDuration: 1.5,
      animTiming: 'ease-in-out',
      animDelay: 0,
      animIter: 0,
    }

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
