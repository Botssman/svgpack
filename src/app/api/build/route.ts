import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/build — собрать кастомный пак из списка iconIds
// body: { name: string, iconIds: string[] }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, iconIds } = body as { name: string; iconIds: string[] }
  if (!Array.isArray(iconIds) || iconIds.length === 0) {
    return NextResponse.json({ error: 'iconIds required' }, { status: 400 })
  }
  const icons = await db.icon.findMany({
    where: { id: { in: iconIds } },
    include: { pack: true },
  })
  return NextResponse.json({ name: name || 'my-pack', icons })
}
