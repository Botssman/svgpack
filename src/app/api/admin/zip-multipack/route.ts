import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import JSZip from 'jszip'

// ── Category keyword matching (shared with figma-import) ──
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

const CATEGORY_OVERRIDES: Record<string, string> = {
  'arrow': 'arrows', 'arrows': 'arrows',
  'brand': 'brands', 'brands': 'brands', 'logo': 'brands', 'social': 'brands',
  'building': 'buildings', 'buildings': 'buildings',
  'communication': 'communication', 'chat': 'communication', 'message': 'communication',
  'concept': 'concepts', 'concepts': 'concepts',
  'design': 'design',
  'device': 'devices', 'devices': 'devices',
  'document': 'document', 'documents': 'document', 'file': 'document', 'files': 'document',
  'ecommerce': 'ecommerce', 'shop': 'ecommerce', 'shopping': 'ecommerce', 'store': 'ecommerce',
  'education': 'education',
  'food': 'food', 'drink': 'food',
  'framework': 'frameworks', 'frameworks': 'frameworks',
  'game': 'games', 'games': 'games',
  'health': 'health', 'medical': 'health',
  'language': 'languages', 'languages': 'languages', 'programming': 'languages',
  'letter': 'letters', 'letters': 'letters', 'alphabet': 'letters',
  'map': 'map', 'maps': 'map', 'location': 'map',
  'media': 'media', 'music': 'media', 'video': 'media',
  'mood': 'mood', 'emoji': 'mood',
  'nature': 'nature', 'weather': 'nature', 'animal': 'nature',
  'science': 'science', 'chart': 'science',
  'shape': 'shapes', 'shapes': 'shapes',
  'sport': 'sport', 'sports': 'sport',
  'system': 'system', 'interface': 'system', 'ui': 'system',
  'tool': 'tools', 'tools': 'tools', 'dev': 'tools', 'developer': 'tools',
  'vehicle': 'vehicles', 'vehicles': 'vehicles', 'transport': 'vehicles',
  'security': 'system', 'time': 'system', 'user': 'system',
  'people': 'communication', 'person': 'communication',
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

function prefixToCategory(prefix: string): string {
  const direct = suggestCategoryByName(prefix)
  if (direct.confidence >= 3) return direct.category
  const lower = prefix.toLowerCase().trim()
  if (CATEGORY_OVERRIDES[lower]) return CATEGORY_OVERRIDES[lower]
  if (direct.confidence > 0) return direct.category
  return 'uncategorized'
}

function suggestStyle(name: string): string {
  const lower = name.toLowerCase().trim()
  if (/duotone|two.?tone|twotone|dual|color/.test(lower)) return 'duotone'
  if (/cute|kawaii/.test(lower)) return 'cute'
  if (/fill|filled/.test(lower)) return 'filled'
  if (/bold|solid|heavy|thick/.test(lower)) return 'filled'
  if (/thin|light/.test(lower)) return 'thin'
  if (/regular|outline|line|stroke|straight/.test(lower)) return 'outline'
  if (/rounded|round/.test(lower)) return 'outline'
  return 'outline'
}

// ── EN-RU translation ──
const EN_RU: Record<string, string> = {
  icon: 'иконка', button: 'кнопка', menu: 'меню', tab: 'вкладка', arrow: 'стрелка',
  left: 'лево', right: 'право', up: 'верх', down: 'низ', back: 'назад', forward: 'вперёд',
  chevron: 'шеврон', add: 'добавить', remove: 'удалить', delete: 'удалить', edit: 'редактировать',
  save: 'сохранить', cancel: 'отмена', close: 'закрыть', open: 'открыть', search: 'поиск',
  filter: 'фильтр', sort: 'сортировка', refresh: 'обновить', user: 'пользователь',
  mail: 'почта', email: 'почта', message: 'сообщение', chat: 'чат', phone: 'телефон',
  call: 'звонок', video: 'видео', camera: 'камера', bell: 'колокольчик',
  notification: 'уведомление', home: 'дом', house: 'дом', building: 'здание',
  store: 'магазин', shop: 'магазин', cart: 'корзина', key: 'ключ', lock: 'замок',
  shield: 'щит', clock: 'часы', time: 'время', calendar: 'календарь',
  book: 'книга', document: 'документ', file: 'файл', folder: 'папка',
  pen: 'ручка', pencil: 'карандаш', computer: 'компьютер', laptop: 'ноутбук',
  monitor: 'монитор', screen: 'экран', keyboard: 'клавиатура', mouse: 'мышь',
  tablet: 'планшет', smartphone: 'смартфон', server: 'сервер', database: 'база данных',
  cloud: 'облако', check: 'галочка', checkmark: 'галочка', success: 'успех',
  error: 'ошибка', warning: 'предупреждение', info: 'информация', help: 'помощь',
  circle: 'круг', square: 'квадрат', triangle: 'треугольник', star: 'звезда',
  heart: 'сердце', cross: 'крест', plus: 'плюс', minus: 'минус',
  sun: 'солнце', moon: 'луна', fire: 'огонь', water: 'вода', leaf: 'лист',
  tree: 'дерево', flower: 'цветок', mountain: 'гора', globe: 'глобус',
  map: 'карта', compass: 'компас', location: 'местоположение', pin: 'булавка',
  car: 'машина', bus: 'автобус', train: 'поезд', plane: 'самолёт',
  bike: 'велосипед', ship: 'корабрь', rocket: 'ракета', truck: 'грузовик',
  food: 'еда', drink: 'напиток', coffee: 'кофе', settings: 'настройки',
  password: 'пароль', login: 'вход', logout: 'выход', profile: 'профиль',
  image: 'изображение', photo: 'фото', music: 'музыка', like: 'нравится',
  eye: 'глаз', show: 'показать', hide: 'скрыть', view: 'просмотр',
  code: 'код', terminal: 'терминал', bug: 'баг',
}

function translateToRu(words: string[]): string {
  return words.map(word => EN_RU[word.toLowerCase()] || word).join(' ')
}

type MetaValue = string | { nameRu?: string; nameEn?: string; keywords?: string }
type MetaMap = Record<string, MetaValue>

// ═══════════════════════════════════════════════════════════
// Sprite Sheet Parser (Flaticon / Uicons format)
// ═══════════════════════════════════════════════════════════
// Flaticon exports: one huge SVG with all icons in a grid.
// Each icon is in <g clip-path="url(#clipN)">, bounding boxes
// defined by <clipPath><rect transform="translate(x,y)" w h/> in <defs>.

interface SpriteIcon {
  slug: string
  nameRu: string
  nameEn: string
  keywords: string
  svg: string
  viewBox: string
  folder: string
  prefix: string
}

function parseSpriteSheet(svgContent: string, fileName: string): SpriteIcon[] | null {
  // Quick check: does this SVG have multiple <g clip-path="url(#...)" elements?
  const clipGroupMatches = svgContent.match(/<g[^>]+clip-path\s*=\s*["']url\(#/g)
  if (!clipGroupMatches || clipGroupMatches.length < 3) return null

  // Extract the sprite sheet name (filename without extension)
  const sheetName = fileName.replace(/\.svg$/i, '').trim()

  // Parse clipPath definitions from <defs>
  const clipMap = new Map<string, { x: number; y: number; w: number; h: number }>()
  const defsMatch = svgContent.match(/<defs[^>]*>([\s\S]*?)<\/defs>/i)
  if (!defsMatch) return null

  const defsContent = defsMatch[1]
  const cpRegex = /<clipPath[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/clipPath>/gi
  let cpMatch: RegExpExecArray | null
  while ((cpMatch = cpRegex.exec(defsContent)) !== null) {
    const cpId = cpMatch[1]
    const cpContent = cpMatch[2]
    const rectMatches = [...cpContent.matchAll(/<rect([^>]+)\/?>/gi)]
    if (rectMatches.length === 0) continue
    const lastRect = rectMatches[rectMatches.length - 1][1]

    const wMatch = lastRect.match(/\bwidth\s*=\s*["']([\d.]+)["']/)
    const hMatch = lastRect.match(/\bheight\s*=\s*["']([\d.]+)["']/)
    if (!wMatch || !hMatch) continue

    const tMatch = lastRect.match(/transform\s*=\s*["']translate\(([\d.]+)[,\s]+([\d.]+)\)["']/i)
    const tx = tMatch ? parseFloat(tMatch[1]) : 0
    const ty = tMatch ? parseFloat(tMatch[2]) : 0

    clipMap.set(cpId, { x: tx, y: ty, w: parseFloat(wMatch[1]), h: parseFloat(hMatch[1]) })
  }

  if (clipMap.size < 3) return null

  // Extract each icon group — use balanced-tag parsing since <g> can be nested
  const icons: SpriteIcon[] = []
  const gOpenRegex = /<g[^>]*clip-path\s*=\s*["']url\(#([^"']+)\)["'][^>]*>/gi
  let gOpenMatch: RegExpExecArray | null
  let iconIndex = 0

  while ((gOpenMatch = gOpenRegex.exec(svgContent)) !== null) {
    const clipId = gOpenMatch[1]
    const bbox = clipMap.get(clipId)
    if (!bbox) continue

    // Skip non-icon elements (e.g. text banners with unusual sizes like 107x15)
    if (bbox.w < 16 || bbox.h < 16) continue

    // Extract the content between this <g> and its matching </g>
    // by counting nested <g>/<g> pairs
    const afterOpen = svgContent.substring(gOpenMatch.index + gOpenMatch[0].length)
    let depth = 1
    let endIdx = 0
    const tagRegex = /<\/?g[\s>]/gi
    let tagMatch: RegExpExecArray | null
    while ((tagMatch = tagRegex.exec(afterOpen)) !== null) {
      if (tagMatch[0].startsWith('</g')) {
        depth--
        if (depth === 0) {
          endIdx = tagMatch.index
          break
        }
      } else {
        depth++
      }
    }

    if (endIdx === 0) continue // unbalanced, skip

    const innerContent = afterOpen.substring(0, endIdx).trim()
    if (!innerContent) continue

    // Translate the icon to local coordinates (0,0 origin)
    const translateX = -bbox.x
    const translateY = -bbox.y
    const localSvg = `<g transform="translate(${translateX}, ${translateY})">${innerContent}</g>`

    // Generate a slug from the sheet name + index
    const sheetSlug = sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${sheetSlug}-${iconIndex + 1}`
    const nameEn = `${sheetName} ${iconIndex + 1}`
    const nameRu = `${sheetName} ${iconIndex + 1}`

    // Normalize viewBox to "0 0 W H"
    const vbW = Math.round(bbox.w)
    const vbH = Math.round(bbox.h)
    const viewBox = `0 0 ${vbW} ${vbH}`

    icons.push({
      slug,
      nameRu,
      nameEn,
      keywords: sheetName.toLowerCase(),
      svg: localSvg,
      viewBox,
      folder: sheetName,
      prefix: sheetName,
    })

    iconIndex++
  }

  console.log(`[sprite-sheet] Extracted ${icons.length} icons from "${sheetName}"`)
  return icons.length > 0 ? icons : null
}

// ── Parse a single SVG file (one icon per file) ──
function parseSvgIcon(
  svgContent: string,
  rawName: string,
  slugOverride?: string,
): { slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string } | null {
  // Extract viewBox
  let viewBox = '0 0 24 24'
  const vbMatch = svgContent.match(/viewBox\s*=\s*["']([^"']+)["']/)
  if (vbMatch) {
    viewBox = vbMatch[1]
  } else {
    const wMatch = svgContent.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
    const hMatch = svgContent.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
    if (wMatch && hMatch) viewBox = `0 0 ${wMatch[1]} ${hMatch[1]}`
  }

  // Extract inner SVG
  let innerSvg = svgContent
  const innerMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (innerMatch) innerSvg = innerMatch[1].trim()
  else innerSvg = svgContent.trim()

  // NOTE: The old auto-detect viewBox logic was broken — it extracted numbers
  // from clip-path IDs (e.g. clip0_1_27641 → 27641) and inflated viewBox to
  // absurd values like "0 0 292930 292930". Removed entirely.
  // We trust the viewBox attribute from the SVG, or width/height, or default 0 0 24 24.

  // Parse filename
  let slugPart = rawName
  let ruFromFilename: string | undefined
  if (rawName.includes('--')) {
    const parts = rawName.split('--')
    slugPart = parts[0]
    ruFromFilename = parts.slice(1).join('--').trim()
  }

  // Strip Figma export size suffixes like "192x192", "24x24", "1.5x" etc.
  slugPart = slugPart.replace(/\s*\d+(\.\d+)?x\d+(\.\d+)?$/i, '').trim()

  // Check <title> tag
  let ruFromTitle: string | undefined
  const titleMatch = svgContent.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    const titleText = titleMatch[1].trim()
    if (/[а-яёА-ЯЁ]/.test(titleText)) ruFromTitle = titleText
  }

  // Remove <title> and <desc> from inner SVG
  innerSvg = innerSvg
    .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<desc[^>]*>[\s\S]*?<\/desc>\s*/gi, '')
    .trim()

  const slug = (slugOverride || slugPart)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!slug) return null

  const words = slugPart.split(/[-_\s]+/).filter(w => w.length > 0)
  const nameEn = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

  const nameRu = ruFromFilename || ruFromTitle || translateToRu(
    words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  )

  const enKw = words.map(w => w.toLowerCase()).filter(w => w.length > 1)
  const ruKw = words.map(w => EN_RU[w.toLowerCase()]).filter((w): w is string => !!w && w.length > 1)
  const keywords = [...new Set([...enKw, ...ruKw])].join(', ')

  return { slug, nameRu, nameEn, keywords, svg: innerSvg, viewBox }
}

// ── Ensure unique slug ──
async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base
  let suffix = 2
  while (await db.pack.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`
    suffix++
  }
  return candidate
}

/**
 * POST /api/admin/zip-multipack
 *
 * Step 1 (parse): Upload ZIP -> parse SVGs, group by folder/prefix, return preview
 *   Content-Type: multipart/form-data, field "file" = .zip
 *
 * Step 2 (import): Create packs from selected groups
 *   Content-Type: application/json
 *   Body: { groups: [{ name, category, style, enabled, icons }] }
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  // ── Step 1: Parse ZIP ──
  if (contentType.includes('multipart/form-data')) {
    return await handleZipUpload(req)
  }

  // ── Step 2: Create packs ──
  return await handleCreatePacks(req)
}

async function handleZipUpload(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip files are supported' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    // Collect SVG files
    const svgFiles: { path: string; zipEntry: JSZip.JSZipObject }[] = []
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.svg')) {
        svgFiles.push({ path: relativePath, zipEntry })
      }
    })
    svgFiles.sort((a, b) => a.path.localeCompare(b.path))

    console.log(`[zip-multipack] Found ${svgFiles.length} SVG files`)

    // Parse all SVGs and group them
    interface ParsedIcon {
      slug: string
      nameRu: string
      nameEn: string
      keywords: string
      svg: string
      viewBox: string
      folder: string
      prefix: string
    }

    const allIcons: ParsedIcon[] = []
    let spriteSheetsFound = 0

    for (const { path, zipEntry } of svgFiles) {
      const svgContent = await zipEntry.async('string')

      // ── Try sprite sheet format first (Flaticon / Uicons) ──
      const pathParts = path.split('/')
      const fileName = pathParts.pop() || 'icon'
      const spriteIcons = parseSpriteSheet(svgContent, fileName)
      if (spriteIcons) {
        // Sprite sheet detected — each SVG = one group of icons
        spriteSheetsFound++
        allIcons.push(...spriteIcons)
        continue
      }

      // ── Standard per-file format (Figma export, etc.) ──
      const folder = pathParts.length > 0 ? pathParts.join('/') : '_root'

      // Determine prefix from filename (remove .svg extension first)
      const rawFileName = fileName.replace(/\.svg$/i, '')

      // Try splitting by " - " (Figma export convention) or " / "
      let prefix = ''
      const dashParts = rawFileName.split(' - ')
      const slashParts = rawFileName.split(' / ')
      if (slashParts.length >= 2) {
        prefix = slashParts[0].trim()
      } else if (dashParts.length >= 2) {
        prefix = dashParts[0].trim()
      }

      // For the icon name, remove the prefix part
      const nameWithoutPrefix = slashParts.length >= 2
        ? slashParts.slice(1).join(' / ')
        : dashParts.length >= 2
          ? dashParts.slice(1).join(' - ')
          : rawFileName

      const metaSlug = nameWithoutPrefix
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const parsed = parseSvgIcon(svgContent, nameWithoutPrefix, metaSlug)
      if (!parsed) continue

      allIcons.push({ ...parsed, folder, prefix })
    }

    if (spriteSheetsFound > 0) {
      console.log(`[zip-multipack] Detected ${spriteSheetsFound} sprite sheet(s)`)
    }

    console.log(`[zip-multipack] Parsed ${allIcons.length} icons`)

    // ── Group icons ──
    const hasSubfolders = new Set(allIcons.map(i => i.folder)).size > 1 ||
      (allIcons.length > 0 && allIcons[0].folder !== '_root')

    interface GroupInfo {
      name: string
      iconCount: number
      suggestedCategory: string
      suggestedStyle: string
      icons: ParsedIcon[]
    }

    const groupsMap = new Map<string, GroupInfo>()

    if (hasSubfolders) {
      // Group by folder name
      for (const icon of allIcons) {
        const folderName = icon.folder === '_root' ? 'Uncategorized' : icon.folder.split('/').pop() || icon.folder
        if (!groupsMap.has(icon.folder)) {
          const category = prefixToCategory(folderName)
          const style = suggestStyle(folderName)
          groupsMap.set(icon.folder, { name: folderName, iconCount: 0, suggestedCategory: category, suggestedStyle: style, icons: [] })
        }
        const group = groupsMap.get(icon.folder)!
        group.icons.push(icon)
        group.iconCount++
      }
    } else {
      // Flat structure — group by prefix
      const noPrefixIcons: ParsedIcon[] = []

      for (const icon of allIcons) {
        if (icon.prefix) {
          const groupKey = `prefix:${icon.prefix}`
          if (!groupsMap.has(groupKey)) {
            const category = prefixToCategory(icon.prefix)
            const style = suggestStyle(icon.prefix)
            groupsMap.set(groupKey, { name: icon.prefix, iconCount: 0, suggestedCategory: category, suggestedStyle: style, icons: [] })
          }
          const group = groupsMap.get(groupKey)!
          group.icons.push(icon)
          group.iconCount++
        } else {
          noPrefixIcons.push(icon)
        }
      }

      // Icons without prefix -> "Other" group
      if (noPrefixIcons.length > 0) {
        const catScores: Record<string, number> = {}
        for (const icon of noPrefixIcons) {
          const { category, confidence } = suggestCategoryByName(icon.nameEn)
          if (category !== 'uncategorized') catScores[category] = (catScores[category] || 0) + confidence
        }
        let bestCat = 'uncategorized'
        let bestScore = 0
        for (const [cat, score] of Object.entries(catScores)) {
          if (score > bestScore) { bestScore = score; bestCat = cat }
        }

        groupsMap.set('prefix:__other__', {
          name: 'Other',
          iconCount: noPrefixIcons.length,
          suggestedCategory: bestCat,
          suggestedStyle: 'outline',
          icons: noPrefixIcons,
        })
      }
    }

    const groups = Array.from(groupsMap.values())
    // Sort by icon count descending
    groups.sort((a, b) => b.iconCount - a.iconCount)

    // Also get DB categories for the frontend
    const dbCategories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })

    console.log(`[zip-multipack] Created ${groups.length} groups: ${groups.map(g => `${g.name}(${g.iconCount})`).join(', ')}`)

    return NextResponse.json({
      ok: true,
      totalFiles: svgFiles.length,
      totalIcons: allIcons.length,
      groups,
      categories: dbCategories.map(c => ({ slug: c.slug, nameRu: c.nameRu, nameEn: c.nameEn })),
    })
  } catch (e: any) {
    console.error('[/api/admin/zip-multipack] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Failed to process ZIP archive' },
      { status: 500 },
    )
  }
}

async function handleCreatePacks(req: NextRequest) {
  try {
    const body = await req.json()
    const { groups } = body as {
      groups: Array<{
        name: string
        category: string
        style: string
        enabled: boolean
        icons: Array<{
          slug: string
          nameRu: string
          nameEn: string
          keywords: string
          svg: string
          viewBox: string
        }>
      }>
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ error: 'No groups provided' }, { status: 400 })
    }

    // Auto-create missing categories
    const dbCategories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })
    const validSlugs = new Set(dbCategories.map(c => c.slug))
    const maxSortOrder = dbCategories.length > 0 ? Math.max(...dbCategories.map(c => c.sortOrder)) : 0

    const allNeededSlugs = new Set(groups.map(g => g.category))
    const missingSlugs = [...allNeededSlugs].filter(s => !validSlugs.has(s) && s !== 'uncategorized')
    if (missingSlugs.length > 0) {
      console.log(`[zip-multipack] Auto-creating categories: ${missingSlugs.join(', ')}`)
      for (let i = 0; i < missingSlugs.length; i++) {
        const slug = missingSlugs[i]
        const catInfo = CATEGORY_KEYWORDS[slug]
        await db.category.create({
          data: {
            slug,
            nameRu: catInfo ? slug.charAt(0).toUpperCase() + slug.slice(1) : slug,
            nameEn: catInfo ? slug.charAt(0).toUpperCase() + slug.slice(1) : slug,
            descRu: '',
            descEn: '',
            sortOrder: maxSortOrder + 10 + i * 10,
          },
        })
      }
    }

    // Create packs
    const results: string[] = []
    let totalPacksCreated = 0
    let totalIconsCreated = 0

    for (const group of groups) {
      if (!group.enabled || group.icons.length === 0) continue

      const frameSlug = group.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const finalSlug = await ensureUniqueSlug(`zip-${frameSlug}`)

      // Strip fields that don't exist in Prisma Icon schema (folder, prefix)
      const cleanIcons = group.icons.map(({ slug, nameRu, nameEn, keywords, svg, viewBox }) => ({
        slug, nameRu, nameEn, keywords, svg, viewBox
      }))

      // Build meaningful tags from icon keywords
      const allKeywords = [...new Set(
        cleanIcons.flatMap(i => (i.keywords || '').split(/,\s*/).filter(k => k.length > 1))
      )].slice(0, 15).join(', ')

      try {
        const created = await db.pack.create({
          data: {
            slug: finalSlug,
            nameRu: group.name,
            nameEn: group.name,
            descRu: `Импортировано из ZIP, категория "${group.name}" (${group.category}, ${group.style})`,
            descEn: `Imported from ZIP, category "${group.name}" (${group.category}, ${group.style})`,
            category: group.category,
            style: group.style,
            tags: allKeywords,
            isFree: true,
            priceCredits: 10,
            icons: { create: cleanIcons },
          },
          include: { _count: { select: { icons: true } } },
        })

        totalPacksCreated++
        totalIconsCreated += created._count.icons
        results.push(`✓ "${finalSlug}" (${group.name}) [${group.category}, ${group.style}] — ${created._count.icons} icons`)
      } catch (e: any) {
        results.push(`✗ "${frameSlug}" — ${e?.message || 'error'}`)
      }
    }

    return NextResponse.json({
      ok: true,
      totalPacks: totalPacksCreated,
      totalIcons: totalIconsCreated,
      results,
    })
  } catch (e: any) {
    console.error('[/api/admin/zip-multipack] Create packs ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Failed to create packs' },
      { status: 500 },
    )
  }
}
