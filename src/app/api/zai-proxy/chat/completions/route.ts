/**
 * Z AI Proxy — forwards /api/zai-proxy/chat/completions to internal-api.z.ai
 *
 * This machine has access to internal-api.z.ai (private Aliyun network).
 * Vercel does NOT have access. So we proxy through here.
 *
 * Flow: Vercel → preview URL → this route → internal-api.z.ai
 *
 * Security: X-Proxy-Secret header must match ZAI_PROXY_SECRET env var
 */
import { NextRequest, NextResponse } from 'next/server'

const INTERNAL_API = 'https://internal-api.z.ai/v1'
const PROXY_SECRET = process.env.ZAI_PROXY_SECRET || ''

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Validate proxy secret
  if (PROXY_SECRET) {
    const proxyAuth = req.headers.get('x-proxy-secret')
    if (proxyAuth !== PROXY_SECRET) {
      return NextResponse.json({ error: 'Proxy unauthorized' }, { status: 401 })
    }
  }

  try {
    // Read request body
    const body = await req.text()

    // Forward headers
    const headers: Record<string, string> = {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      'Authorization': req.headers.get('authorization') || '',
      'X-Z-AI-From': req.headers.get('x-z-ai-from') || 'Z',
    }
    const xChatId = req.headers.get('x-chat-id')
    const xToken = req.headers.get('x-token')
    const xUserId = req.headers.get('x-user-id')
    if (xChatId) headers['X-Chat-Id'] = xChatId
    if (xToken) headers['X-Token'] = xToken
    if (xUserId) headers['X-User-Id'] = xUserId

    const targetUrl = `${INTERNAL_API}/chat/completions`

    console.log(`[zai-proxy] POST → ${targetUrl}`)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(55000),
    })

    const contentType = response.headers.get('content-type') || ''
    const isStream = contentType.includes('text/event-stream') || contentType.includes('text/plain')

    if (isStream && response.body) {
      // Stream response back
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Regular response
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

// Handle CORS preflight
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
