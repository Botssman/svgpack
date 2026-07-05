/**
 * Z AI Proxy — forwards requests from Vercel to internal-api.z.ai
 *
 * Flow: svgpack.vercel.app → preview-xxx.space-z.ai/api/zai-proxy → internal-api.z.ai
 *
 * This machine is on the Aliyun network and CAN reach internal-api.z.ai.
 * Vercel (AWS) CANNOT reach it (private IPs 172.25.x.x).
 *
 * Security: X-Proxy-Secret header must match ZAI_PROXY_SECRET env var
 */
import { NextRequest, NextResponse } from 'next/server'

const INTERNAL_API = 'https://internal-api.z.ai/v1'
const PROXY_SECRET = process.env.ZAI_PROXY_SECRET || ''

// Read Z AI credentials from the config file (available on this machine)
function getZaiCredentials() {
  // These are set in .env or available via the z-ai-config file
  return {
    apiKey: process.env.Z_AI_API_KEY || 'Z.ai',
    chatId: process.env.Z_AI_CHAT_ID || '',
    token: process.env.Z_AI_TOKEN || '',
    userId: process.env.Z_AI_USER_ID || '',
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Validate proxy secret
  if (PROXY_SECRET) {
    const proxyAuth = req.headers.get('x-proxy-secret')
    if (proxyAuth !== PROXY_SECRET) {
      console.warn('[zai-proxy] Unauthorized - invalid proxy secret')
      return NextResponse.json({ error: 'Proxy unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await req.text()
    const creds = getZaiCredentials()

    // Build headers for internal API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
      'X-Z-AI-From': 'Z',
    }
    if (creds.chatId) headers['X-Chat-Id'] = creds.chatId
    if (creds.token) headers['X-Token'] = creds.token
    if (creds.userId) headers['X-User-Id'] = creds.userId

    const targetUrl = `${INTERNAL_API}/chat/completions`

    console.log(`[zai-proxy] POST → ${targetUrl}`)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(55000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[zai-proxy] API returned ${response.status}: ${errorText.substring(0, 200)}`)
      return NextResponse.json(
        { error: `API error ${response.status}: ${errorText.substring(0, 500)}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const isStream = contentType.includes('text/event-stream') || contentType.includes('text/plain')

    if (isStream && response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    const data = await response.text()
    console.log(`[zai-proxy] ← ${response.status} (${data.length} bytes)`)

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': contentType || 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[zai-proxy] Error:', msg)
    return NextResponse.json({ error: `Proxy failed: ${msg}` }, { status: 502 })
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Chat-Id, X-Token, X-User-Id, X-Z-AI-From, X-Proxy-Secret',
    },
  })
}
