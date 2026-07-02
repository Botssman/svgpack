import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats — публичная статистика (паки, иконки)
export async function GET() {
  const [packs, icons] = await Promise.all([
    db.pack.count(),
    db.icon.count(),
  ])
  return NextResponse.json({ packs, icons })
}
