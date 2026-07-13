import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CATEGORIES } from '@/lib/categories'

/**
 * POST /api/admin/figma-import
 *
 * Import icons from a Figma file via the Figma API.
 *
 * Body: {
 *   figmaToken: string,      // Figma Personal Access Token
 *   fileKey: string,         // Figma file key (from URL)
 *   category: string,        // Target category slug
 *   style: string,           // "outline" | "filled" | "duotone"
 *   packNameRu?: string,     // Override pack name (auto-generated if omitted)
 *   packNameEn?: string,     // Override pack name
 *   pageNames?: string[],    // Only import from these Figma pages (all if omitted)
 *   frameFilter?: string,    // Only import frames/components matching this regex
 * }
 *
 * Steps:
 * 1. Fetch Figma file document → list pages, frames, components
 * 2. For each page/frame, collect node IDs
 * 3. Batch-fetch SVG exports via /v1/images/{fileKey}?ids=...&format=svg
 * 4. Group by page → one pack per page (or single pack if no pages)
 * 5. Create packs with icons in DB
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { figmaToken, fileKey, category, style, packNameRu, packNameEn, pageNames, frameFilter } = body as {
      figmaToken: string
      fileKey: string
      category: string
      style: string
      packNameRu?: string
      packNameEn?: string
      pageNames?: string[]
      frameFilter?: string
    }

    if (!figmaToken || !fileKey) {
      return NextResponse.json({ error: 'figmaToken и fileKey обязательны' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'category обязательна' }, { status: 400 })
    }

    // Validate category exists
    const validCategory = CATEGORIES.find(c => c.slug === category)
    if (!validCategory) {
      return NextResponse.json({ error: `Неизвестная категория: ${category}` }, { status: 400 })
    }

    // 1. Fetch Figma file document
    console.log(`[figma-import] Fetching file: ${fileKey}`)
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': figmaToken },
    })

    if (!fileRes.ok) {
      const errText = await fileRes.text()
      console.error(`[figma-import] Figma API error: ${fileRes.status}`, errText.substring(0, 200))
      if (fileRes.status === 403) {
        return NextResponse.json({ error: 'Неверный Figma Token или нет доступа к файлу' }, { status: 403 })
      }
      if (fileRes.status === 404) {
        return NextResponse.json({ error: 'Файл не найден. Проверьте URL файла.' }, { status: 404 })
      }
      return NextResponse.json({ error: `Figma API ошибка: ${fileRes.status}` }, { status: 500 })
    }

    const fileData = await fileRes.json()
    const document = fileData.document
    const fileName = fileData.name || 'Figma Import'

    console.log(`[figma-import] File: "${fileName}", pages: ${document.children?.length}`)

    // 2. Walk the document tree to find all components/frames with icons
    // Each top-level page becomes a potential pack
    interface FigmaNode {
      id: string
      name: string
      type: string
      children?: FigmaNode[]
    }

    const packsToCreate: Array<{
      pageName: string
      nodeIds: string[]
      nodeNames: Map<string, string>
    }> = []

    const filterRegex = frameFilter ? new RegExp(frameFilter, 'i') : null

    function collectIconNodes(nodes: FigmaNode[], target: Map<string, string>) {
      for (const node of nodes) {
        // Components and frames that look like individual icons
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          if (filterRegex && !filterRegex.test(node.name)) continue
          // Skip component sets — we'll pick variant children
          if (node.type === 'COMPONENT_SET' && node.children) {
            for (const child of node.children) {
              if (child.type === 'COMPONENT') {
                if (filterRegex && !filterRegex.test(child.name)) continue
                target.set(child.id, child.name)
              }
            }
          } else {
            target.set(node.id, node.name)
          }
        } else if (node.type === 'FRAME' && node.children) {
          // If a frame has only small children (likely icons), include it directly
          // Otherwise recurse into it
          const hasComponents = node.children.some(c => c.type === 'COMPONENT' || c.type === 'COMPONENT_SET')
          if (hasComponents) {
            collectIconNodes(node.children, target)
          } else if (node.children.length <= 1) {
            // Single-child frame might be an icon itself
            if (filterRegex && !filterRegex.test(node.name)) continue
            target.set(node.id, node.name)
          } else {
            // Frame with multiple children — each child could be an icon
            collectIconNodes(node.children, target)
          }
        } else if (node.type === 'GROUP' && node.children) {
          collectIconNodes(node.children, target)
        }
      }
    }

    const pages = document.children || []
    for (const page of pages) {
      if (page.type !== 'CANVAS') continue
      if (pageNames && pageNames.length > 0 && !pageNames.includes(page.name)) continue

      const nodeMap = new Map<string, string>()
      if (page.children) {
        collectIconNodes(page.children, nodeMap)
      }

      if (nodeMap.size > 0) {
        packsToCreate.push({
          pageName: page.name,
          nodeIds: Array.from(nodeMap.keys()),
          nodeNames: nodeMap,
        })
      }
    }

    console.log(`[figma-import] Found ${packsToCreate.length} pages with icons, total nodes: ${packsToCreate.reduce((s, p) => s + p.nodeIds.length, 0)}`)

    if (packsToCreate.length === 0) {
      return NextResponse.json({
        error: 'Не найдено компонентов или фреймов для импорта. Убедитесь что файл содержит компоненты иконок.',
      }, { status: 400 })
    }

    // 3. Batch-fetch SVG exports (max 200 IDs per request)
    const SVG_BATCH_SIZE = 200
    const allSvgMap = new Map<string, string>() // nodeId → SVG string

    for (const pack of packsToCreate) {
      for (let i = 0; i < pack.nodeIds.length; i += SVG_BATCH_SIZE) {
        const batch = pack.nodeIds.slice(i, i + SVG_BATCH_SIZE)
        const idsParam = batch.join(',')

        console.log(`[figma-import] Fetching SVGs batch ${Math.floor(i / SVG_BATCH_SIZE) + 1} for page "${pack.pageName}" (${batch.length} icons)`)

        const imgRes = await fetch(
          `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=svg&svg_include_id_attribute=false`,
          { headers: { 'X-Figma-Token': figmaToken } },
        )

        if (!imgRes.ok) {
          console.error(`[figma-import] Image export error: ${imgRes.status}`)
          continue
        }

        const imgData = await imgRes.json()
        const images = imgData.images || {}

        for (const [nodeId, url] of Object.entries(images)) {
          if (typeof url !== 'string' || !url) continue
          try {
            const svgRes = await fetch(url)
            if (svgRes.ok) {
              const svgText = await svgRes.text()
              allSvgMap.set(nodeId, svgText)
            }
          } catch (e) {
            console.error(`[figma-import] Failed to fetch SVG for ${nodeId}:`, e)
          }
        }
      }
    }

    console.log(`[figma-import] Downloaded ${allSvgMap.size} SVGs`)

    // 4. Parse SVGs and create packs
    const results: string[] = []
    let totalPacksCreated = 0
    let totalIconsCreated = 0

    // If only one page or custom names provided, create a single pack
    const createSinglePack = packNameEn || packNameRu || packsToCreate.length === 1

    if (createSinglePack) {
      // Merge all into one pack
      const allIcons: Array<{ slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }> = []

      for (const pack of packsToCreate) {
        for (const [nodeId, nodeName] of pack.nodeNames) {
          const svgRaw = allSvgMap.get(nodeId)
          if (!svgRaw) continue

          const parsed = parseSvgIcon(svgRaw, nodeName)
          if (parsed) allIcons.push(parsed)
        }
      }

      if (allIcons.length === 0) {
        return NextResponse.json({ error: 'Не удалось распарсить ни одной SVG-иконки' }, { status: 400 })
      }

      const slug = (packNameEn || fileName)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const finalSlug = await ensureUniqueSlug(slug)

      const pack = await db.pack.create({
        data: {
          slug: finalSlug,
          nameRu: packNameRu || fileName,
          nameEn: packNameEn || fileName,
          descRu: `Импортировано из Figma: ${fileName}`,
          descEn: `Imported from Figma: ${fileName}`,
          category,
          style: style || 'outline',
          tags: allIcons.slice(0, 20).map(i => i.slug.split('-').pop()).join(','),
          isFree: true,
          priceCredits: 10,
          icons: { create: allIcons },
        },
        include: { _count: { select: { icons: true } } },
      })

      totalPacksCreated = 1
      totalIconsCreated = pack._count.icons
      results.push(`✓ "${finalSlug}" — ${pack._count.icons} icons`)
    } else {
      // Create one pack per page
      for (const pack of packsToCreate) {
        const icons: Array<{ slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }> = []

        for (const [nodeId, nodeName] of pack.nodeNames) {
          const svgRaw = allSvgMap.get(nodeId)
          if (!svgRaw) continue

          const parsed = parseSvgIcon(svgRaw, nodeName)
          if (parsed) icons.push(parsed)
        }

        if (icons.length < 1) continue

        const pageSlug = pack.pageName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

        const finalSlug = await ensureUniqueSlug(`figma-${pageSlug}`)

        try {
          const created = await db.pack.create({
            data: {
              slug: finalSlug,
              nameRu: pack.pageName,
              nameEn: pack.pageName,
              descRu: `Импортировано из Figma: ${fileName}, страница "${pack.pageName}"`,
              descEn: `Imported from Figma: ${fileName}, page "${pack.pageName}"`,
              category,
              style: style || 'outline',
              tags: icons.slice(0, 20).map(i => i.slug.split('-').pop()).join(','),
              isFree: true,
              priceCredits: 10,
              icons: { create: icons },
            },
            include: { _count: { select: { icons: true } } },
          })

          totalPacksCreated++
          totalIconsCreated += created._count.icons
          results.push(`✓ "${finalSlug}" (${pack.pageName}) — ${created._count.icons} icons`)
        } catch (e: any) {
          results.push(`✗ "${pageSlug}" — ${e?.message || 'error'}`)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      totalPacks: totalPacksCreated,
      totalIcons: totalIconsCreated,
      fileName,
      results,
    })
  } catch (e: any) {
    console.error('[/api/admin/figma-import] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// ── Helpers ──────────────────────────────────────────────

/** Parse raw SVG string into our Icon format */
function parseSvgIcon(svgRaw: string, nodeName: string): { slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string } | null {
  // Extract viewBox
  let viewBox = '0 0 24 24'
  const vbMatch = svgRaw.match(/viewBox\s*=\s*["']([^"']+)["']/)
  if (vbMatch) {
    viewBox = vbMatch[1]
  } else {
    // Try width/height
    const wMatch = svgRaw.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
    const hMatch = svgRaw.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
    if (wMatch && hMatch) {
      viewBox = `0 0 ${wMatch[1]} ${hMatch[1]}`
    }
  }

  // Extract inner SVG body
  const innerMatch = svgRaw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  let svgBody = innerMatch ? innerMatch[1].trim() : svgRaw.trim()
  if (!svgBody || svgBody.length < 3) return null

  // Clean up: remove xmlns, ids, etc.
  svgBody = svgBody
    .replace(/\s*xmlns="[^"]*"/g, '')
    .replace(/\s*xmlns:xlink="[^"]*"/g, '')
    .replace(/\s*id="[^"]*"/g, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<desc[^>]*>[\s\S]*?<\/desc>\s*/gi, '')
    .trim()

  // Generate slug from node name
  const slug = nodeName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!slug) return null

  // Generate display name from slug
  const nameEn = nodeName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  // Normalize viewBox to 0 0 24 24 if it's a standard 24x24 grid
  const vbParts = viewBox.split(/[\s,]+/).map(Number)
  if (vbParts.length === 4 && vbParts[2] === 24 && vbParts[3] === 24) {
    viewBox = '0 0 24 24'
  }

  return {
    slug,
    nameRu: nameEn, // Figma has no Russian names, use English as fallback
    nameEn,
    keywords: nodeName.toLowerCase().replace(/[-_]/g, ' '),
    svg: svgBody,
    viewBox,
  }
}

/** Ensure slug is unique in DB */
async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base
  let suffix = 2
  while (await db.pack.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`
    suffix++
  }
  return candidate
}
