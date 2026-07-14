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

/**
 * GET /api/admin/figma-import?figmaToken=...&fileKey=...
 *
 * Preview the structure of a Figma file before importing.
 * Returns: pages with frames (each frame/group = potential pack) and suggested categories/styles.
 *
 * Smart detection:
 * - GROUPs and FRAMEs with icons → separate packs
 * - Style auto-detected from frame/group name AND component names
 * - Category auto-detected from names + component names
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

    // ── Style auto-detection from name ──
    function suggestStyle(name: string): string {
      const lower = name.toLowerCase().trim()
      if (/duotone|two.?tone|twotone|dual|2.?tone/.test(lower)) return 'duotone'
      if (/bold|filled|solid|fill|heavy|thick/.test(lower)) return 'filled'
      // Default to outline for regular, thin, light, line, outline, stroke, etc.
      return 'outline'
    }

    /**
     * Detect style by analyzing child component names.
     * Looks for style keywords in component naming patterns:
     *   "arrow-left/outline", "Outline/Arrow-Left", "arrow-left-outline",
     *   "Arrow Left (Outline)", "24/outline/arrow-left", etc.
     */
    function suggestStyleFromChildren(node: FigmaNode, fallback: string = 'outline'): string {
      const names = collectAllComponentNames(node)
      if (names.length === 0) return fallback

      const styleScores: Record<string, number> = { outline: 0, filled: 0, duotone: 0 }

      for (const name of names) {
        const lower = name.toLowerCase()
        // Check for style keywords in the component name or path
        if (/duotone|two.?tone|twotone|dual|2.?tone/.test(lower)) {
          styleScores.duotone += 2
        } else if (/\bfilled\b|\bsolid\b|\bbold\b|\bfill\b|\bheavy\b|\bthick\b/.test(lower)) {
          styleScores.filled += 2
        } else if (/\boutline\b|\boutlined\b|\bline\b|\blined\b|\bstroke\b|\bregular\b|\bthin\b|\blight\b/.test(lower)) {
          styleScores.outline += 2
        }
        // Check path segments like "24/Outline/arrow-left" or "Outline/Arrow-Left"
        const segments = lower.split(/[/\\_-\s]+/)
        for (const seg of segments) {
          if (seg === 'outline' || seg === 'outlined' || seg === 'line' || seg === 'stroke' || seg === 'regular' || seg === 'thin' || seg === 'light') {
            styleScores.outline += 1
          } else if (seg === 'filled' || seg === 'solid' || seg === 'bold' || seg === 'fill' || seg === 'heavy' || seg === 'thick') {
            styleScores.filled += 1
          } else if (seg === 'duotone' || seg === 'twotone' || seg === 'dual') {
            styleScores.duotone += 1
          }
        }
      }

      // Find the dominant style
      let bestStyle = fallback
      let bestScore = 0
      for (const [style, score] of Object.entries(styleScores)) {
        if (score > bestScore) {
          bestScore = score
          bestStyle = style
        }
      }

      // Only override fallback if we have a clear signal
      return bestScore >= 2 ? bestStyle : fallback
    }

    // ── Keyword matching for category suggestions ──
    const categoryKeywords: Record<string, string[]> = {
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

    /**
     * Suggest a category based on a name string.
     * Returns uncategorized when no strong match.
     */
    function suggestCategory(name: string): { category: string; confidence: number } {
      const lower = name.toLowerCase()

      let bestCategory = 'uncategorized'
      let bestScore = 0

      for (const [catSlug, keywords] of Object.entries(categoryKeywords)) {
        let score = 0
        for (const kw of keywords) {
          if (lower.includes(kw)) {
            // Exact word match or name starts with keyword → stronger signal
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
     * Suggest category by analyzing child component names (not just frame name).
     * Takes the mode (most common suggestion) across all children.
     */
    function suggestCategoryFromChildren(node: FigmaNode): string {
      const childNames: string[] = []

      function collectNames(n: FigmaNode) {
        if (n.type === 'COMPONENT') {
          childNames.push(n.name)
        } else if (n.type === 'COMPONENT_SET' && n.children) {
          for (const c of n.children) {
            if (c.type === 'COMPONENT') childNames.push(c.name)
          }
        } else if (n.children) {
          for (const c of n.children) collectNames(c)
        }
      }

      if (node.children) {
        for (const c of node.children) collectNames(c)
      }

      if (childNames.length === 0) return 'uncategorized'

      // Score across all child names
      const scores: Record<string, number> = {}
      for (const name of childNames) {
        const { category, confidence } = suggestCategory(name)
        if (category !== 'uncategorized') {
          scores[category] = (scores[category] || 0) + confidence
        }
      }

      let bestCategory = 'uncategorized'
      let bestScore = 0
      for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) {
          bestScore = score
          bestCategory = cat
        }
      }

      // Need at least 2 matching children to override uncategorized
      if (bestScore < 2) return 'uncategorized'

      return bestCategory
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

    /**
     * Count ALL icons recursively within a node (including deep children).
     */
    function countAllIconsInNode(node: FigmaNode): number {
      let count = 0
      function walk(n: FigmaNode) {
        if (n.type === 'COMPONENT') count++
        else if (n.type === 'COMPONENT_SET' && n.children) {
          count += n.children.filter(c => c.type === 'COMPONENT').length
        }
        if (n.children) for (const c of n.children) walk(c)
      }
      walk(node)
      return count
    }

    /**
     * Count how many direct child FRAMEs AND GROUPs contain icons.
     * Both FRAME and GROUP children are treated as potential pack containers.
     */
    function countChildContainersWithIcons(node: FigmaNode): number {
      if (!node.children) return 0
      let count = 0
      for (const child of node.children) {
        if ((child.type === 'FRAME' || child.type === 'GROUP') && child.children) {
          if (countAllIconsInNode(child) > 0) {
            count++
          }
        }
      }
      return count
    }

    /**
     * Count how many direct child FRAMEs of this node contain icons.
     * Used to detect "style group" frames (Regular/Thin/Bold) that wrap
     * category sub-frames (Arrows/Brands/System).
     */
    function countSubFramesWithIcons(node: FigmaNode): number {
      if (!node.children) return 0
      let count = 0
      for (const child of node.children) {
        if (child.type === 'FRAME' && child.children) {
          if (countIconsInNodes(child.children) > 0) {
            count++
          }
        }
      }
      return count
    }

    /**
     * Recursively collect ALL component names inside a node.
     * Used for category/style suggestion.
     */
    function collectAllComponentNames(node: FigmaNode): string[] {
      const names: string[] = []
      function walk(n: FigmaNode) {
        if (n.type === 'COMPONENT') names.push(n.name)
        else if (n.type === 'COMPONENT_SET' && n.children) {
          for (const c of n.children) if (c.type === 'COMPONENT') names.push(c.name)
        }
        if (n.children) for (const c of n.children) walk(c)
      }
      walk(node)
      return names
    }

    /**
     * Collect direct child components only (not recursive).
     * Used for counting "loose" icons at a level.
     */
    function collectDirectIcons(nodes: FigmaNode[]): Array<{ id: string; name: string }> {
      const icons: Array<{ id: string; name: string }> = []
      for (const node of nodes) {
        if (node.type === 'COMPONENT') {
          icons.push({ id: node.id, name: node.name })
        } else if (node.type === 'COMPONENT_SET' && node.children) {
          for (const child of node.children) {
            if (child.type === 'COMPONENT') icons.push({ id: child.id, name: child.name })
          }
        }
      }
      return icons
    }

    /**
     * When a frame has flat icons (no sub-containers), try to auto-split
     * them into multiple packs by detected category from component names.
     * Returns one FrameInfo per detected category group.
     */
    function trySplitByCategory(node: FigmaNode, effectiveStyle: string): FrameInfo[] {
      const allIcons = collectAllComponentNames(node)
      if (allIcons.length < 5) {
        // Too few icons to split — keep as single pack
        return []
      }

      // Group each icon name into a category
      const catGroups: Record<string, string[]> = {}
      for (const name of allIcons) {
        const { category } = suggestCategory(name)
        if (!catGroups[category]) catGroups[category] = []
        catGroups[category].push(name)
      }

      // Only split if there are 2+ non-uncategorized groups with enough icons
      const significantGroups = Object.entries(catGroups)
        .filter(([cat, names]) => cat !== 'uncategorized' && names.length >= 2)

      if (significantGroups.length < 2) return [] // Not enough diversity to split

      const frames: FrameInfo[] = []
      for (const [cat, names] of significantGroups) {
        frames.push({
          id: `${node.id}__cat__${cat}`,
          name: `${node.name} / ${cat}`,
          iconCount: names.length,
          suggestedCategory: cat,
          suggestedStyle: effectiveStyle,
        })
      }

      // Add uncategorized leftovers
      if (catGroups['uncategorized'] && catGroups['uncategorized'].length >= 2) {
        frames.push({
          id: `${node.id}__cat__uncategorized`,
          name: `${node.name} / other`,
          iconCount: catGroups['uncategorized'].length,
          suggestedCategory: 'uncategorized',
          suggestedStyle: effectiveStyle,
        })
      }

      return frames
    }

    /**
     * Walk a page to find frames/groups that should become packs.
     *
     * Strategy:
     * 1. If a FRAME/GROUP contains 2+ child FRAMEs/GROUPs with icons → each child = separate pack
     * 2. If a FRAME contains sub-FRAMEs with icons (style groups like Regular/Thin/Bold) → recurse
     * 3. If a FRAME/GROUP directly contains flat icons → single pack or auto-split by category
     * 4. If nothing found → recurse deeper
     */
    function findIconFrames(nodes: FigmaNode[], parentStyle?: string): FrameInfo[] {
      const frames: FrameInfo[] = []

      for (const node of nodes) {
        if (node.type === 'FRAME' && node.children) {
          const directIcons = countIconsInNodes(node.children)
          const childContainersWithIcons = countChildContainersWithIcons(node)
          const subFramesWithIcons = countSubFramesWithIcons(node)
          const frameStyle = suggestStyle(node.name)
          // If parent already detected a style (e.g. from page name), prefer it unless
          // this frame has a clear style keyword
          const effectiveStyle = (frameStyle !== 'outline' || !parentStyle) ? frameStyle : parentStyle

          if (childContainersWithIcons >= 2) {
            // This frame has 2+ child FRAMEs/GROUPs that each contain icons.
            // Each child container = a separate pack.
            console.log(`[findIconFrames] Frame "${node.name}" has ${childContainersWithIcons} child containers with icons → splitting`)

            for (const child of node.children) {
              if ((child.type === 'FRAME' || child.type === 'GROUP') && child.children) {
                const childIconCount = countAllIconsInNode(child)
                if (childIconCount === 0) continue

                const childStyleFromName = suggestStyle(child.name)
                const childStyleFromChildren = suggestStyleFromChildren(child, effectiveStyle)
                // Name-based detection wins if it found a non-outline style
                const childStyle = childStyleFromName !== 'outline' ? childStyleFromName : childStyleFromChildren

                const catSuggestion = suggestCategory(child.name)
                const category = catSuggestion.confidence > 0 ? catSuggestion.category : suggestCategoryFromChildren(child)

                frames.push({
                  id: child.id,
                  name: child.name,
                  iconCount: childIconCount,
                  suggestedCategory: category,
                  suggestedStyle: childStyle,
                })
              }
            }

            // Also check for loose components at this level (not inside any GROUP/FRAME)
            if (directIcons > 0) {
              const catSuggestion = suggestCategory(node.name)
              const category = catSuggestion.confidence > 0 ? catSuggestion.category : suggestCategoryFromChildren(node)
              const styleFromChildren = suggestStyleFromChildren(node, effectiveStyle)
              frames.push({
                id: node.id + '__loose',
                name: node.name + ' (other)',
                iconCount: directIcons,
                suggestedCategory: category,
                suggestedStyle: styleFromChildren,
              })
            }
          } else if (subFramesWithIcons >= 2 && childContainersWithIcons < 2) {
            // Has sub-FRAMEs but they don't have direct icons —
            // this is a "style group" (e.g. "Regular", "Thin", "Bold") wrapping deeper category frames
            const deeper = findIconFrames(node.children, effectiveStyle)
            frames.push(...deeper)

            if (directIcons > 0) {
              const catSuggestion = suggestCategory(node.name)
              const category = catSuggestion.confidence > 0 ? catSuggestion.category : suggestCategoryFromChildren(node)
              const styleFromChildren = suggestStyleFromChildren(node, effectiveStyle)
              frames.push({
                id: node.id + '__loose',
                name: node.name + ' (other)',
                iconCount: directIcons,
                suggestedCategory: category,
                suggestedStyle: styleFromChildren,
              })
            }
          } else if (directIcons > 0) {
            // This frame directly contains components and no significant sub-containers.
            // First try auto-split by category from component names
            const splits = trySplitByCategory(node, effectiveStyle)
            if (splits.length >= 2) {
              // We found multiple category groups → split into multiple packs
              console.log(`[findIconFrames] Frame "${node.name}" auto-split into ${splits.length} category packs`)
              frames.push(...splits)
            } else {
              // Single pack
              const catSuggestion = suggestCategory(node.name)
              const category = catSuggestion.confidence > 0 ? catSuggestion.category : suggestCategoryFromChildren(node)
              const styleFromChildren = suggestStyleFromChildren(node, effectiveStyle)
              frames.push({
                id: node.id,
                name: node.name,
                iconCount: directIcons,
                suggestedCategory: category,
                suggestedStyle: styleFromChildren,
              })
            }
          } else {
            // No direct icons and no child containers with icons → recurse deeper
            const deeper = findIconFrames(node.children, effectiveStyle)
            frames.push(...deeper)
          }
        } else if (node.type === 'GROUP' && node.children) {
          // GROUP at the top level (directly on a page) — treat as a pack candidate
          const groupIconCount = countAllIconsInNode(node)
          if (groupIconCount > 0) {
            const groupStyleFromName = suggestStyle(node.name)
            const groupStyleFromChildren = suggestStyleFromChildren(node, parentStyle || 'outline')
            const groupStyle = groupStyleFromName !== 'outline' ? groupStyleFromName : groupStyleFromChildren

            // Check if this GROUP has sub-containers with icons
            const subContainers = countChildContainersWithIcons(node)
            if (subContainers >= 2) {
              // GROUP contains multiple sub-containers → split them
              for (const child of node.children) {
                if ((child.type === 'FRAME' || child.type === 'GROUP') && child.children) {
                  const childIconCount = countAllIconsInNode(child)
                  if (childIconCount === 0) continue

                  const childStyleFromName = suggestStyle(child.name)
                  const childStyleFromChildren = suggestStyleFromChildren(child, groupStyle)
                  const childStyle = childStyleFromName !== 'outline' ? childStyleFromName : childStyleFromChildren

                  const catSuggestion = suggestCategory(child.name)
                  const category = catSuggestion.confidence > 0 ? catSuggestion.category : suggestCategoryFromChildren(child)

                  frames.push({
                    id: child.id,
                    name: child.name,
                    iconCount: childIconCount,
                    suggestedCategory: category,
                    suggestedStyle: childStyle,
                  })
                }
              }
            } else {
              // GROUP is a single pack
              const catSuggestion = suggestCategory(node.name)
              const category = catSuggestion.confidence > 0 ? catSuggestion.category : suggestCategoryFromChildren(node)

              // Try auto-split by category
              const splits = trySplitByCategory(node, groupStyle)
              if (splits.length >= 2) {
                frames.push(...splits)
              } else {
                frames.push({
                  id: node.id,
                  name: node.name,
                  iconCount: groupIconCount,
                  suggestedCategory: category,
                  suggestedStyle: groupStyle,
                })
              }
            }
          } else {
            // Empty GROUP → recurse deeper
            const deeper = findIconFrames(node.children, parentStyle)
            frames.push(...deeper)
          }
        } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          // Icons directly on the page (not inside a frame/group)
          const existing = frames.find(f => f.id === '__page__')
          if (node.type === 'COMPONENT_SET' && node.children) {
            const count = node.children.filter(c => c.type === 'COMPONENT').length
            if (existing) existing.iconCount += count
            else frames.push({ id: '__page__', name: 'Page Icons', iconCount: count, suggestedCategory: 'uncategorized', suggestedStyle: parentStyle || 'outline' })
          } else {
            if (existing) existing.iconCount += 1
            else frames.push({ id: '__page__', name: 'Page Icons', iconCount: 1, suggestedCategory: 'uncategorized', suggestedStyle: parentStyle || 'outline' })
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

      const pageStyle = suggestStyle(page.name)
      const frameDetails = findIconFrames(page.children, pageStyle)
      if (frameDetails.length === 0) continue

      const totalIcons = frameDetails.reduce((s, f) => s + f.iconCount, 0)
      const pageSuggestion = suggestCategory(page.name)

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
 * Special frame IDs:
 *   - "frameId__cat__categorySlug" → auto-split by category: only import icons matching this category
 *   - "frameId__loose" → only import loose components (not inside sub-containers)
 *   - "__page__" → loose icons on the page level
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

    // ── Category keywords (same as in GET handler) ──
    const categoryKeywords: Record<string, string[]> = {
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

    function suggestCategoryForName(name: string): { category: string; confidence: number } {
      const lower = name.toLowerCase()
      let bestCategory = 'uncategorized'
      let bestScore = 0
      for (const [catSlug, keywords] of Object.entries(categoryKeywords)) {
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

    // 2. Walk the document tree to find icons per frame
    const packsToCreate: Array<{
      frameName: string
      frameId: string
      pageName: string
      nodeIds: string[]
      nodeNames: Map<string, string>
      packCategory: string
      packStyle: string
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
        } else if ((node.type === 'FRAME' || node.type === 'GROUP') && node.children) {
          collectIconNodes(node.children, target)
        }
      }
    }

    /**
     * Collect only icons whose names match the given category.
     * Used for auto-split frame IDs (frameId__cat__categorySlug).
     */
    function collectIconNodesByCategory(nodes: FigmaNode[], targetCategory: string, target: Map<string, string>) {
      for (const node of nodes) {
        if (node.type === 'COMPONENT') {
          const { category } = suggestCategoryForName(node.name)
          if (category === targetCategory) {
            target.set(node.id, node.name)
          }
        } else if (node.type === 'COMPONENT_SET' && node.children) {
          for (const child of node.children) {
            if (child.type === 'COMPONENT') {
              const { category } = suggestCategoryForName(child.name)
              if (category === targetCategory) {
                target.set(child.id, child.name)
              }
            }
          }
        } else if ((node.type === 'FRAME' || node.type === 'GROUP') && node.children) {
          collectIconNodesByCategory(node.children, targetCategory, target)
        }
      }
    }

    /**
     * Collect only DIRECT child components (not inside sub-FRAMEs/GROUPs).
     * Used for "loose" frame IDs (frameId__loose).
     */
    function collectDirectIconNodes(nodes: FigmaNode[], target: Map<string, string>) {
      for (const node of nodes) {
        if (node.type === 'COMPONENT') {
          target.set(node.id, node.name)
        } else if (node.type === 'COMPONENT_SET' && node.children) {
          for (const child of node.children) {
            if (child.type === 'COMPONENT') target.set(child.id, child.name)
          }
        }
        // Don't recurse into FRAME/GROUP — only direct children
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
          packStyle: style || 'outline',
        })
      }
    } else {
      // Per-frame mode: find icons in each specific frame
      for (const fc of frameConfig) {
        if (!fc.enabled) continue

        const nodeMap = new Map<string, string>()

        // Parse special frame ID patterns
        const catMatch = fc.id.match(/^(.+)__cat__(.+)$/)
        const looseMatch = fc.id.match(/^(.+)__loose$/)

        if (fc.id === '__page__') {
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
          // Auto-split by category: collect only icons matching the target category
          const [, realFrameId, targetCategory] = catMatch
          console.log(`[figma-import] Auto-split frame: collecting "${targetCategory}" icons from frame ${realFrameId}`)

          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            const frameNode = findFrameNode(page.children, realFrameId)
            if (frameNode && frameNode.children) {
              collectIconNodesByCategory(frameNode.children, targetCategory, nodeMap)
            }
          }
        } else if (looseMatch) {
          // Only direct children of the frame (not inside sub-containers)
          const [, realFrameId] = looseMatch
          console.log(`[figma-import] Collecting loose icons from frame ${realFrameId}`)

          for (const page of canvasPages) {
            if (page.type !== 'CANVAS' || !page.children) continue
            const frameNode = findFrameNode(page.children, realFrameId)
            if (frameNode && frameNode.children) {
              collectDirectIconNodes(frameNode.children, nodeMap)
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
            descRu: `Импортировано из Figma: ${fileName}, фрейм "${pack.frameName}" (категория: ${catLabel}, стиль: ${pack.packStyle})`,
            descEn: `Imported from Figma: ${fileName}, frame "${pack.frameName}" (category: ${catLabel}, style: ${pack.packStyle})`,
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
