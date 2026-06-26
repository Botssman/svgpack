import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, CustomConfig } from '@/lib/svg'

// GET /api/download/icon?id=xxx[&cfg=JSON]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const icon = await db.icon.findUnique({ where: { id } })
  if (!icon) return NextResponse.json({ error: 'Icon not found' }, { status: 404 })

  const cfgRaw = searchParams.get('cfg')
  let cfg: CustomConfig | undefined
  if (cfgRaw) {
    try { cfg = JSON.parse(cfgRaw) as CustomConfig } catch { cfg = undefined }
  }

  const svg = cfg
    ? renderSvg(icon.svg, icon.viewBox, cfg)
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${icon.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${icon.slug}.svg"`,
    },
  })
}
