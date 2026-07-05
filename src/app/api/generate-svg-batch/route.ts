import { NextRequest, NextResponse } from 'next/server'
import { getZAI } from '@/lib/zai'
import { searchAllPrimitives } from '@/lib/primitive-library'

// ─── System prompt (shared with single generation) ──────────────────
const SYSTEM_PROMPT = `You are a professional SVG icon designer. You create clean, production-ready SVG icons for UI/UX applications.

CRITICAL RULES — follow every single one:
1. Return ONLY SVG elements (path, circle, rect, polyline, line, ellipse, polygon). NO <svg> tag, NO xmlns, NO width, NO height, NO viewBox — the wrapper adds those.
2. The viewBox is 512x512. Center your icon. Use coordinates in the 56-456 range (leave ~56px padding on each side).
3. Use "currentColor" for ALL stroke and fill colors — NEVER use specific hex colors like #000 or #fff or rgb(). The wrapper replaces currentColor with the user's chosen color.
4. EXCEPTION: In "flat" filled style, you may use rgba(255,255,255,0.2) or rgba(255,255,255,0.3) for subtle inner details (highlight, reflection). But the main shape MUST use currentColor.
5. NEVER add any background rectangle, shape, or fill behind the icon. The background is handled separately.
6. NEVER add text, letters, numbers, or labels to the icon.
7. NEVER add <defs>, <linearGradient>, <clipPath>, <filter>, <mask>, or <style> elements.
8. Keep paths simple — aim for 1-5 elements total. Simpler is better.
9. For OUTLINED style: fill="none" stroke="currentColor" stroke-width="24-32" stroke-linecap="round" stroke-linejoin="round"
10. For FILLED style: fill="currentColor" stroke="none" — solid shapes, no outlines.
11. The icon must be visually balanced and centered at approximately (256, 256).
12. Output ONLY valid SVG fragment elements. NO markdown, NO code blocks, NO explanation, NO comments.
13. Do NOT use <g> group tags. Use individual elements directly.
14. Do NOT use transform attributes (no translate, rotate, scale).
15. stroke-width should be 24-32 for outlined icons (this scales well at all sizes).
16. Draw recognizable, iconic shapes — not abstract art. The icon should be immediately identifiable at 24px size.
17. Each path should be a single continuous shape. Do NOT stack multiple tiny paths to approximate a shape.`

// ─── Few-shot examples by style + fillMode ──────────────────────────
const EXAMPLES_OUTLINED_MINIMAL = `
EXAMPLE — outlined minimal "home" icon:
<path d="M80 272v160a16 16 0 0 0 16 16h96v-112h128v112h96a16 16 0 0 0 16-16V272" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
<polyline points="56 264 256 80 456 264" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>

EXAMPLE — outlined minimal "heart" icon:
<path d="M256 448l-30-27C118 323 48 258 48 181 48 118 98 68 161 68c35 0 68 16 95 42 28-26 61-42 96-42 62 0 112 50 112 113 0 77-70 142-178 240z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>

EXAMPLE — outlined minimal "search" icon:
<circle cx="220" cy="220" r="140" fill="none" stroke="currentColor" stroke-width="28"/>
<line x1="320" y1="320" x2="440" y2="440" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>

EXAMPLE — outlined minimal "settings gear" icon:
<circle cx="256" cy="256" r="60" fill="none" stroke="currentColor" stroke-width="28"/>
<path d="M256 68v40M256 404v40M68 256h40M404 256h40M122 122l28 28M362 362l28 28M122 390l28-28M362 150l28-28" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>

EXAMPLE — outlined minimal "sun" icon:
<circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" stroke-width="28"/>
<path d="M256 56v60M256 396v60M56 256h60M396 256h60M115 115l42 42M355 355l42 42M115 397l42-42M355 115l42-42" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>

EXAMPLE — outlined minimal "user" icon:
<circle cx="256" cy="170" r="80" fill="none" stroke="currentColor" stroke-width="28"/>
<path d="M100 440c0-86 70-156 156-156s156 70 156 156" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`

const EXAMPLES_FILLED_MINIMAL = `
EXAMPLE — filled minimal "home" icon:
<path d="M80 272v160a16 16 0 0 0 16 16h96v-112h128v112h96a16 16 0 0 0 16-16V272L256 80z" fill="currentColor"/>

EXAMPLE — filled minimal "heart" icon:
<path d="M256 448l-30-27C118 323 48 258 48 181 48 118 98 68 161 68c35 0 68 16 95 42 28-26 61-42 96-42 62 0 112 50 112 113 0 77-70 142-178 240z" fill="currentColor"/>

EXAMPLE — filled minimal "search" icon:
<circle cx="220" cy="220" r="140" fill="currentColor"/>
<rect x="310" y="310" width="28" height="160" rx="14" fill="currentColor" transform="rotate(-45 310 310)"/>

EXAMPLE — filled minimal "star" icon:
<path d="M256 68l60 148 160 14-120 104 36 156-136-80-136 80 36-156L36 230l160-14z" fill="currentColor"/>

EXAMPLE — filled minimal "cloud" icon:
<path d="M140 356c-44 0-80-36-80-80 0-40 30-72 68-78 8-56 56-100 116-100 48 0 88 28 106 68 8-2 16-4 24-4 44 0 80 36 80 80s-36 80-80 80H140z" fill="currentColor"/>

EXAMPLE — filled minimal "user" icon:
<circle cx="256" cy="170" r="80" fill="currentColor"/>
<path d="M100 440c0-86 70-156 156-156s156 70 156 156z" fill="currentColor"/>`

const EXAMPLES_FILLED_FLAT = `
EXAMPLE — filled flat "mail" icon:
<rect x="56" y="120" width="400" height="272" rx="32" fill="currentColor"/>
<path d="M56 152l200 128 200-128" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="24"/>

EXAMPLE — filled flat "camera" icon:
<rect x="56" y="160" width="400" height="280" rx="40" fill="currentColor"/>
<circle cx="256" cy="300" r="80" fill="rgba(255,255,255,0.2)"/>
<circle cx="256" cy="300" r="52" fill="rgba(255,255,255,0.3)"/>
<path d="M192 160l24-48h80l24 48" fill="currentColor"/>

EXAMPLE — filled flat "folder" icon:
<path d="M56 160v240a32 32 0 0 0 32 32h336a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32H240l-40-40H88a32 32 0 0 0-32 32z" fill="currentColor"/>

EXAMPLE — filled flat "phone" icon:
<rect x="148" y="56" width="216" height="400" rx="32" fill="currentColor"/>
<rect x="180" y="100" width="152" height="260" rx="8" fill="rgba(255,255,255,0.2)"/>
<circle cx="256" cy="406" r="20" fill="rgba(255,255,255,0.3)"/>`

const EXAMPLES_OUTLINED_FLAT = `
EXAMPLE — outlined flat "mail" icon:
<rect x="56" y="120" width="400" height="272" rx="32" fill="none" stroke="currentColor" stroke-width="24"/>
<polyline points="56,152 256,280 456,152" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>

EXAMPLE — outlined flat "camera" icon:
<rect x="56" y="160" width="400" height="280" rx="40" fill="none" stroke="currentColor" stroke-width="24"/>
<circle cx="256" cy="300" r="80" fill="none" stroke="currentColor" stroke-width="24"/>
<path d="M192 160l24-48h80l24 48" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>

EXAMPLE — outlined flat "folder" icon:
<path d="M56 160v240a32 32 0 0 0 32 32h336a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32H240l-40-40H88a32 32 0 0 0-32 32z" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>

EXAMPLE — outlined flat "phone" icon:
<rect x="148" y="56" width="216" height="400" rx="32" fill="none" stroke="currentColor" stroke-width="24"/>
<rect x="180" y="100" width="152" height="260" rx="8" fill="none" stroke="currentColor" stroke-width="16"/>
<circle cx="256" cy="406" r="20" fill="none" stroke="currentColor" stroke-width="16"/>`

function getExamples(style: string, fillMode: string): string {
  if (fillMode === 'filled') {
    if (style === 'flat') return EXAMPLES_FILLED_FLAT
    return EXAMPLES_FILLED_MINIMAL
  }
  if (style === 'flat') return EXAMPLES_OUTLINED_FLAT
  return EXAMPLES_OUTLINED_MINIMAL
}

// ─── SVG Validation & Cleaning ──────────────────────────────────────
function validateSvgContent(svg: string, fillMode: string, style: string): { valid: boolean; reason?: string } {
  if (!svg || svg.length < 10) return { valid: false, reason: 'SVG content is too short' }
  if (!/<(path|circle|rect|polyline|polygon|line|ellipse)\b/.test(svg)) return { valid: false, reason: 'No drawing elements found' }
  if (!svg.includes('currentColor')) return { valid: false, reason: 'SVG does not use currentColor' }
  const forbidden = ['<svg', '</svg>', '<style', '<script', '<image', '<foreignObject']
  for (const tag of forbidden) {
    if (svg.toLowerCase().includes(tag.toLowerCase())) return { valid: false, reason: `Contains forbidden tag: ${tag}` }
  }
  const hexColorMatch = svg.match(/(?:fill|stroke)="#[0-9a-fA-F]{3,8}"/g)
  if (hexColorMatch) return { valid: false, reason: 'Contains hardcoded hex colors' }
  const rgbMatch = svg.match(/(?:fill|stroke)="rgb\(/g)
  if (rgbMatch) return { valid: false, reason: 'Contains rgb() colors' }
  if (style !== 'flat') {
    const rgbaMatch = svg.match(/(?:fill|stroke)="rgba\(/g)
    if (rgbaMatch) return { valid: false, reason: 'Contains rgba() colors — only flat style allows rgba' }
  }
  const elementCount = (svg.match(/<(path|circle|rect|polyline|polygon|line|ellipse)\b/g) || []).length
  if (elementCount > 20) return { valid: false, reason: `Too many elements (${elementCount})` }
  if (/<text\b/i.test(svg)) return { valid: false, reason: 'Contains <text> element' }
  const emptyPathMatch = svg.match(/<path[^>]*(?:d=""|d='')[^>]*>/g)
  if (emptyPathMatch) return { valid: false, reason: 'Contains empty path elements' }
  return { valid: true }
}

function cleanSvgContent(svg: string): string {
  return svg
    .replace(/^```(?:svg|xml|html)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
    .replace(/<svg[^>]*>/gi, '')
    .replace(/<\/svg>/gi, '')
    .trim()
    .replace(/<g[^>]*>/gi, '')
    .replace(/<\/g>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<defs[^>]*>[\s\S]*?<\/defs>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\?xml[^?]*\?>/gi, '')
    .trim()
}

function autoFixSvg(svg: string, fillMode: string): string {
  let fixed = svg
  if (fillMode === 'filled') {
    fixed = fixed.replace(/fill="none"\s+stroke="currentColor"/g, 'fill="currentColor" stroke="none"')
    fixed = fixed.replace(/stroke="currentColor"\s+fill="none"/g, 'fill="currentColor" stroke="none"')
  }
  fixed = fixed.replace(/\s+xmlns[^=]*="[^"]*"/g, '')
  fixed = fixed.replace(/\s+xmlns:xlink="[^"]*"/g, '')
  fixed = fixed.replace(/\s+id="[^"]*"/g, '')
  fixed = fixed.replace(/\s+class="[^"]*"/g, '')
  fixed = fixed.replace(/\s+style="enable-background[^"]*"/g, '')
  fixed = fixed.replace(/fill="#000000?"/g, 'fill="currentColor"')
  fixed = fixed.replace(/fill="#000"/g, 'fill="currentColor"')
  fixed = fixed.replace(/fill="#fff"/g, 'fill="currentColor"')
  fixed = fixed.replace(/fill="#ffffff"/g, 'fill="currentColor"')
  fixed = fixed.replace(/fill="#FFFFFF"/g, 'fill="currentColor"')
  fixed = fixed.replace(/stroke="#000000?"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/stroke="#000"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/stroke="#fff"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/stroke="#ffffff"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/stroke="#FFFFFF"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/fill="black"/g, 'fill="currentColor"')
  fixed = fixed.replace(/stroke="black"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/fill="white"/g, 'fill="currentColor"')
  fixed = fixed.replace(/stroke="white"/g, 'stroke="currentColor"')
  fixed = fixed.replace(/<rect[^>]*x="0"[^>]*y="0"[^>]*width="512"[^>]*height="512"[^>]*\/?>/gi, '')
  fixed = fixed.replace(/<rect[^>]*width="512"[^>]*height="512"[^>]*x="0"[^>]*y="0"[^>]*\/?>/gi, '')
  return fixed
}

// ─── Translate Russian prompt to English for the LLM ────────────────
const RU_TO_EN: Record<string, string> = {
  'дом': 'home', 'домой': 'home', 'сердце': 'heart', 'звезда': 'star',
  'поиск': 'search', 'найти': 'search', 'настройки': 'settings', 'шестерёнка': 'settings gear',
  'пользователь': 'user', 'человек': 'person', 'камера': 'camera', 'фото': 'camera',
  'почта': 'mail', 'письмо': 'mail', 'телефон': 'phone', 'звонок': 'phone call',
  'облако': 'cloud', 'загрузка': 'upload', 'скачать': 'download', 'стрелка': 'arrow',
  'музыка': 'music', 'корзина': 'shopping cart', 'покупки': 'shopping bag',
  'солнце': 'sun', 'луна': 'moon', 'дождь': 'rain', 'снег': 'snow',
  'огонь': 'fire', 'вода': 'water', 'дерево': 'tree', 'лист': 'leaf',
  'замок': 'lock', 'ключ': 'key', 'глаз': 'eye', 'ухо': 'ear',
  'рука': 'hand', 'палец': 'finger', 'нога': 'foot',
  'книга': 'book', 'ручка': 'pen', 'карандаш': 'pencil',
  'молния': 'lightning', 'батарея': 'battery', 'часы': 'clock',
  'календарь': 'calendar', 'дата': 'date',
  'локация': 'location', 'карта': 'map', 'мир': 'globe',
  'самолёт': 'airplane', 'машина': 'car', 'велосипед': 'bicycle',
  'кошелёк': 'wallet', 'деньги': 'money', 'доллар': 'dollar',
  'любовь': 'heart',
  'улыбка': 'smile', 'смех': 'laugh',
  'бумага': 'paper', 'документ': 'document', 'файл': 'file',
  'папка': 'folder', 'архив': 'archive',
  'чарт': 'chart', 'график': 'graph', 'диаграмма': 'diagram',
  'свет': 'light', 'лампочка': 'lightbulb',
  'трофей': 'trophy', 'медаль': 'medal',
  'настройка': 'setting', 'фильтр': 'filter',
  'поделиться': 'share', 'ссылка': 'link',
  'копировать': 'copy', 'вставить': 'paste',
  'вырезать': 'cut', 'удалить': 'trash',
  'редактировать': 'edit', 'изменить': 'edit',
  'сохранить': 'save', 'отменить': 'undo',
  'вернуть': 'redo', 'обновить': 'refresh',
  'плюс': 'plus', 'минус': 'minus',
  'крестик': 'close', 'галочка': 'check',
  'вопрос': 'question', 'информация': 'info',
  'предупреждение': 'warning', 'ошибка': 'error',
  'успех': 'success', 'лайк': 'like',
  'дизлайк': 'dislike', 'комментарий': 'comment',
  'сообщение': 'message', 'чат': 'chat',
  'видео': 'video', 'микрофон': 'microphone',
  'наушники': 'headphones', 'динамик': 'speaker',
  'вайфай': 'wifi', 'блютуз': 'bluetooth',
  'сигнал': 'signal', 'рсс': 'rss',
  'код': 'code', 'терминал': 'terminal',
  'баг': 'bug', 'фича': 'feature',
  'щит': 'shield', 'безопасность': 'security',
  'приватность': 'privacy', 'цензура': 'censorship',
}

function translatePrompt(prompt: string): { enPrompt: string; originalPrompt: string } {
  const lower = prompt.toLowerCase().trim()
  // Check if it's already English
  if (/^[a-z0-9\s\-_]+$/.test(lower)) {
    return { enPrompt: lower, originalPrompt: prompt }
  }
  // Try direct translation
  if (RU_TO_EN[lower]) {
    return { enPrompt: RU_TO_EN[lower], originalPrompt: prompt }
  }
  // Try word-by-word translation for compound names
  const words = lower.split(/\s+/)
  const translated = words.map(w => RU_TO_EN[w] || w).join(' ')
  return { enPrompt: translated, originalPrompt: prompt }
}

// ─── Generate single icon ───────────────────────────────────────────
async function generateSingleIcon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zai: any,
  nameEn: string,
  nameRu: string,
  style: string,
  fillMode: string
): Promise<{ nameEn: string; nameRu: string; svg: string; warning?: string; error?: string }> {
  const isFilled = fillMode === 'filled'
  const styleDesc = style === '3d' ? '3D isometric with subtle depth and layered shapes'
    : style === 'flat' ? 'flat design, simple bold geometric shapes, no curves unless necessary'
    : style === 'gradient' ? 'clean modern design with layered shapes creating depth illusion'
    : 'minimalist, clean simple lines, thin strokes'

  const { enPrompt } = translatePrompt(nameEn)

  // Search icon library for similar icons as few-shot examples
  const similarIcons = await searchAllPrimitives(enPrompt, fillMode)
  let libraryExamples = ''
  if (similarIcons.length > 0) {
    const topIcons = similarIcons.slice(0, 3)
    libraryExamples = '\nREFERENCE — similar icons from the icon library (use as inspiration for shape/proportions, but create an ORIGINAL icon):\n'
    for (const ref of topIcons) {
      const scaledSvg = ref.svg
        .replace(/transform="scale\([^)]+\)"/g, '')
        .replace(/<g[^>]*>/g, '')
        .replace(/<\/g>/g, '')
      const isRefFilled = ref.fillMode === 'filled'
      const refFillAttr = isRefFilled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"'
      libraryExamples += `EXAMPLE — ${isRefFilled ? 'filled' : 'outlined'} "${ref.name}" icon (reference):\n${scaledSvg.replace(/fill="none"/g, isRefFilled ? 'fill="currentColor"' : 'fill="none"').replace(/stroke="currentColor"/g, refFillAttr.split(' ').find(a => a.startsWith('stroke=')) || 'stroke="currentColor"')}\n\n`
    }
  }

  const examples = getExamples(style, fillMode)
  const fillRule = isFilled
    ? 'FILLED: Use fill="currentColor" stroke="none". Solid shapes, no outlines.'
    : 'OUTLINED: Use fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round". Stroke only, no fill.'

  const userPrompt = `Create a ${styleDesc} SVG icon of "${enPrompt}".
${fillRule}
Use currentColor for ALL colors. No background. No text. Centered in 512x512 viewport.

${libraryExamples}${examples}

Now create the icon. Output ONLY the SVG elements, nothing else:`

  // Try up to 3 times with validation
  const maxAttempts = 3
  let lastError = ''
  let lastSvg = ''

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const messages = attempt === 0
      ? [
          { role: 'system' as const, content: SYSTEM_PROMPT },
          { role: 'user' as const, content: userPrompt },
        ]
      : [
          { role: 'system' as const, content: SYSTEM_PROMPT },
          { role: 'user' as const, content: userPrompt },
          { role: 'assistant' as const, content: lastSvg },
          { role: 'user' as const, content: `Your previous output was invalid: ${lastError}. Fix it and output ONLY valid SVG elements using currentColor. No <svg> tags, no hex colors, no text, no background, no <g> tags.` },
        ]

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    let svgContent = completion.choices?.[0]?.message?.content?.trim() || ''
    svgContent = cleanSvgContent(svgContent)
    svgContent = autoFixSvg(svgContent, fillMode)

    const validation = validateSvgContent(svgContent, fillMode, style)
    if (validation.valid) {
      return { nameEn, nameRu, svg: svgContent }
    }

    lastError = validation.reason || 'Unknown validation error'
    lastSvg = svgContent
    console.warn(`[generate-svg-batch] "${nameEn}" attempt ${attempt + 1} failed: ${lastError}`)
  }

  // Fallback: simplified prompt
  console.error(`[generate-svg-batch] "${nameEn}" all attempts failed, trying fallback`)

  const fallbackCompletion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You create simple SVG icons. Use only <path>, <circle>, <rect> elements. Use currentColor for all colors. No <svg> tags. No background. No text. No <g> tags. No hex colors.' },
      { role: 'user', content: `Simple ${isFilled ? 'filled' : 'outlined'} SVG icon of "${enPrompt}". Use currentColor. Only SVG elements, no wrapper. ${isFilled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="28"'}.` },
    ],
    thinking: { type: 'disabled' },
  })

  let fallbackSvg = fallbackCompletion.choices?.[0]?.message?.content?.trim() || ''
  fallbackSvg = cleanSvgContent(fallbackSvg)
  fallbackSvg = autoFixSvg(fallbackSvg, fillMode)

  if (fallbackSvg.length > 10) {
    return { nameEn, nameRu, svg: fallbackSvg, warning: `Fallback used: ${lastError}` }
  }

  return { nameEn, nameRu, svg: '', error: `Generation failed: ${lastError}` }
}

// ─── Main handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { icons, style = 'minimal', fillMode = 'outlined', packId } = body

    // Support both single icon (backward compat) and batch
    const iconList: { nameEn: string; nameRu: string }[] = icons || []

    if (iconList.length === 0) {
      return NextResponse.json({ error: 'Icons list is required' }, { status: 400 })
    }

    if (iconList.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 icons per batch' }, { status: 400 })
    }

    const zai = await getZAI()
    const results: { nameEn: string; nameRu: string; svg: string; warning?: string; error?: string }[] = []

    // Generate icons sequentially to avoid rate limits
    for (let i = 0; i < iconList.length; i++) {
      const icon = iconList[i]
      console.log(`[generate-svg-batch] Generating ${i + 1}/${iconList.length}: "${icon.nameEn}"`)

      try {
        const result = await generateSingleIcon(zai, icon.nameEn, icon.nameRu || icon.nameEn, style, fillMode)
        results.push(result)
      } catch (err) {
        console.error(`[generate-svg-batch] Error generating "${icon.nameEn}":`, err)
        results.push({
          nameEn: icon.nameEn,
          nameRu: icon.nameRu || icon.nameEn,
          svg: '',
          error: err instanceof Error ? err.message : 'Generation failed',
        })
      }

      // Small delay between requests to avoid rate limits
      if (i < iconList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const successCount = results.filter(r => r.svg && !r.error).length
    const failCount = results.filter(r => r.error).length

    console.log(`[generate-svg-batch] Batch complete: ${successCount} success, ${failCount} failed out of ${iconList.length}`)

    return NextResponse.json({
      results,
      summary: { total: iconList.length, success: successCount, failed: failCount },
    })
  } catch (error) {
    console.error('[generate-svg-batch] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch generation failed' },
      { status: 500 }
    )
  }
}
