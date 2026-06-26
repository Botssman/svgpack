import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Разовая покупка: body { email, kind: 'pack' | 'icon', refId, amount, creditsCost }
// Списываем кредиты (если есть) или записываем как paid-транзакцию (mock).
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, kind, refId, amount, creditsCost } = body as {
    email: string
    kind: 'pack' | 'icon'
    refId: string
    amount: number
    creditsCost: number
  }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  // mock: списываем кредиты если есть, иначе всё равно отдаём (демо)
  const newCredits = Math.max(0, user.credits - creditsCost)
  await db.user.update({ where: { email }, data: { credits: newCredits } })
  await db.purchase.create({
    data: {
      userId: user.id,
      kind,
      refId,
      amount,
      credits: -creditsCost,
    },
  })

  const updated = await db.user.findUnique({
    where: { email },
    include: { subscriptions: true, purchases: true },
  })
  return NextResponse.json({ user: updated })
}
