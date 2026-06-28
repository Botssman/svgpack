import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/palettes — список пользовательских палитр
export async function GET(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  if (!email) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }

  const palettes = await db.userPalette.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ palettes })
}

// POST /api/palettes — создать пользовательскую палитру
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
  const { nameRu, nameEn, color1, color2, bgColor1, bgColor2, isGradient, isBgGradient, gradientAngle, mode } = body as {
    nameRu: string
    nameEn: string
    color1: string
    color2: string
    bgColor1?: string
    bgColor2?: string
    isGradient?: boolean
    isBgGradient?: boolean
    gradientAngle?: number
    mode?: string
  }

  if (!nameRu || !nameEn || !color1) {
    return NextResponse.json({ error: 'nameRu, nameEn, color1 required' }, { status: 400 })
  }

  const palette = await db.userPalette.create({
    data: {
      userId: user.id,
      nameRu: nameRu.trim(),
      nameEn: nameEn.trim(),
      color1,
      color2: color2 || color1,
      bgColor1: bgColor1 || '#F1F5F9',
      bgColor2: bgColor2 || '#F1F5F9',
      isGradient: isGradient ?? false,
      isBgGradient: isBgGradient ?? false,
      gradientAngle: gradientAngle ?? 135,
      mode: mode || 'mono',
    },
  })

  return NextResponse.json({ ok: true, palette })
}
