import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CATEGORIES } from '@/lib/categories'

// ── Shared types ──────────────────────────────────────
interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
}

interface PageInfo {
  id: string
  name: string
  iconCount: number
  frames: FrameInfo[]
  suggestedCategory: string
}

interface FrameInfo {
  id: string
  name: string
  iconCount: number
}

/**
 * GET /api/admin/figma-import?figmaToken=...&fileKey=...
 *
 * Preview the structure of a Figma file before importing.
 * Returns: pages with icon counts and suggested categories.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const figmaToken = searchParams.get('figmaToken')
    const fileKey = searchParams.get('fileKey')

    if (!figmaToken || !fileKey) {
      return NextResponse.json({ error: 'figmaToken и fileKey обязательны' }, { status: 400 })
    }

    // Fetch Figma file document
    console.log(`[figma-import/preview] Fetching file: ${fileKey}`)
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': figmaToken },
    })

    if (!fileRes.ok) {
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

    // Walk the tree to count icons per page and per frame
    function countIcons(nodes: FigmaNode[]): { total: number; frameDetails: FrameInfo[] } {
      let total = 0
      const frameDetails: FrameInfo[] = []

      function walk(nodes: FigmaNode[]) {
        for (const node of nodes) {
          if (node.type === 'COMPONENT') {
            total++
          } else if (node.type === 'COMPONENT_SET' && node.children) {
            // Count each variant as a separate icon
            const variantCount = node.children.filter(c => c.type === 'COMPONENT').length
            total += variantCount
          } else if (node.type === 'FRAME' && node.children) {
            // Check if this frame contains components (it's a category frame)
            const componentCount = node.children.filter(c =>
              c.type === 'COMPONENT' || c.type === 'COMPONENT_SET'
            ).length

            if (componentCount > 0) {
              // This frame is a grouping/category frame
              let iconCount = 0
              for (const child of node.children) {
                if (child.type === 'COMPONENT') iconCount++
                else if (child.type === 'COMPONENT_SET' && child.children) {
                  iconCount += child.children.filter(c => c.type === 'COMPONENT').length
                }
              }
              frameDetails.push({ id: node.id, name: node.name, iconCount })
              total += iconCount
            } else {
              // Recurse deeper
              walk(node.children)
            }
          } else if (node.type === 'GROUP' && node.children) {
            walk(node.children)
          }
        }
      }

      walk(nodes)
      return { total, frameDetails }
    }

    // Build page info with category suggestions
    const categorySlugs = CATEGORIES.map(c => c.slug)
    const categoryKeywords: Record<string, string[]> = {
      arrows: ['arrow', 'direction', 'navigate', 'chevron', 'navigation'],
      brands: ['brand', 'logo', 'social', 'company', 'google', 'apple', 'facebook'],
      buildings: ['building', 'city', 'house', 'architecture', 'office', 'factory'],
      communication: ['message', 'chat', 'mail', 'phone', 'call', 'email'],
      concepts: ['concept', 'pattern', 'api', 'database', 'server', 'cloud', 'microservice'],
      design: ['design', 'color', 'palette', 'pen', 'brush', 'camera', 'layer'],
      devices: ['device', 'phone', 'computer', 'laptop', 'tablet', 'monitor', 'watch'],
      document: ['document', 'file', 'folder', 'paper', 'certificate', 'report'],
      ecommerce: ['shop', 'cart', 'store', 'payment', 'price', 'discount', 'money'],
      education: ['education', 'school', 'book', 'learn', 'teach', 'student', 'graduate'],
      food: ['food', 'drink', 'restaurant', 'kitchen', 'cook', 'meal'],
      frameworks: ['framework', 'react', 'vue', 'angular', 'svelte', 'next'],
      games: ['game', 'play', 'controller', 'dice', 'chess', 'puzzle'],
      health: ['health', 'medical', 'heart', 'doctor', 'hospital', 'medicine'],
      languages: ['language', 'code', 'programming', 'javascript', 'python', 'html'],
      letters: ['letter', 'alphabet', 'number', 'symbol', 'character', 'font'],
      map: ['map', 'location', 'pin', 'compass', 'gps', 'route'],
      media: ['media', 'music', 'play', 'video', 'microphone', 'headphone', 'record'],
      mood: ['mood', 'emoji', 'smile', 'face', 'emotion', 'feeling'],
      nature: ['nature', 'tree', 'leaf', 'flower', 'animal', 'weather', 'sun'],
      science: ['science', 'math', 'chart', 'graph', 'formula', 'atom', 'lab'],
      shapes: ['shape', 'circle', 'square', 'triangle', 'polygon', 'star'],
      sport: ['sport', 'football', 'basketball', 'tennis', 'run', 'swim', 'trophy'],
      system: ['system', 'setting', 'filter', 'notification', 'menu', 'button', 'toggle', 'ui'],
      tools: ['tool', 'dev', 'git', 'github', 'docker', 'terminal', 'code', 'debug'],
      vehicles: ['vehicle', 'car', 'bike', 'plane', 'ship', 'bus', 'train'],
    }

    function suggestCategory(pageName: string, frameNames: string[]): string {
      const combined = (pageName + ' ' + frameNames.join(' ')).toLowerCase()

      // Score each category by keyword matches
      let bestCategory = 'system' // default
      let bestScore = 0

      for (const [catSlug, keywords] of Object.entries(categoryKeywords)) {
        let score = 0
        for (const kw of keywords) {
          if (combined.includes(kw)) score++
        }
        if (score > bestScore) {
          bestScore = score
          bestCategory = catSlug
        }
      }

      return bestCategory
    }

    const pages: PageInfo[] = []
    const canvasPages = document.children || []

    for (const page of canvasPages) {
      if (page.type !== 'CANVAS') continue
      if (!page.children || page.children.length === 0) continue

      const { total, frameDetails } = countIcons(page.children)
      if (total === 0) continue

      const suggestedCategory = suggestCategory(page.name, frameDetails.map(f => f.name))

      pages.push({
        id: page.id,
        name: page.name,
        iconCount: total,
        frames: frameDetails,
        suggestedCategory,
      })
    }

    const totalIcons = pages.reduce((s, p) => s + p.iconCount, 0)

    return NextResponse.json({
      ok: true,
      fileName,
      totalIcons,
      totalPages: pages.length,
      pages,
      categories: CATEGORIES.map(c => ({
        slug: c.slug,
        nameRu: c.nameRu,
        nameEn: c.nameEn,
        icon: c.icon,
      })),
    })
  } catch (e: any) {
    console.error('[/api/admin/figma-import GET] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/figma-import
 *
 * Import icons from a Figma file via the Figma API.
 *
 * Two modes:
 *
 * A) Simple (single category for all):
 *   { figmaToken, fileKey, category, style, packNameRu?, packNameEn? }
 *
 * B) Advanced (per-page categories — auto-create packs by page):
 *   { figmaToken, fileKey, style, pages: [{ name, category, enabled }] }
 *
 * When `pages` array is provided, each page becomes its own pack
 * with its own category assignment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { figmaToken, fileKey, category, style, packNameRu, packNameEn, pageNames, frameFilter, pages: pageConfig } = body as {
      figmaToken: string
      fileKey: string
      category?: string
      style?: string
      packNameRu?: string
      packNameEn?: string
      pageNames?: string[]
      frameFilter?: string
      pages?: Array<{ name: string; category: string; enabled: boolean }>
    }

    if (!figmaToken || !fileKey) {
      return NextResponse.json({ error: 'figmaToken и fileKey обязательны' }, { status: 400 })
    }

    // Validate: either single category or per-page config
    const advancedMode = Array.isArray(pageConfig) && pageConfig.length > 0
    if (!advancedMode && !category) {
      return NextResponse.json({ error: 'Укажите category или массив pages с категориями' }, { status: 400 })
    }

    if (category) {
      const validCategory = CATEGORIES.find(c => c.slug === category)
      if (!validCategory) {
        return NextResponse.json({ error: `Неизвестная категория: ${category}` }, { status: 400 })
      }
    }

    if (advancedMode) {
      for (const pc of pageConfig) {
        if (!CATEGORIES.find(c => c.slug === pc.category)) {
          return NextResponse.json({ error: `Неизвестная категория: ${pc.category} для страницы "${pc.name}"` }, { status: 400 })
        }
      }
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
    const packsToCreate: Array<{
      pageName: string
      nodeIds: string[]
      nodeNames: Map<string, string>
      packCategory: string
    }> = []

    const filterRegex = frameFilter ? new RegExp(frameFilter, 'i') : null

    function collectIconNodes(nodes: FigmaNode[], target: Map<string, string>) {
      for (const node of nodes) {
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          if (filterRegex && !filterRegex.test(node.name)) continue
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
          const hasComponents = node.children.some(c => c.type === 'COMPONENT' || c.type === 'COMPONENT_SET')
          if (hasComponents) {
            collectIconNodes(node.children, target)
          } else if (node.children.length <= 1) {
            if (filterRegex && !filterRegex.test(node.name)) continue
            target.set(node.id, node.name)
          } else {
            collectIconNodes(node.children, target)
          }
        } else if (node.type === 'GROUP' && node.children) {
          collectIconNodes(node.children, target)
        }
      }
    }

    // Build a set of enabled page names (for filtering)
    const enabledPageNames = advancedMode
      ? new Set(pageConfig.filter(p => p.enabled).map(p => p.name))
      : (pageNames ? new Set(pageNames) : null)

    const canvasPages = document.children || []
    for (const page of canvasPages) {
      if (page.type !== 'CANVAS') continue

      // Filter by enabled pages
      if (enabledPageNames && !enabledPageNames.has(page.name)) continue

      const nodeMap = new Map<string, string>()
      if (page.children) {
        collectIconNodes(page.children, nodeMap)
      }

      if (nodeMap.size > 0) {
        // Determine category for this page
        let packCategory = category || 'system'
        if (advancedMode) {
          const pc = pageConfig.find(p => p.name === page.name)
          packCategory = pc?.category || 'system'
        }

        packsToCreate.push({
          pageName: page.name,
          nodeIds: Array.from(nodeMap.keys()),
          nodeNames: nodeMap,
          packCategory,
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
    const allSvgMap = new Map<string, string>()

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

    // In advanced mode or multiple pages → always create one pack per page
    // In simple mode with single page or custom name → merge into one pack
    const createSinglePack = !advancedMode && (packNameEn || packNameRu || packsToCreate.length === 1)

    if (createSinglePack) {
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
          category: category || 'system',
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
      // Create one pack per page, each with its own category
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
          const catInfo = CATEGORIES.find(c => c.slug === pack.packCategory)
          const catLabel = catInfo ? (catInfo.nameRu) : pack.packCategory

          const created = await db.pack.create({
            data: {
              slug: finalSlug,
              nameRu: pack.pageName,
              nameEn: pack.pageName,
              descRu: `Импортировано из Figma: ${fileName}, страница "${pack.pageName}" (категория: ${catLabel})`,
              descEn: `Imported from Figma: ${fileName}, page "${pack.pageName}" (category: ${catLabel})`,
              category: pack.packCategory,
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
          results.push(`✓ "${finalSlug}" (${pack.pageName}) [${catLabel}] — ${created._count.icons} icons`)
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
  let viewBox = '0 0 24 24'
  const vbMatch = svgRaw.match(/viewBox\s*=\s*["']([^"']+)["']/)
  if (vbMatch) {
    viewBox = vbMatch[1]
  } else {
    const wMatch = svgRaw.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
    const hMatch = svgRaw.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
    if (wMatch && hMatch) {
      viewBox = `0 0 ${wMatch[1]} ${hMatch[1]}`
    }
  }

  const innerMatch = svgRaw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  let svgBody = innerMatch ? innerMatch[1].trim() : svgRaw.trim()
  if (!svgBody || svgBody.length < 3) return null

  svgBody = svgBody
    .replace(/\s*xmlns="[^"]*"/g, '')
    .replace(/\s*xmlns:xlink="[^"]*"/g, '')
    .replace(/\s*id="[^"]*"/g, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<desc[^>]*>[\s\S]*?<\/desc>\s*/gi, '')
    .trim()

  const slug = nodeName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!slug) return null

  const nameEn = nodeName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  const vbParts = viewBox.split(/[\s,]+/).map(Number)
  if (vbParts.length === 4 && vbParts[2] === 24 && vbParts[3] === 24) {
    viewBox = '0 0 24 24'
  }

  return {
    slug,
    nameRu: nameEn,
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
