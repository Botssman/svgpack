import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Простейшая сессионка: header x-user-email → user
async function getUser(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  if (!email) return null
  return db.user.findUnique({ where: { email }, include: { subscriptions: true, purchases: true } })
}

// GET /api/me — текущий пользователь
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}
