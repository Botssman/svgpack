import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, makeZip, CustomConfig } from '@/lib/svg'

// GET /api/download/pack?slug=xxx[&cfg=JSON]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const pack = await db.pack.findUnique({
    where: { slug },
    include: { icons: true },
  })
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  const cfgRaw = searchParams.get('cfg')
  let cfg: CustomConfig | undefined
  if (cfgRaw) {
    try { cfg = JSON.parse(cfgRaw) as CustomConfig } catch { cfg = undefined }
  }

  const files = pack.icons.map((ic) => ({
    name: `${pack.slug}/${ic.slug}.svg`,
    content: cfg ? renderSvg(ic.svg, ic.viewBox, cfg) : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${ic.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`,
  }))

  // Add a sprite file
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${pack.icons.map((ic) => `<symbol id="${ic.slug}" viewBox="${ic.viewBox}">${ic.svg}</symbol>`).join('')}</svg>`
  files.push({ name: `${pack.slug}/sprite.svg`, content: sprite })

  // Add README
  const readme = `# ${pack.nameEn}\n\n${pack.descEn}\n\nIcons: ${pack.icons.length}\nLicense: Free for personal & commercial use.\n`
  files.push({ name: `${pack.slug}/README.md`, content: readme })

  const zipBase64 = makeZip(files)
  const zipBuffer = Buffer.from(zipBase64, 'base64')

  return new NextResponse(zipBuffer as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pack.slug}.zip"`,
    },
  })
}
