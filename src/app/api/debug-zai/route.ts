import { NextResponse } from 'next/server'
import { getZAIConfigStatus, getZAI } from '@/lib/zai'

export async function GET() {
  const status = getZAIConfigStatus()

  // Try to actually initialize ZAI and report result
  let initResult: { success: boolean; error?: string; method?: string } = { success: false }

  try {
    const zai = await getZAI()
    if (zai && zai.chat && zai.chat.completions) {
      initResult = { success: true, method: 'ZAI instance created successfully' }
    } else {
      initResult = { success: false, error: 'ZAI instance created but missing expected methods' }
    }
  } catch (err) {
    initResult = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return NextResponse.json({
    status,
    initResult,
    environment: process.env.VERCEL ? 'vercel' : 'local',
    nodeEnv: process.env.NODE_ENV,
  })
}
