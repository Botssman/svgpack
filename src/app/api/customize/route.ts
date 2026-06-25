import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, CustomConfig } from '@/lib/svg'

// POST /api/customize — принимает svg + cfg, отдаёт готовый svg
// body: { svg: string, viewBox: string, cfg: CustomConfig }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { svg, viewBox, cfg } = body as { svg: string; viewBox: string; cfg: CustomConfig }
  if (!svg || !cfg) return NextResponse.json({ error: 'svg and cfg required' }, { status: 400 })
  const result = renderSvg(svg, viewBox || '0 0 24 24', cfg)
  return NextResponse.json({ svg: result })
}
