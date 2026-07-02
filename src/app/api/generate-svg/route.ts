import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT = `You are a professional SVG icon designer. You create clean, minimal, production-ready SVG icons.

RULES — follow them strictly:
1. Return ONLY the inner SVG content that goes inside a <svg> tag. Do NOT include <svg>, </svg>, xmlns, width, height, or viewBox — those are added by the wrapper.
2. The content will be placed inside a 512x512 viewBox. Center your icon and use roughly 60-452 coordinate range (leaving ~60px padding).
3. Use ONLY the provided color for all strokes and fills. Use "currentColor" as the color value — it will be replaced with the user's chosen color later.
4. NEVER add background rectangles or shapes. The background is handled separately.
5. NEVER add text labels or letters to the icon.
6. Keep paths simple and clean. Use as few elements as possible.
7. For outlined style: use stroke only, no fill (fill="none", stroke="currentColor").
8. For filled style: use fill only, no stroke (fill="currentColor", stroke="none").
9. Ensure the icon is visually balanced and centered.
10. Output valid SVG fragments only — no markdown, no code blocks, no explanations.

EXAMPLE of good output for a filled heart icon:
<path d="M256 448l-30.164-27.211C118.718 322.927 48 258.373 48 180.5 48 118.055 98.055 68 160.5 68c34.832 0 68.254 16.146 95.5 41.703C283.246 84.146 316.668 68 351.5 68 413.945 68 464 118.055 464 180.5c0 77.873-70.718 142.427-177.836 240.289z" fill="currentColor" />

EXAMPLE of good output for an outlined home icon:
<path d="M80 272v144a16 16 0 0 0 16 16h96v-112h128v112h96a16 16 0 0 0 16-16V272" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
<polyline points="48 256 256 80 464 256" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />`

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, fillMode } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const isFilled = fillMode === 'filled'
    const styleDesc = style === '3d' ? '3D isometric with subtle depth and shading' 
      : style === 'flat' ? 'flat design, simple geometric shapes' 
      : style === 'gradient' ? 'gradient design with smooth color transitions' 
      : 'minimalist, clean lines, simple'

    const userPrompt = `Create a ${styleDesc} SVG icon of "${prompt.trim()}". Style: ${isFilled ? 'filled (solid shapes, no stroke)' : 'outlined (stroke only, no fill)'}. Use currentColor for all colors.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    let svgContent = completion.choices?.[0]?.message?.content?.trim() || ''

    // Strip markdown code blocks if the LLM wrapped the output
    svgContent = svgContent
      .replace(/^```(?:svg|xml|html)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    // Strip <svg> wrapper tags if the LLM included them (we only want inner content)
    svgContent = svgContent
      .replace(/<svg[^>]*>/gi, '')
      .replace(/<\/svg>/gi, '')
      .trim()

    if (!svgContent || svgContent.length < 10) {
      return NextResponse.json({ error: 'LLM returned empty SVG content' }, { status: 500 })
    }

    return NextResponse.json({ svg: svgContent })
  } catch (error) {
    console.error('[generate-svg] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SVG generation failed' },
      { status: 500 }
    )
  }
}
