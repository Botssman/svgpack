import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
  suggestedCategory: string
}

/**
 * GET /api/admin/figma-import?figmaToken=...&fileKey=...
 *
 * Preview the structure of a Figma file before importing.
 * Returns: pages with frames (each frame = potential pack) and suggested categories.
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

    // Fetch categories from DB
    const dbCategories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })

    // ── Keyword matching for category suggestions ──
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

    function suggestCategory(name: string): { category: string; confidence: number } {
      const lower = name.toLowerCase()

      let bestCategory = 'uncategorized'
      let bestScore = 0

      for (const [catSlug, keywords] of Object.entries(categoryKeywords)) {
        let score = 0
        for (const kw of keywords) {
          if (lower.includes(kw)) {
            // Name starts with keyword → stronger signal
            score += lower.startsWith(kw) ? 3 : 1
          }
        }
        if (score > bestScore) {
          bestScore = score
          bestCategory = catSlug
        }
      }

      return { category: bestCategory, confidence: bestScore }
    }

    // ── Walk the tree to find frames with icons ──
    function countIconsInNodes(nodes: FigmaNode[]): number {
      let count = 0
      for (const node of nodes) {
        if (node.type === 'COMPONENT') count++
        else if (node.type === 'COMPONENT_SET' && node.children) {
          count += node.children.filter(c => c.type === 'COMPONENT').length
        }
      }
      return count
    }

    // Walk a page to find top-level frames that contain icons
    function findIconFrames(nodes: FigmaNode[]): FrameInfo[] {
      const frames: FrameInfo[] = []

      for (const node of nodes) {
        if (node.type === 'FRAME' && node.children) {
          const directIcons = countIconsInNodes(node.children)

          if (directIcons > 0) {
            // This frame directly contains components → it's a pack candidate
            const suggestion = suggestCategory(node.name)
            frames.push({
              id: node.id,
              name: node.name,
              iconCount: directIcons,
              suggestedCategory: suggestion.category,
            })
          } else {
            // No direct icons → recurse deeper (nested frames)
            const deeper = findIconFrames(node.children)
            frames.push(...deeper)
          }
        } else if (node.type === 'GROUP' && node.children) {
          const deeper = findIconFrames(node.children)
          frames.push(...deeper)
        } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          // Icons directly on the page (not inside a frame)
          // Wrap them into a virtual "page" frame
          const existing = frames.find(f => f.id === '__page__')
          if (node.type === 'COMPONENT_SET' && node.children) {
            const count = node.children.filter(c => c.type === 'COMPONENT').length
            if (existing) existing.iconCount += count
            else frames.push({ id: '__page__', name: 'Page Icons', iconCount: count, suggestedCategory: 'uncategorized' })
          } else {
            if (existing) existing.iconCount += 1
            else frames.push({ id: '__page__', name: 'Page Icons', iconCount: 1, suggestedCategory: 'uncategorized' })
          }
        }
      }

      return frames
    }

    // ── Build pages with frames ──
    const pages: PageInfo[] = []
    const canvasPages = document.children || []

    for (const page of canvasPages) {
      if (page.type !== 'CANVAS') continue
      if (!page.children || page.children.length === 0) continue

      const frameDetails = findIconFrames(page.children)
      if (frameDetails.length === 0) continue

      const totalIcons = frameDetails.reduce((s, f) => s + f.iconCount, 0)
      const pageSuggestion = suggestCategory(page.name)

      pages.push({
        id: page.id,
        name: page.name,
        iconCount: totalIcons,
        frames: frameDetails,
        suggestedCategory: pageSuggestion.category,
      })
    }

    const totalIcons = pages.reduce((s, p) => s + p.iconCount, 0)

    return NextResponse.json({
      ok: true,
      fileName,
      totalIcons,
      totalPages: pages.length,
      pages,
      categories: dbCategories.map(c => ({
        slug: c.slug,
        nameRu: c.nameRu,
        nameEn: c.nameEn,
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
 * Body:
 *   { figmaToken, fileKey, style,
 *     frames: [{ id, name, category, enabled, pageName }] }
 *
 * Each enabled frame becomes its own pack.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { figmaToken, fileKey, category, style, packNameRu, packNameEn, frames: frameConfig } = body as {
      figmaToken: string
      fileKey: string
      category?: string
      style?: string
      packNameRu?: string
      packNameEn?: string
      frames?: Array<{ id: string; name: string; category: string; enabled: boolean; pageName: string }>
    }

    if (!figmaToken || !fileKey) {
      return NextResponse.json({ error: 'figmaToken и fileKey обязательны' }, { status: 400 })
    }

    // Validate categories against DB
    const dbCategories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })
    const validSlugs = new Set(dbCategories.map(c => c.slug))

    // Legacy: single category mode
    const legacyMode = !frameConfig || frameConfig.length === 0
    if (legacyMode && !category) {
      return NextResponse.json({ error: 'Укажите category или массив frames' }, { status: 400 })
    }

    if (category && !validSlugs.has(category)) {
      return NextResponse.json({ error: `Неизвестная категория: ${category}` }, { status: 400 })
    }

    if (frameConfig) {
      for (const fc of frameConfig) {
        if (!validSlugs.has(fc.category)) {
          return NextResponse.json({ error: `Неизвестная категория: ${fc.category} для фрейма "${fc.name}"` }, { status: 400 })
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

    // 2. Walk the document tree to find icons per frame
    // For per-frame mode, we need to collect icons for each specific frame
    const packsToCreate: Array<{
      frameName: string
      frameId: string
      pageName: string
      nodeIds: string[]
      nodeNames: Map<string, string>
      packCategory: string
    }> = []

    function collectIconNodes(nodes: FigmaNode[], target: Map<string, string>) {
      for (const node of nodes) {
        if (node.type === 'COMPONENT') {
          target.set(node.id, node.name)
        } else if (node.type === 'COMPONENT_SET' && node.children) {
          for (const child of node.children) {
            if (child.type === 'COMPONENT') {
              target.set(child.id, child.name)
            }
          }
        } else if (node.type === 'FRAME' && node.children) {
          collectIconNodes(node.children, target)
        } else if (node.type === 'GROUP' && node.children) {
          collectIconNodes(node.children, target)
        }
      }
    }

    function findFrameNode(nodes: FigmaNode[], frameId: string): FigmaNode | null {
      for (const node of nodes) {
        if (node.id === frameId) return node
        if (node.children) {
          const found = findFrameNode(node.children, frameId)
          if (found) return found
        }
      }
      return null
    }

    const canvasPages = document.children || []

    if (legacyMode) {
      // Legacy: collect all icons from all pages → one pack
      const nodeMap = new Map<string, string>()
      for (const page of canvasPages) {
        if (page.type !== 'CANVAS' || !page.children) continue
        collectIconNodes(page.children, nodeMap)
      }

      if (nodeMap.size > 0) {
        packsToCreate.push({
          frameName: packNameEn || fileName,
          frameId: '__all__',
          pageName: fileName,
          nodeIds: Array.from(nodeMap.keys()),
          nodeNames: nodeMap,
          packCategory: category || 'system',
        })
      }
    } else {
      // Per-frame mode: find icons in each specific frame
      for (const fc of frameConfig) {
        if (!fc.enabled) continue

        const nodeMap = new Map<string, string>()

        // Special case: "__page__" means loose icons not in any frame
        if (fc.id === '__page__') {
          // Find the page and collect loose components
          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            if (page.name !== fc.pageName) continue

            for (const child of page.children) {
              if (child.type === 'COMPONENT') {
                nodeMap.set(child.id, child.name)
              } else if (child.type === 'COMPONENT_SET' && child.children) {
                for (const variant of child.children) {
                  if (variant.type === 'COMPONENT') nodeMap.set(variant.id, variant.name)
                }
              }
            }
          }
        } else {
          // Find the frame node and collect its icons
          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            const frameNode = findFrameNode(page.children, fc.id)
            if (frameNode && frameNode.children) {
              collectIconNodes(frameNode.children, nodeMap)
            }
          }
        }

        if (nodeMap.size > 0) {
          packsToCreate.push({
            frameName: fc.name,
            frameId: fc.id,
            pageName: fc.pageName,
            nodeIds: Array.from(nodeMap.keys()),
            nodeNames: nodeMap,
            packCategory: fc.category,
          })
        }
      }
    }

    console.log(`[figma-import] Found ${packsToCreate.length} packs to create, total nodes: ${packsToCreate.reduce((s, p) => s + p.nodeIds.length, 0)}`)

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

        console.log(`[figma-import] Fetching SVGs batch ${Math.floor(i / SVG_BATCH_SIZE) + 1} for frame "${pack.frameName}" (${batch.length} icons)`)

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

    for (const pack of packsToCreate) {
      const icons: Array<{ slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }> = []

      for (const [nodeId, nodeName] of pack.nodeNames) {
        const svgRaw = allSvgMap.get(nodeId)
        if (!svgRaw) continue
        const parsed = parseSvgIcon(svgRaw, nodeName)
        if (parsed) icons.push(parsed)
      }

      if (icons.length < 1) continue

      const frameSlug = pack.frameName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const finalSlug = await ensureUniqueSlug(`figma-${frameSlug}`)

      try {
        const catInfo = dbCategories.find(c => c.slug === pack.packCategory)
        const catLabel = catInfo ? catInfo.nameRu : pack.packCategory

        const created = await db.pack.create({
          data: {
            slug: finalSlug,
            nameRu: pack.frameName,
            nameEn: pack.frameName,
            descRu: `Импортировано из Figma: ${fileName}, фрейм "${pack.frameName}" (категория: ${catLabel})`,
            descEn: `Imported from Figma: ${fileName}, frame "${pack.frameName}" (category: ${catLabel})`,
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
        results.push(`✓ "${finalSlug}" (${pack.frameName}) [${catLabel}] — ${created._count.icons} icons`)
      } catch (e: any) {
        results.push(`✗ "${frameSlug}" — ${e?.message || 'error'}`)
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
