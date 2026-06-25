import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Покупка кредитов (mock): body { email, credits, amount }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, credits, amount } = body as { email: string; credits: number; amount: number }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  await db.user.update({
    where: { email },
    data: { credits: { increment: credits } },
  })
  await db.purchase.create({
    data: {
      userId: user.id,
      kind: 'credits',
      amount,
      credits,
    },
  })
  const updated = await db.user.findUnique({ where: { email } })
  return NextResponse.json({ user: updated })
}
