import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Admin emails auto-assigned admin/moderator role on creation
const ADMIN_EMAILS: Record<string, string> = {
  'admin@iconhub.test': 'admin',
  'moderator@iconhub.test': 'moderator',
}

// POST /api/auth/login { email }
// Если пользователя нет — создаём (демо). Возвращаем user.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email } = body as { email: string }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const adminRole = ADMIN_EMAILS[email]

  const user = await db.user.upsert({
    where: { email },
    update: adminRole ? { role: adminRole } : {},
    create: {
      email,
      name: email.split('@')[0],
      credits: 10,
      ...(adminRole ? { role: adminRole } : {}),
    },
    include: { subscriptions: true, purchases: true },
  })

  return NextResponse.json({ user })
}
