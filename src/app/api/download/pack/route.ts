import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, makeZip, CustomConfig } from '@/lib/svg'

// GET /api/download/pack?slug=xxx[&cfg=JSON][&cfgMap=JSON]
// POST /api/download/pack — body: { slug, cfg?, cfgMap? } (for large configs that don't fit in URL)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, cfg: cfgRaw, cfgMap: cfgMapRaw } = body as {
    slug: string
    cfg?: CustomConfig
    cfgMap?: Record<string, CustomConfig>
  }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const pack = await db.pack.findUnique({
    where: { slug },
    include: { icons: true },
  })
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  const defaultSvg = (ic: { svg: string; viewBox: string }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${ic.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`

  const renderForIcon = (ic: { id: string; svg: string; viewBox: string }) => {
    if (cfgMapRaw && cfgMapRaw[ic.id]) return renderSvg(ic.svg, ic.viewBox, cfgMapRaw[ic.id])
    if (cfgRaw) return renderSvg(ic.svg, ic.viewBox, cfgRaw)
    return defaultSvg(ic)
  }

  const validIcons = (pack.icons || []).filter((ic) => ic?.slug)
  const files = validIcons.map((ic) => ({
    name: `${pack.slug}/${ic.slug}.svg`,
    content: renderForIcon(ic),
  }))

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${validIcons.map((ic) => `<symbol id="${ic.slug}" viewBox="${ic.viewBox}">${ic.svg}</symbol>`).join('')}</svg>`
  files.push({ name: `${pack.slug}/sprite.svg`, content: sprite })

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

// GET /api/download/pack?slug=xxx[&cfg=JSON][&cfgMap=JSON]
//   cfg    — single CustomConfig applied to ALL icons (legacy / "all" mode)
//   cfgMap — JSON object { iconId: CustomConfig } for per-icon overrides
//            ("single" / "multi" customize modes). Icons missing from the
//            map fall back to default rendering.
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

  const cfgMapRaw = searchParams.get('cfgMap')
  let cfgMap: Record<string, CustomConfig> | undefined
  if (cfgMapRaw) {
    try { cfgMap = JSON.parse(cfgMapRaw) as Record<string, CustomConfig> } catch { cfgMap = undefined }
  }

  const defaultSvg = (ic: { svg: string; viewBox: string }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${ic.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`

  const renderForIcon = (ic: { id: string; svg: string; viewBox: string }) => {
    // Per-icon override wins over global cfg
    if (cfgMap && cfgMap[ic.id]) return renderSvg(ic.svg, ic.viewBox, cfgMap[ic.id])
    if (cfg) return renderSvg(ic.svg, ic.viewBox, cfg)
    return defaultSvg(ic)
  }

  const validIcons = (pack.icons || []).filter((ic) => ic?.slug)
  const files = validIcons.map((ic) => ({
    name: `${pack.slug}/${ic.slug}.svg`,
    content: renderForIcon(ic),
  }))

  // Add a sprite file (uses raw icon svg, not customized — sprite is a reference)
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${validIcons.map((ic) => `<symbol id="${ic.slug}" viewBox="${ic.viewBox}">${ic.svg}</symbol>`).join('')}</svg>`
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
