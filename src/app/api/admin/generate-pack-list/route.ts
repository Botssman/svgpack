import { NextRequest, NextResponse } from 'next/server'
import { getZAI } from '@/lib/zai'

// ─── Fallback icon lists by theme ────────────────────────────────────
const FALLBACK_THEMES: Record<string, { name: string; prompt: string }[]> = {
  weather: [
    { name: 'sun', prompt: 'Bright sun with rays extending outward' },
    { name: 'cloud', prompt: 'Fluffy cloud shape' },
    { name: 'rain', prompt: 'Cloud with raindrops falling' },
    { name: 'snow', prompt: 'Snowflake with six symmetrical arms' },
    { name: 'lightning', prompt: 'Lightning bolt striking down' },
    { name: 'wind', prompt: 'Wavy lines representing wind' },
    { name: 'thermometer', prompt: 'Thermometer with mercury level' },
    { name: 'moon', prompt: 'Crescent moon shape' },
  ],
  social: [
    { name: 'heart', prompt: 'Heart shape outline' },
    { name: 'chat', prompt: 'Speech bubble shape' },
    { name: 'share', prompt: 'Share arrow pointing outward' },
    { name: 'user', prompt: 'Person silhouette in circle' },
    { name: 'bell', prompt: 'Notification bell' },
    { name: 'star', prompt: 'Five-pointed star' },
    { name: 'camera', prompt: 'Camera body shape' },
    { name: 'music', prompt: 'Musical note' },
  ],
  food: [
    { name: 'apple', prompt: 'Apple with a leaf' },
    { name: 'coffee', prompt: 'Coffee cup with steam' },
    { name: 'pizza', prompt: 'Pizza slice' },
    { name: 'burger', prompt: 'Hamburger shape' },
    { name: 'cake', prompt: 'Birthday cake with candles' },
    { name: 'wine', prompt: 'Wine glass' },
  ],
  finance: [
    { name: 'wallet', prompt: 'Wallet with cards peeking out' },
    { name: 'credit-card', prompt: 'Credit card shape' },
    { name: 'chart', prompt: 'Line chart going up' },
    { name: 'coin', prompt: 'Stack of coins' },
    { name: 'piggy-bank', prompt: 'Piggy bank shape' },
    { name: 'receipt', prompt: 'Receipt with lines' },
  ],
  navigation: [
    { name: 'home', prompt: 'House outline shape' },
    { name: 'arrow-right', prompt: 'Arrow pointing right' },
    { name: 'search', prompt: 'Magnifying glass icon' },
    { name: 'menu', prompt: 'Three horizontal lines hamburger menu' },
    { name: 'close', prompt: 'X mark close button' },
    { name: 'chevron', prompt: 'Chevron arrow pointing down' },
  ],
}

function getFallbackList(theme: string, count: number): { name: string; prompt: string }[] {
  const key = Object.keys(FALLBACK_THEMES).find(k => theme.toLowerCase().includes(k)) || 'social'
  const base = FALLBACK_THEMES[key]
  const result: { name: string; prompt: string }[] = []
  for (let i = 0; i < count && i < base.length; i++) {
    result.push(base[i])
  }
  while (result.length < count) {
    const idx = result.length
    result.push({ name: `icon-${idx + 1}`, prompt: `Icon number ${idx + 1} for theme ${theme}` })
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const { theme, count, rawText } = await req.json()

    // Mode 1: Parse raw text into icon list (simple line-by-line)
    if (rawText && typeof rawText === 'string' && rawText.trim().length > 0) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      const icons = lines.map((line, i) => {
        const clean = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '')
        const parts = clean.split(/[:—–-]/)
        const name = (parts[0] || `icon-${i + 1}`).trim().slice(0, 50)
        const prompt = (parts.slice(1).join(':') || name).trim().slice(0, 500)
        return { name: name.toLowerCase().replace(/\s+/g, '-'), prompt }
      })
      return NextResponse.json({ icons, provider: 'fallback' })
    }

    // Mode 2: Generate icon list from theme using LLM
    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ error: 'Theme or rawText is required' }, { status: 400 })
    }

    const iconCount = Math.min(Math.max(count || 6, 1), 50)

    // Try LLM first
    try {
      const zai = await getZAI()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an icon set designer. Given a theme, generate a list of icon names and descriptions. Return ONLY a JSON array, no other text. Each item must have "name" (kebab-case English slug) and "prompt" (English description of what the icon looks like). Example: [{"name":"sun","prompt":"Bright sun with rays extending outward"}]`,
          },
          {
            role: 'user',
            content: `Generate exactly ${iconCount} icon names for the theme "${theme.trim()}". Each icon should be distinct and recognizable. Return only the JSON array.`,
          },
        ],
        thinking: { type: 'disabled' },
      })

      let content = completion.choices?.[0]?.message?.content?.trim() || ''

      // Strip markdown code blocks
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

      const icons = JSON.parse(content)
      if (Array.isArray(icons) && icons.length > 0) {
        // Validate and clean
        const cleaned = icons
          .filter((ic: Record<string, unknown>) => ic.name && ic.prompt)
          .map((ic: { name: string; prompt: string }) => ({
            name: String(ic.name).toLowerCase().replace(/\s+/g, '-').slice(0, 50),
            prompt: String(ic.prompt).slice(0, 500),
          }))
          .slice(0, iconCount)

        if (cleaned.length > 0) {
          return NextResponse.json({ icons: cleaned, provider: 'llm' })
        }
      }
    } catch (llmError) {
      console.warn('[generate-pack-list] LLM failed, using fallback:', llmError)
    }

    // Fallback to hardcoded lists
    const icons = getFallbackList(theme, iconCount)
    return NextResponse.json({ icons, provider: 'fallback' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
