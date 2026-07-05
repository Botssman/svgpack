import { NextRequest, NextResponse } from 'next/server'
import { getZAI } from '@/lib/zai'
import { searchAllPrimitives, getAllPrimitives } from '@/lib/primitive-library'

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

EXAMPLE — outlined minimal "arrow right" icon:
<line x1="80" y1="256" x2="432" y2="256" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>
<polyline points="300 124 432 256 300 388" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>

EXAMPLE — outlined minimal "cloud" icon:
<path d="M140 356c-44 0-80-36-80-80 0-40 30-72 68-78 8-56 56-100 116-100 48 0 88 28 106 68 8-2 16-4 24-4 44 0 80 36 80 80s-36 80-80 80H140z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>

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

EXAMPLE — filled minimal "sun" icon:
<circle cx="256" cy="256" r="80" fill="currentColor"/>
<rect x="242" y="56" width="28" height="60" rx="14" fill="currentColor"/>
<rect x="242" y="396" width="28" height="60" rx="14" fill="currentColor"/>
<rect x="56" y="242" width="60" height="28" rx="14" fill="currentColor"/>
<rect x="396" y="242" width="60" height="28" rx="14" fill="currentColor"/>

EXAMPLE — filled minimal "arrow right" icon:
<rect x="80" y="242" width="280" height="28" rx="14" fill="currentColor"/>
<path d="M300 124l132 132-132 132c-14 14 0 28 0 28l160-160-160-160s-14 14 0 28z" fill="currentColor"/>

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
  // outlined
  if (style === 'flat') return EXAMPLES_OUTLINED_FLAT
  return EXAMPLES_OUTLINED_MINIMAL
}

// ─── System prompt ──────────────────────────────────────────────────
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

// ─── SVG Validation ─────────────────────────────────────────────────
function validateSvgContent(svg: string, fillMode: string, style: string): { valid: boolean; reason?: string } {
  if (!svg || svg.length < 10) {
    return { valid: false, reason: 'SVG content is too short' }
  }

  // Must contain at least one SVG drawing element
  const hasDrawingElement = /<(path|circle|rect|polyline|polygon|line|ellipse)\b/.test(svg)
  if (!hasDrawingElement) {
    return { valid: false, reason: 'No drawing elements found (path, circle, rect, etc.)' }
  }

  // Must use currentColor for the main shape
  if (!svg.includes('currentColor')) {
    return { valid: false, reason: 'SVG does not use currentColor — colors will not match user settings' }
  }

  // Must NOT contain forbidden elements
  const forbidden = ['<svg', '</svg>', '<style', '<script', '<image', '<foreignObject']
  for (const tag of forbidden) {
    if (svg.toLowerCase().includes(tag.toLowerCase())) {
      return { valid: false, reason: `Contains forbidden tag: ${tag}` }
    }
  }

  // Must NOT contain hardcoded hex colors as main fill/stroke
  // But allow rgba() for flat style inner details
  const hexColorMatch = svg.match(/(?:fill|stroke)="#[0-9a-fA-F]{3,8}"/g)
  if (hexColorMatch) {
    return { valid: false, reason: 'Contains hardcoded hex colors instead of currentColor' }
  }

  // Must NOT contain rgb() colors (only rgba for flat style is ok)
  const rgbMatch = svg.match(/(?:fill|stroke)="rgb\(/g)
  if (rgbMatch) {
    return { valid: false, reason: 'Contains rgb() colors — use currentColor instead' }
  }

  // In non-flat styles, even rgba should not be used
  if (style !== 'flat') {
    const rgbaMatch = svg.match(/(?:fill|stroke)="rgba\(/g)
    if (rgbaMatch) {
      return { valid: false, reason: 'Contains rgba() colors — only flat style allows rgba for inner details' }
    }
  }

  // Check reasonable size (not too complex)
  const elementCount = (svg.match(/<(path|circle|rect|polyline|polygon|line|ellipse)\b/g) || []).length
  if (elementCount > 20) {
    return { valid: false, reason: `Too many elements (${elementCount}), icon should be simpler` }
  }

  // Check no text elements
  if (/<text\b/i.test(svg)) {
    return { valid: false, reason: 'Contains <text> element — icons must not have text' }
  }

  // Check for empty paths (d="" or no d attribute)
  const emptyPathMatch = svg.match(/<path[^>]*(?:d=""|d='')[^>]*>/g)
  if (emptyPathMatch) {
    return { valid: false, reason: 'Contains empty path elements' }
  }

  return { valid: true }
}

function cleanSvgContent(svg: string): string {
  return svg
    // Strip markdown code blocks
    .replace(/^```(?:svg|xml|html)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
    // Strip <svg> wrapper tags
    .replace(/<svg[^>]*>/gi, '')
    .replace(/<\/svg>/gi, '')
    .trim()
    // Strip <g> wrapper tags (flatten)
    .replace(/<g[^>]*>/gi, '')
    .replace(/<\/g>/gi, '')
    // Strip comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Strip <defs> blocks
    .replace(/<defs[^>]*>[\s\S]*?<\/defs>/gi, '')
    // Strip <style> blocks
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Strip xml declaration
    .replace(/<\?xml[^?]*\?>/gi, '')
    .trim()
}

/** Auto-fix common LLM mistakes in SVG content */
function autoFixSvg(svg: string, fillMode: string): string {
  let fixed = svg

  // Replace fill="none" that should be fill="currentColor" in filled mode
  // (only for the main element, not for stroke-only decorative elements)
  if (fillMode === 'filled') {
    // If an element has fill="none" and stroke="currentColor", swap to fill="currentColor" stroke="none"
    fixed = fixed.replace(
      /fill="none"\s+stroke="currentColor"/g,
      'fill="currentColor" stroke="none"'
    )
    fixed = fixed.replace(
      /stroke="currentColor"\s+fill="none"/g,
      'fill="currentColor" stroke="none"'
    )
  }

  // Remove common unnecessary attributes
  fixed = fixed.replace(/\s+xmlns[^=]*="[^"]*"/g, '')
  fixed = fixed.replace(/\s+xmlns:xlink="[^"]*"/g, '')
  fixed = fixed.replace(/\s+id="[^"]*"/g, '')
  fixed = fixed.replace(/\s+class="[^"]*"/g, '')

  // Remove leftover style attributes that might add backgrounds
  fixed = fixed.replace(/\s+style="enable-background[^"]*"/g, '')

  // Replace common hardcoded colors with currentColor
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

  // Remove any background rectangles (full-width rects with solid fill)
  fixed = fixed.replace(/<rect[^>]*x="0"[^>]*y="0"[^>]*width="512"[^>]*height="512"[^>]*\/?>/gi, '')
  fixed = fixed.replace(/<rect[^>]*width="512"[^>]*height="512"[^>]*x="0"[^>]*y="0"[^>]*\/?>/gi, '')

  return fixed
}

// ─── Main handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { prompt, style, fillMode } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const isFilled = fillMode === 'filled'
    const styleDesc = style === '3d' ? '3D isometric with subtle depth and layered shapes'
      : style === 'flat' ? 'flat design, simple bold geometric shapes, no curves unless necessary'
      : style === 'gradient' ? 'clean modern design with layered shapes creating depth illusion'
      : 'minimalist, clean simple lines, thin strokes'

    // ─── Search icon library for similar icons as few-shot examples ───
    const similarIcons = await searchAllPrimitives(prompt.trim(), fillMode)
    let libraryExamples = ''
    if (similarIcons.length > 0) {
      const topIcons = similarIcons.slice(0, 4)
      libraryExamples = '\nREFERENCE — similar icons from the icon library (use as inspiration for shape/proportions, but create an ORIGINAL icon):\n'
      for (const ref of topIcons) {
        // Convert from 24x24 viewBox to 512x512
        const scaledSvg = ref.svg
          .replace(/transform="scale\([^)]+\)"/g, '') // Remove scale transform
          .replace(/<g[^>]*>/g, '') // Remove g wrappers
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

    const userPrompt = `Create a ${styleDesc} SVG icon of "${prompt.trim()}".
${fillRule}
Use currentColor for ALL colors. No background. No text. Centered in 512x512 viewport.

${libraryExamples}${examples}

Now create the icon. Output ONLY the SVG elements, nothing else:`

    const zai = await getZAI()

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

      // Clean up the output
      svgContent = cleanSvgContent(svgContent)

      // Auto-fix common issues
      svgContent = autoFixSvg(svgContent, fillMode)

      // Validate
      const validation = validateSvgContent(svgContent, fillMode, style)
      if (validation.valid) {
        return NextResponse.json({ svg: svgContent })
      }

      lastError = validation.reason || 'Unknown validation error'
      lastSvg = svgContent
      console.warn(`[generate-svg] Attempt ${attempt + 1} failed validation: ${lastError}`)
    }

    // All attempts failed — try a very simple fallback
    console.error(`[generate-svg] All ${maxAttempts} attempts failed. Last error: ${lastError}`)

    const fallbackCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You create simple SVG icons. Use only <path>, <circle>, <rect> elements. Use currentColor for all colors. No <svg> tags. No background. No text. No <g> tags. No hex colors.' },
        { role: 'user', content: `Simple ${isFilled ? 'filled' : 'outlined'} SVG icon of "${prompt.trim()}". Use currentColor. Only SVG elements, no wrapper. ${isFilled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="28"'}.` },
      ],
      thinking: { type: 'disabled' },
    })

    let fallbackSvg = fallbackCompletion.choices?.[0]?.message?.content?.trim() || ''
    fallbackSvg = cleanSvgContent(fallbackSvg)
    fallbackSvg = autoFixSvg(fallbackSvg, fillMode)

    if (fallbackSvg.length > 10) {
      return NextResponse.json({ svg: fallbackSvg, warning: lastError })
    }

    return NextResponse.json({ error: `SVG generation failed after ${maxAttempts} attempts: ${lastError}` }, { status: 500 })
  } catch (error) {
    console.error('[generate-svg] Error:', error)
    const message = error instanceof Error ? error.message : 'SVG generation failed'
    if (message.includes('Z AI config missing') || message.includes('Configuration file not found')) {
      return NextResponse.json(
        {
          error: message,
          hint: 'On Vercel: add Z_AI_BASE_URL and Z_AI_API_KEY in Project Settings → Environment Variables, then redeploy.',
          envVarsPresent: {
            Z_AI_BASE_URL: !!process.env.Z_AI_BASE_URL,
            Z_AI_API_KEY: !!process.env.Z_AI_API_KEY,
          },
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
