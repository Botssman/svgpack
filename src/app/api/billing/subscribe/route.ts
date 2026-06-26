import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Подписка: body { email, plan: 'monthly' | 'yearly', amount }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, plan, amount } = body as { email: string; plan: 'monthly' | 'yearly'; amount: number }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const days = plan === 'yearly' ? 365 : 30
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await db.subscription.create({
    data: {
      userId: user.id,
      plan,
      status: 'active',
      expiresAt,
    },
  })
  await db.purchase.create({
    data: {
      userId: user.id,
      kind: 'subscription',
      refId: plan,
      amount,
      credits: 0,
    },
  })

  const updated = await db.user.findUnique({
    where: { email },
    include: { subscriptions: true, purchases: true },
  })
  return NextResponse.json({ user: updated })
}
