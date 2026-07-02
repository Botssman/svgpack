import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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
<path d="M256 68v40M256 404v40M68 256h40M404 256h40M122 122l28 28M362 362l28 28M122 390l28-28M362 150l28-28" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`

const EXAMPLES_FILLED_MINIMAL = `
EXAMPLE — filled minimal "home" icon:
<path d="M80 272v160a16 16 0 0 0 16 16h96v-112h128v112h96a16 16 0 0 0 16-16V272L256 80z" fill="currentColor"/>

EXAMPLE — filled minimal "heart" icon:
<path d="M256 448l-30-27C118 323 48 258 48 181 48 118 98 68 161 68c35 0 68 16 95 42 28-26 61-42 96-42 62 0 112 50 112 113 0 77-70 142-178 240z" fill="currentColor"/>

EXAMPLE — filled minimal "search" icon:
<circle cx="220" cy="220" r="140" fill="currentColor"/>
<rect x="310" y="310" width="28" height="160" rx="14" fill="currentColor" transform="rotate(-45 310 310)"/>

EXAMPLE — filled minimal "star" icon:
<path d="M256 68l60 148 160 14-120 104 36 156-136-80-136 80 36-156L36 230l160-14z" fill="currentColor"/>`

const EXAMPLES_FILLED_FLAT = `
EXAMPLE — filled flat "mail" icon:
<rect x="56" y="120" width="400" height="272" rx="32" fill="currentColor"/>
<path d="M56 152l200 128 200-128" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="24"/>

EXAMPLE — filled flat "camera" icon:
<rect x="56" y="160" width="400" height="280" rx="40" fill="currentColor"/>
<circle cx="256" cy="300" r="80" fill="rgba(255,255,255,0.2)"/>
<circle cx="256" cy="300" r="52" fill="rgba(255,255,255,0.3)"/>
<path d="M192 160l24-48h80l24 48" fill="currentColor"/>`

const EXAMPLES_OUTLINED_FLAT = `
EXAMPLE — outlined flat "mail" icon:
<rect x="56" y="120" width="400" height="272" rx="32" fill="none" stroke="currentColor" stroke-width="24"/>
<polyline points="56,152 256,280 456,152" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>

EXAMPLE — outlined flat "camera" icon:
<rect x="56" y="160" width="400" height="280" rx="40" fill="none" stroke="currentColor" stroke-width="24"/>
<circle cx="256" cy="300" r="80" fill="none" stroke="currentColor" stroke-width="24"/>
<path d="M192 160l24-48h80l24 48" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>`

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
2. The viewBox is 512x512. Center your icon. Use coordinates in the 70-442 range (leave ~70px padding on each side).
3. Use "currentColor" for ALL stroke and fill colors — NEVER use specific hex colors like #000 or #fff. The wrapper replaces currentColor with the user's chosen color.
4. NEVER add any background rectangle, shape, or fill behind the icon. The background is handled separately.
5. NEVER add text, letters, numbers, or labels to the icon.
6. NEVER add <defs>, <linearGradient>, <clipPath>, <filter>, <mask>, or <style> elements.
7. Keep paths simple — aim for 1-4 elements total. Simpler is better.
8. For OUTLINED style: fill="none" stroke="currentColor" stroke-width="24-32" stroke-linecap="round" stroke-linejoin="round"
9. For FILLED style: fill="currentColor" stroke="none" — solid shapes, no outlines.
10. The icon must be visually balanced and centered at approximately (256, 256).
11. Output ONLY valid SVG fragment elements. NO markdown, NO code blocks, NO explanation, NO comments.
12. Do NOT use <g> group tags. Use individual elements directly.
13. Do NOT use transform attributes (no translate, rotate, scale).
14. stroke-width should be 24-32 for outlined icons (this scales well at all sizes).`

// ─── SVG Validation ─────────────────────────────────────────────────
function validateSvgContent(svg: string): { valid: boolean; reason?: string } {
  if (!svg || svg.length < 10) {
    return { valid: false, reason: 'SVG content is too short' }
  }

  // Must contain at least one SVG drawing element
  const hasDrawingElement = /<(path|circle|rect|polyline|polygon|line|ellipse)\b/.test(svg)
  if (!hasDrawingElement) {
    return { valid: false, reason: 'No drawing elements found (path, circle, rect, etc.)' }
  }

  // Must use currentColor
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

  // Must NOT contain hardcoded hex colors (except in stroke-width, fill="none" etc.)
  const hexColorMatch = svg.match(/(?:fill|stroke)="#[0-9a-fA-F]{3,8}"/g)
  if (hexColorMatch) {
    return { valid: false, reason: 'Contains hardcoded hex colors instead of currentColor' }
  }

  // Check reasonable size (not too complex)
  const elementCount = (svg.match(/<(path|circle|rect|polyline|polygon|line|ellipse)\b/g) || []).length
  if (elementCount > 15) {
    return { valid: false, reason: `Too many elements (${elementCount}), icon should be simpler` }
  }

  // Check no text elements
  if (/<text\b/i.test(svg)) {
    return { valid: false, reason: 'Contains <text> element — icons must not have text' }
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

    const examples = getExamples(style, fillMode)
    const fillRule = isFilled
      ? 'FILLED: Use fill="currentColor" stroke="none". Solid shapes, no outlines.'
      : 'OUTLINED: Use fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round". Stroke only, no fill.'

    const userPrompt = `Create a ${styleDesc} SVG icon of "${prompt.trim()}".
${fillRule}
Use currentColor for ALL colors. No background. No text. Centered in 512x512 viewport.

${examples}

Now create the icon. Output ONLY the SVG elements, nothing else:`

    const zai = await ZAI.create()

    // Try up to 3 times with validation
    const maxAttempts = 3
    let lastError = ''

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      let svgContent = completion.choices?.[0]?.message?.content?.trim() || ''

      // Clean up the output
      svgContent = cleanSvgContent(svgContent)

      // Validate
      const validation = validateSvgContent(svgContent)
      if (validation.valid) {
        return NextResponse.json({ svg: svgContent })
      }

      lastError = validation.reason || 'Unknown validation error'
      console.warn(`[generate-svg] Attempt ${attempt + 1} failed validation: ${lastError}`)

      // On retry, add a correction hint
      if (attempt < maxAttempts - 1) {
        const correction = `Your previous output was invalid: ${lastError}. Fix it and output ONLY valid SVG elements using currentColor. No <svg> tags, no hex colors, no text, no background.`
        // Add the failed output and correction as context for retry
        const retryMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: svgContent },
          { role: 'user', content: correction },
        ]

        const retryCompletion = await zai.chat.completions.create({
          messages: retryMessages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          thinking: { type: 'disabled' },
        })

        svgContent = retryCompletion.choices?.[0]?.message?.content?.trim() || ''
        svgContent = cleanSvgContent(svgContent)

        const retryValidation = validateSvgContent(svgContent)
        if (retryValidation.valid) {
          return NextResponse.json({ svg: svgContent })
        }

        lastError = retryValidation.reason || 'Unknown validation error'
        console.warn(`[generate-svg] Retry attempt ${attempt + 1} failed: ${lastError}`)
      }
    }

    // All attempts failed — return the last result anyway with a warning
    // (better to show something than nothing)
    console.error(`[generate-svg] All ${maxAttempts} attempts failed. Last error: ${lastError}`)

    // Try one last time with a very simple prompt
    const fallbackCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You create simple SVG icons. Use only <path>, <circle>, <rect> elements. Use currentColor for all colors. No <svg> tags. No background. No text.' },
        { role: 'user', content: `Simple ${isFilled ? 'filled' : 'outlined'} SVG icon of "${prompt.trim()}". Use currentColor. Only SVG elements, no wrapper.` },
      ],
      thinking: { type: 'disabled' },
    })

    let fallbackSvg = fallbackCompletion.choices?.[0]?.message?.content?.trim() || ''
    fallbackSvg = cleanSvgContent(fallbackSvg)

    if (fallbackSvg.length > 10) {
      return NextResponse.json({ svg: fallbackSvg, warning: lastError })
    }

    return NextResponse.json({ error: `SVG generation failed after ${maxAttempts} attempts: ${lastError}` }, { status: 500 })
  } catch (error) {
    console.error('[generate-svg] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SVG generation failed' },
      { status: 500 }
    )
  }
}
