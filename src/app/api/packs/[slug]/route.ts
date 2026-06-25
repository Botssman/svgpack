import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/packs/[slug] — детали пака с иконками
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pack = await db.pack.findUnique({
    where: { slug },
    include: { icons: true },
  })
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  return NextResponse.json({ pack })
}
