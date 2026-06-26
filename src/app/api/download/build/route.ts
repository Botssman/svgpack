import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, makeZip, CustomConfig } from '@/lib/svg'

// POST /api/download/build
// body: { name: string, items: [{ iconId, cfg? }] }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, items } = body as {
    name: string
    items: { iconId: string; cfg?: CustomConfig }[]
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  const ids = items.map((i) => i.iconId)
  const icons = await db.icon.findMany({ where: { id: { in: ids } }, include: { pack: true } })

  const files = items.map((it) => {
    const ic = icons.find((i) => i.id === it.iconId)
    if (!ic) return null
    const svg = it.cfg
      ? renderSvg(ic.svg, ic.viewBox, it.cfg)
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${ic.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`
    return { name: `${name || 'my-pack'}/${ic.slug}.svg`, content: svg }
  }).filter(Boolean) as { name: string; content: string }[]

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${icons.map((ic) => `<symbol id="${ic.slug}" viewBox="${ic.viewBox}">${ic.svg}</symbol>`).join('')}</svg>`
  files.push({ name: `${name || 'my-pack'}/sprite.svg`, content: sprite })

  const zipBase64 = makeZip(files)
  const zipBuffer = Buffer.from(zipBase64, 'base64')
  return new NextResponse(zipBuffer as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name || 'my-pack'}.zip"`,
    },
  })
}
