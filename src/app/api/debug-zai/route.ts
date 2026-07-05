import { NextResponse } from 'next/server'
import { getZAIConfigStatus, getZAI } from '@/lib/zai'

export const dynamic = 'force-dynamic'

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

  // Detailed env var check (mask sensitive values)
  const envCheck = {
    Z_AI_BASE_URL: process.env.Z_AI_BASE_URL
      ? `SET (${process.env.Z_AI_BASE_URL.length} chars, starts: ${process.env.Z_AI_BASE_URL.substring(0, 20)}...)`
      : 'NOT SET',
    Z_AI_API_KEY: process.env.Z_AI_API_KEY
      ? `SET (${process.env.Z_AI_API_KEY.length} chars)`
      : 'NOT SET',
    Z_AI_TOKEN: process.env.Z_AI_TOKEN
      ? `SET (${process.env.Z_AI_TOKEN.length} chars)`
      : 'NOT SET',
    Z_AI_CHAT_ID: process.env.Z_AI_CHAT_ID
      ? `SET (${process.env.Z_AI_CHAT_ID.length} chars, starts: ${process.env.Z_AI_CHAT_ID.substring(0, 10)}...)`
      : 'NOT SET',
    Z_AI_USER_ID: process.env.Z_AI_USER_ID
      ? `SET (${process.env.Z_AI_USER_ID.length} chars)`
      : 'NOT SET',
  }

  return NextResponse.json({
    status,
    initResult,
    envCheck,
    isVercel: !!process.env.VERCEL,
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    nodeEnv: process.env.NODE_ENV,
    cwd: typeof process.cwd === 'function' ? process.cwd() : 'unavailable',
  })
}
