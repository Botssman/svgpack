import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/stats — статистика для админки
export async function GET() {
  const [packs, icons, users, purchases] = await Promise.all([
    db.pack.count(),
    db.icon.count(),
    db.user.count(),
    db.purchase.findMany(),
  ])
  const revenue = purchases.reduce((s, p) => s + p.amount, 0)
  return NextResponse.json({ packs, icons, users, revenue })
}
