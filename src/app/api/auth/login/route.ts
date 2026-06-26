import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/login { email }
// Если пользователя нет — создаём (демо). Возвращаем user.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email } = body as { email: string }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: email.split('@')[0], credits: 10 },
    include: { subscriptions: true, purchases: true },
  })

  return NextResponse.json({ user })
}
