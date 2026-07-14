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
  suggestedStyle: string
}

interface FrameInfo {
  id: string
  name: string
  iconCount: number
  suggestedCategory: string
  suggestedStyle: string
}

// ── Category keyword matching (shared between GET & POST) ──
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  arrows: ['arrow', 'direction', 'navigate', 'chevron', 'navigation', 'pointer'],
  brands: ['brand', 'logo', 'social', 'company', 'google', 'apple', 'facebook', 'instagram', 'twitter', 'youtube', 'spotify', 'slack', 'discord'],
  buildings: ['building', 'city', 'house', 'architecture', 'office', 'factory', 'skyscraper', 'monument'],
  communication: ['message', 'chat', 'mail', 'phone', 'call', 'email', 'inbox', 'send', 'bubble', 'talk'],
  concepts: ['concept', 'pattern', 'api', 'database', 'server', 'cloud', 'microservice', 'deploy', 'pipeline', 'workflow', 'logic'],
  design: ['design', 'color', 'palette', 'pen', 'brush', 'camera', 'layer', 'layout', 'crop', 'mask', 'gradient'],
  devices: ['device', 'phone', 'computer', 'laptop', 'tablet', 'monitor', 'watch', 'smartphone', 'desktop', 'tv'],
  document: ['document', 'file', 'folder', 'paper', 'certificate', 'report', 'note', 'clipboard', 'archive', 'invoice'],
  ecommerce: ['shop', 'cart', 'store', 'payment', 'price', 'discount', 'money', 'coin', 'wallet', 'receipt', 'bag'],
  education: ['education', 'school', 'book', 'learn', 'teach', 'student', 'graduate', 'cap', 'academic', 'course'],
  food: ['food', 'drink', 'restaurant', 'kitchen', 'cook', 'meal', 'coffee', 'pizza', 'cake', 'wine'],
  frameworks: ['framework', 'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'astro', 'solid'],
  games: ['game', 'play', 'controller', 'dice', 'chess', 'puzzle', 'trophy', 'joystick', 'vr'],
  health: ['health', 'medical', 'heart', 'doctor', 'hospital', 'medicine', 'pharmacy', 'pulse', 'stethoscope'],
  languages: ['language', 'code', 'programming', 'javascript', 'python', 'html', 'css', 'typescript', 'ruby', 'golang', 'rust'],
  letters: ['letter', 'alphabet', 'number', 'symbol', 'character', 'font', 'typography', 'text', 'glyph'],
  map: ['map', 'location', 'pin', 'compass', 'gps', 'route', 'globe', 'world', 'address'],
  media: ['media', 'music', 'video', 'microphone', 'headphone', 'record', 'player', 'film', 'camera', 'speaker', 'volume'],
  mood: ['mood', 'emoji', 'smile', 'face', 'emotion', 'feeling', 'happy', 'sad', 'angry'],
  nature: ['nature', 'tree', 'leaf', 'flower', 'animal', 'weather', 'sun', 'moon', 'star', 'mountain', 'river'],
  science: ['science', 'math', 'chart', 'graph', 'formula', 'atom', 'lab', 'experiment', 'physics', 'biology'],
  shapes: ['shape', 'circle', 'square', 'triangle', 'polygon', 'star', 'hexagon', 'diamond', 'octagon'],
  sport: ['sport', 'football', 'basketball', 'tennis', 'run', 'swim', 'trophy', 'medal', 'stadium', 'ball'],
  system: ['system', 'setting', 'filter', 'notification', 'menu', 'button', 'toggle', 'ui', 'checkbox', 'slider', 'switch', 'input', 'dropdown', 'search', 'close', 'plus', 'minus', 'check', 'edit', 'delete', 'copy', 'move', 'drag', 'scroll', 'lock', 'unlock', 'eye', 'link', 'external', 'refresh', 'download', 'upload', 'share', 'save', 'more', 'grid', 'list', 'sort', 'zoom'],
  tools: ['tool', 'dev', 'git', 'github', 'docker', 'terminal', 'code', 'debug', 'wrench', 'hammer', 'settings', 'plug', 'api', 'command'],
  vehicles: ['vehicle', 'car', 'bike', 'plane', 'ship', 'bus', 'train', 'helicopter', 'rocket', 'truck', 'scooter'],
}

function suggestCategoryByName(name: string): { category: string; confidence: number } {
  const lower = name.toLowerCase()
  let bestCategory = 'uncategorized'
  let bestScore = 0
  for (const [catSlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const wordBoundary = new RegExp(`\\b${kw}\\b`).test(lower)
        score += lower.startsWith(kw) ? 4 : wordBoundary ? 3 : 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = catSlug
    }
  }
  return { category: bestCategory, confidence: bestScore }
}

/**
 * Map a Figma component name prefix (e.g. "Arrow", "Brand", "System")
 * to one of our category slugs using the keyword dictionary.
 */
function prefixToCategory(prefix: string): string {
  // Direct match first — the prefix itself might match a keyword
  const direct = suggestCategoryByName(prefix)
  if (direct.confidence >= 3) return direct.category

  // Try lowercased prefix
  const lower = prefix.toLowerCase().trim()

  // Manual overrides for common Figma naming patterns
  const overrides: Record<string, string> = {
    'arrow': 'arrows',
    'arrows': 'arrows',
    'brand': 'brands',
    'brands': 'brands',
    'logo': 'brands',
    'social': 'brands',
    'building': 'buildings',
    'buildings': 'buildings',
    'communication': 'communication',
    'chat': 'communication',
    'message': 'communication',
    'mail': 'communication',
    'phone': 'communication',
    'concept': 'concepts',
    'concepts': 'concepts',
    'design': 'design',
    'device': 'devices',
    'devices': 'devices',
    'document': 'document',
    'documents': 'document',
    'file': 'document',
    'files': 'document',
    'folder': 'document',
    'ecommerce': 'ecommerce',
    'shop': 'ecommerce',
    'shopping': 'ecommerce',
    'store': 'ecommerce',
    'cart': 'ecommerce',
    'money': 'ecommerce',
    'education': 'education',
    'food': 'food',
    'drink': 'food',
    'framework': 'frameworks',
    'frameworks': 'frameworks',
    'game': 'games',
    'games': 'games',
    'health': 'health',
    'medical': 'health',
    'language': 'languages',
    'languages': 'languages',
    'programming': 'languages',
    'letter': 'letters',
    'letters': 'letters',
    'alphabet': 'letters',
    'number': 'letters',
    'map': 'map',
    'maps': 'map',
    'location': 'map',
    'media': 'media',
    'music': 'media',
    'video': 'media',
    'mood': 'mood',
    'emoji': 'mood',
    'nature': 'nature',
    'weather': 'nature',
    'animal': 'nature',
    'science': 'science',
    'chart': 'science',
    'shape': 'shapes',
    'shapes': 'shapes',
    'sport': 'sport',
    'sports': 'sport',
    'system': 'system',
    'interface': 'system',
    'ui': 'system',
    'tool': 'tools',
    'tools': 'tools',
    'dev': 'tools',
    'developer': 'tools',
    'vehicle': 'vehicles',
    'vehicles': 'vehicles',
    'transport': 'vehicles',
    'transportation': 'vehicles',
    'security': 'system',
    'time': 'system',
    'user': 'system',
    'people': 'communication',
    'person': 'communication',
    'alert': 'system',
    'notification': 'system',
  }

  if (overrides[lower]) return overrides[lower]

  // Fallback: keyword match on the prefix
  if (direct.confidence > 0) return direct.category

  return 'uncategorized'
}

// ── Style detection ──
function suggestStyle(name: string): string {
  const lower = name.toLowerCase().trim()
  // Remove emoji prefixes like 🐸, 🐵, etc.
  const cleaned = lower.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()

  if (/duotone|two.?tone|twotone|dual|color/.test(cleaned)) return 'duotone'
  if (/cute|kawaii/.test(cleaned)) return 'cute'
  if (/fill|filled/.test(cleaned)) return 'filled'
  if (/bold|solid|heavy|thick/.test(cleaned)) return 'filled'
  if (/thin|light/.test(cleaned)) return 'thin'
  if (/regular|outline|line|stroke/.test(cleaned)) return 'outline'
  // Default to outline
  return 'outline'
}

/**
 * GET /api/admin/figma-import?figmaToken=...&fileKey=...
 *
 * Preview the structure of a Figma file before importing.
 *
 * Strategy for detecting packs:
 * 1. Each CANVAS page with icons → style is detected from page name
 * 2. Inside a page, icons are grouped into packs by:
 *    a. If FRAMEs/GROUPs contain icons → each = separate pack
 *    b. If icons are flat (no sub-structure) → group by "Category / Name" prefix
 * 3. Style is auto-detected from page name + component names
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const figmaToken = searchParams.get('figmaToken')
    const fileKey = searchParams.get('fileKey')
    const isDebug = searchParams.get('debug') === '1'

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

    // ── Collect all components from a node tree ──
    function collectAllComponents(node: FigmaNode): Array<{ id: string; name: string }> {
      const result: Array<{ id: string; name: string }> = []
      function walk(n: FigmaNode) {
        if (n.type === 'COMPONENT') {
          result.push({ id: n.id, name: n.name })
        } else if (n.type === 'COMPONENT_SET' && n.children) {
          for (const c of n.children) {
            if (c.type === 'COMPONENT') result.push({ id: c.id, name: c.name })
          }
        }
        if (n.children) for (const c of n.children) walk(c)
      }
      walk(node)
      return result
    }

    /**
     * Count icons at the DIRECT level (not recursing into FRAME/GROUP children).
     */
    function countDirectIcons(nodes: FigmaNode[]): number {
      let count = 0
      for (const n of nodes) {
        if (n.type === 'COMPONENT') count++
        else if (n.type === 'COMPONENT_SET' && n.children) {
          count += n.children.filter(c => c.type === 'COMPONENT').length
        }
      }
      return count
    }

    /**
     * Count ALL icons recursively inside a node.
     */
    function countAllIcons(node: FigmaNode): number {
      return collectAllComponents(node).length
    }

    /**
     * Count child FRAMEs/GROUPs that contain icons.
     */
    function countChildContainersWithIcons(node: FigmaNode): number {
      if (!node.children) return 0
      let count = 0
      for (const child of node.children) {
        if ((child.type === 'FRAME' || child.type === 'GROUP') && child.children) {
          if (countAllIcons(child) > 0) count++
        }
      }
      return count
    }

    /**
     * Group flat components by their name prefix (the "Category" part in "Category / Icon Name").
     * Returns FrameInfo[] where each frame = one category group.
     */
    function groupComponentsByPrefix(
      components: Array<{ id: string; name: string }>,
      pageStyle: string,
      pageId: string,
    ): FrameInfo[] {
      // Group by prefix (part before " / ")
      const groups: Record<string, Array<{ id: string; name: string }>> = {}
      const noPrefix: Array<{ id: string; name: string }> = []

      for (const comp of components) {
        const parts = comp.name.split(' / ')
        if (parts.length >= 2) {
          const prefix = parts[0].trim()
          if (!groups[prefix]) groups[prefix] = []
          groups[prefix].push(comp)
        } else {
          noPrefix.push(comp)
        }
      }

      const frames: FrameInfo[] = []

      // Each prefix group = one pack
      for (const [prefix, comps] of Object.entries(groups)) {
        const category = prefixToCategory(prefix)
        frames.push({
          id: `${pageId}__prefix__${prefix.toLowerCase().replace(/\s+/g, '-')}`,
          name: prefix,
          iconCount: comps.length,
          suggestedCategory: category,
          suggestedStyle: pageStyle,
        })
      }

      // Leftovers without prefix → single "Other" pack
      if (noPrefix.length > 0) {
        // Try to categorize by keyword matching on names
        const catScores: Record<string, number> = {}
        for (const comp of noPrefix) {
          const { category, confidence } = suggestCategoryByName(comp.name)
          if (category !== 'uncategorized') {
            catScores[category] = (catScores[category] || 0) + confidence
          }
        }
        let bestCat = 'uncategorized'
        let bestScore = 0
        for (const [cat, score] of Object.entries(catScores)) {
          if (score > bestScore) { bestScore = score; bestCat = cat }
        }

        frames.push({
          id: `${pageId}__prefix__other`,
          name: 'Other',
          iconCount: noPrefix.length,
          suggestedCategory: bestCat,
          suggestedStyle: pageStyle,
        })
      }

      return frames
    }

    // ── Walk a page to find icon packs ──
    function findIconPacks(page: FigmaNode): FrameInfo[] {
      if (!page.children) return []

      const pageStyle = suggestStyle(page.name)
      const directIcons = countDirectIcons(page.children)
      const childContainers = countChildContainersWithIcons(page)

      console.log(`[findIconPacks] Page "${page.name}": directIcons=${directIcons}, childContainers=${childContainers}`)

      if (childContainers >= 2) {
        // Page has FRAME/GROUP sub-containers with icons → each = pack
        const frames: FrameInfo[] = []
        for (const child of page.children) {
          if ((child.type === 'FRAME' || child.type === 'GROUP') && child.children) {
            const childIcons = countAllIcons(child)
            if (childIcons === 0) continue

            // Check if this container has its own sub-containers
            const subContainers = countChildContainersWithIcons(child)
            if (subContainers >= 2) {
              // Recurse — split further
              const subFrames = findIconPacksInNode(child, pageStyle)
              frames.push(...subFrames)
            } else {
              // Single container = one pack
              const catFromName = suggestCategoryByName(child.name)
              const category = catFromName.confidence >= 3 ? catFromName.category : suggestCategoryFromComponents(child)
              const style = suggestStyle(child.name) !== 'outline' ? suggestStyle(child.name) : pageStyle

              frames.push({
                id: child.id,
                name: child.name,
                iconCount: childIcons,
                suggestedCategory: category,
                suggestedStyle: style,
              })
            }
          }
        }
        return frames
      }

      if (directIcons > 0) {
        // Flat components on the page — group by name prefix
        const components = collectAllComponents(page)
        console.log(`[findIconPacks] Flat page: ${components.length} components, grouping by prefix`)
        return groupComponentsByPrefix(components, pageStyle, page.id)
      }

      return []
    }

    /**
     * Find icon packs within a FRAME/GROUP node (not a CANVAS page).
     */
    function findIconPacksInNode(node: FigmaNode, parentStyle: string): FrameInfo[] {
      if (!node.children) return []

      const nodeStyle = suggestStyle(node.name) !== 'outline' ? suggestStyle(node.name) : parentStyle
      const childContainers = countChildContainersWithIcons(node)

      if (childContainers >= 2) {
        const frames: FrameInfo[] = []
        for (const child of node.children) {
          if ((child.type === 'FRAME' || child.type === 'GROUP') && child.children) {
            const childIcons = countAllIcons(child)
            if (childIcons === 0) continue

            const catFromName = suggestCategoryByName(child.name)
            const category = catFromName.confidence >= 3 ? catFromName.category : suggestCategoryFromComponents(child)

            frames.push({
              id: child.id,
              name: child.name,
              iconCount: childIcons,
              suggestedCategory: category,
              suggestedStyle: nodeStyle,
            })
          }
        }
        return frames
      }

      // Flat or no sub-containers → group by prefix
      const components = collectAllComponents(node)
      if (components.length > 0) {
        return groupComponentsByPrefix(components, nodeStyle, node.id)
      }

      return []
    }

    /**
     * Suggest category by analyzing component names inside a node.
     */
    function suggestCategoryFromComponents(node: FigmaNode): string {
      const components = collectAllComponents(node)
      if (components.length === 0) return 'uncategorized'

      // First: try "Category / Name" prefixes
      const prefixes = new Set<string>()
      for (const comp of components) {
        const parts = comp.name.split(' / ')
        if (parts.length >= 2) prefixes.add(parts[0].trim())
      }

      if (prefixes.size === 1) {
        const prefix = Array.from(prefixes)[0]
        return prefixToCategory(prefix)
      }

      // Fallback: keyword scoring on component names
      const scores: Record<string, number> = {}
      for (const comp of components) {
        const { category, confidence } = suggestCategoryByName(comp.name)
        if (category !== 'uncategorized') {
          scores[category] = (scores[category] || 0) + confidence
        }
      }

      let bestCat = 'uncategorized'
      let bestScore = 0
      for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) { bestScore = score; bestCat = cat }
      }

      return bestScore >= 2 ? bestCat : 'uncategorized'
    }

    // ── Build pages with frames ──
    const pages: PageInfo[] = []
    const canvasPages = document.children || []

    for (const page of canvasPages) {
      if (page.type !== 'CANVAS') continue
      if (!page.children || page.children.length === 0) continue

      // Skip pages with zero icons (decoration, cover, etc.)
      const totalPageIcons = countAllIcons(page)
      if (totalPageIcons === 0) continue

      const pageStyle = suggestStyle(page.name)
      const frameDetails = findIconPacks(page)
      if (frameDetails.length === 0) continue

      const totalIcons = frameDetails.reduce((s, f) => s + f.iconCount, 0)
      const pageSuggestion = suggestCategoryByName(page.name)

      pages.push({
        id: page.id,
        name: page.name,
        iconCount: totalIcons,
        frames: frameDetails,
        suggestedCategory: pageSuggestion.category,
        suggestedStyle: pageStyle,
      })
    }

    const totalIcons = pages.reduce((s, p) => s + p.iconCount, 0)

    const response: any = {
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
    }

    // Debug: simplified node tree
    if (isDebug) {
      function dumpNode(node: FigmaNode, depth: number = 0): any {
        const result: any = { name: node.name, type: node.type, id: node.id }
        const iconCount = countAllIcons(node)
        if (iconCount > 0) result.totalIcons = iconCount
        if (node.children) {
          const directIcons = countDirectIcons(node.children)
          if (directIcons > 0) result.directIcons = directIcons
          result.childCount = node.children.length
          if (depth < 2) {
            result.children = node.children
              .filter(c => c.type === 'CANVAS' || c.type === 'FRAME' || c.type === 'GROUP' || c.type === 'COMPONENT' || c.type === 'COMPONENT_SET')
              .slice(0, 50)
              .map(c => dumpNode(c, depth + 1))
          }
        }
        return result
      }
      response.debugTree = canvasPages
        .filter((p: FigmaNode) => p.type === 'CANVAS')
        .map((p: FigmaNode) => dumpNode(p, 0))

      // Also include all component name prefixes for debugging
      const allPrefixes: Record<string, number> = {}
      for (const page of canvasPages) {
        if (page.type !== 'CANVAS') continue
        const comps = collectAllComponents(page)
        for (const comp of comps) {
          const parts = comp.name.split(' / ')
          const prefix = parts.length >= 2 ? parts[0].trim() : '_no_prefix_'
          allPrefixes[prefix] = (allPrefixes[prefix] || 0) + 1
        }
      }
      response.debugPrefixes = allPrefixes
    }

    return NextResponse.json(response)
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
 * Import icons from a Figma file.
 *
 * Body:
 *   { figmaToken, fileKey, style,
 *     frames: [{ id, name, category, style, enabled, pageName }] }
 *
 * Frame ID patterns:
 *   - "pageId__prefix__arrow" → components with "Arrow / ..." prefix on that page
 *   - "pageId__prefix__other" → components without "Category / Name" prefix
 *   - Regular Figma node ID → collect all icons in that node
 *   - "__page__" → loose icons on the page
 *   - "nodeId__loose" → only direct children
 *   - "nodeId__cat__slug" → only icons matching keyword category
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
      frames?: Array<{ id: string; name: string; category: string; style: string; enabled: boolean; pageName: string }>
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

    // ── Collect components helper ──
    function collectAllComponents(node: FigmaNode): Array<{ id: string; name: string }> {
      const result: Array<{ id: string; name: string }> = []
      function walk(n: FigmaNode) {
        if (n.type === 'COMPONENT') {
          result.push({ id: n.id, name: n.name })
        } else if (n.type === 'COMPONENT_SET' && n.children) {
          for (const c of n.children) {
            if (c.type === 'COMPONENT') result.push({ id: c.id, name: c.name })
          }
        }
        if (n.children) for (const c of n.children) walk(c)
      }
      walk(node)
      return result
    }

    function collectIconNodes(nodes: FigmaNode[], target: Map<string, string>) {
      for (const node of nodes) {
        if (node.type === 'COMPONENT') {
          target.set(node.id, node.name)
        } else if (node.type === 'COMPONENT_SET' && node.children) {
          for (const child of node.children) {
            if (child.type === 'COMPONENT') target.set(child.id, child.name)
          }
        } else if ((node.type === 'FRAME' || node.type === 'GROUP') && node.children) {
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

    function findPageByName(nodes: FigmaNode[], pageName: string): FigmaNode | null {
      for (const node of nodes) {
        if (node.type === 'CANVAS' && node.name === pageName) return node
      }
      return null
    }

    // 2. Build packs to create
    const packsToCreate: Array<{
      frameName: string
      frameId: string
      pageName: string
      nodeIds: string[]
      nodeNames: Map<string, string>
      packCategory: string
      packStyle: string
    }> = []

    const canvasPages = document.children || []

    if (legacyMode) {
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
          packStyle: style || 'outline',
        })
      }
    } else {
      for (const fc of frameConfig) {
        if (!fc.enabled) continue

        const nodeMap = new Map<string, string>()

        // Parse special frame ID patterns
        const prefixMatch = fc.id.match(/^(.+)__prefix__(.+)$/)
        const catMatch = fc.id.match(/^(.+)__cat__(.+)$/)
        const looseMatch = fc.id.match(/^(.+)__loose$/)

        if (prefixMatch) {
          // Group by name prefix: collect components matching "Prefix / ..."
          const [, pageId, prefixKey] = prefixMatch
          console.log(`[figma-import] Prefix group: collecting "${prefixKey}" components from page ${pageId}`)

          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            if (page.id !== pageId && page.name !== fc.pageName) continue

            const allComps = collectAllComponents(page)
            for (const comp of allComps) {
              const parts = comp.name.split(' / ')
              if (prefixKey === 'other') {
                // No prefix (no " / " separator)
                if (parts.length < 2) {
                  nodeMap.set(comp.id, comp.name)
                }
              } else {
                // Match prefix
                const compPrefix = parts[0].trim().toLowerCase().replace(/\s+/g, '-')
                if (compPrefix === prefixKey) {
                  nodeMap.set(comp.id, comp.name)
                }
              }
            }
          }
        } else if (fc.id === '__page__') {
          // Loose icons on the page level
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
        } else if (catMatch) {
          // Auto-split by keyword category
          const [, realFrameId, targetCategory] = catMatch
          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            const frameNode = findFrameNode(page.children, realFrameId)
            if (frameNode) {
              const allComps = collectAllComponents(frameNode)
              for (const comp of allComps) {
                const { category } = suggestCategoryByName(comp.name)
                if (category === targetCategory) {
                  nodeMap.set(comp.id, comp.name)
                }
              }
            }
          }
        } else if (looseMatch) {
          const [, realFrameId] = looseMatch
          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            const frameNode = findFrameNode(page.children, realFrameId)
            if (frameNode && frameNode.children) {
              for (const child of frameNode.children) {
                if (child.type === 'COMPONENT') {
                  nodeMap.set(child.id, child.name)
                } else if (child.type === 'COMPONENT_SET' && child.children) {
                  for (const c of child.children) {
                    if (c.type === 'COMPONENT') nodeMap.set(c.id, c.name)
                  }
                }
              }
            }
          }
        } else {
          // Regular frame/group: collect all icons within it
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
            packStyle: fc.style || style || 'outline',
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
            descRu: `Импортировано из Figma: ${fileName}, категория "${pack.frameName}" (категория: ${catLabel}, стиль: ${pack.packStyle})`,
            descEn: `Imported from Figma: ${fileName}, category "${pack.frameName}" (category: ${catLabel}, style: ${pack.packStyle})`,
            category: pack.packCategory,
            style: pack.packStyle,
            tags: icons.slice(0, 20).map(i => i.slug.split('-').pop()).join(','),
            isFree: true,
            priceCredits: 10,
            icons: { create: icons },
          },
          include: { _count: { select: { icons: true } } },
        })

        totalPacksCreated++
        totalIconsCreated += created._count.icons
        results.push(`✓ "${finalSlug}" (${pack.frameName}) [${catLabel}, ${pack.packStyle}] — ${created._count.icons} icons`)
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
