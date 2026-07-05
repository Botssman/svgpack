/**
 * ZAI SDK Helper — initializes ZAI with env vars (Vercel) or config file (local)
 *
 * On Vercel: uses proxy URL (Z_AI_BASE_URL → our proxy → internal-api.z.ai)
 * Locally: reads .z-ai-config file directly
 *
 * Required env vars on Vercel:
 *   Z_AI_BASE_URL=https://preview-xxx.space-z.ai/api/zai-proxy  (proxy URL)
 *   Z_AI_API_KEY=Z.ai
 *   ZAI_PROXY_SECRET=xxx  (shared secret with the proxy)
 *   Z_AI_TOKEN=eyJ...
 *   Z_AI_CHAT_ID=chat-xxx
 *   Z_AI_USER_ID=xxx
 */
import ZAI from 'z-ai-web-dev-sdk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _zaiInstance: any = null

export async function getZAI() {
  if (_zaiInstance) return _zaiInstance

  // 1. Check env vars FIRST — this is the reliable path on Vercel
  const baseUrl = process.env.Z_AI_BASE_URL
  const apiKey = process.env.Z_AI_API_KEY

  if (baseUrl && apiKey) {
    const config: Record<string, string> = { baseUrl, apiKey }
    if (process.env.Z_AI_CHAT_ID) config.chatId = process.env.Z_AI_CHAT_ID
    if (process.env.Z_AI_USER_ID) config.userId = process.env.Z_AI_USER_ID
    if (process.env.Z_AI_TOKEN) config.token = process.env.Z_AI_TOKEN

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _zaiInstance = new (ZAI as any)(config)

    // If using proxy, monkey-patch fetch to add X-Proxy-Secret header
    const proxySecret = process.env.ZAI_PROXY_SECRET
    if (proxySecret && baseUrl.includes('/api/zai-proxy')) {
      console.log('[zai] 🔒 Proxy mode detected, adding X-Proxy-Secret to all requests')
      const originalCreate = _zaiInstance.chat.completions.create.bind(_zaiInstance)
      _zaiInstance.chat.completions.create = async (body: any) => {
        // The SDK uses global fetch — we need to intercept it
        // Instead, we'll use a custom approach: directly call fetch with the proxy secret
        const { baseUrl: bUrl, chatId, userId, apiKey: aKey, token } = _zaiInstance.config
        const url = `${bUrl}/chat/completions`
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aKey}`,
          'X-Z-AI-From': 'Z',
          'X-Proxy-Secret': proxySecret,
        }
        if (chatId) headers['X-Chat-Id'] = chatId
        if (userId) headers['X-User-Id'] = userId
        if (token) headers['X-Token'] = token

        const requestBody = { ...body, thinking: body.thinking || { type: 'disabled' } }
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        })
        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`API request failed with status ${response.status}: ${errorBody}`)
        }
        const contentType = response.headers.get('content-type') || ''
        if (requestBody.stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
          return response.body
        }
        return await response.json()
      }
    }

    console.log('[zai] ✅ Initialized from environment variables (baseUrl:', baseUrl + ')')
    return _zaiInstance
  }

  // 2. Try SDK default (reads .z-ai-config from filesystem — works locally)
  try {
    _zaiInstance = await ZAI.create()
    console.log('[zai] ✅ Initialized from .z-ai-config file')
    return _zaiInstance
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[zai] ⚠️ ZAI.create() failed:', msg)
  }

  // 3. Neither env vars nor config file
  throw new Error(
    'Z AI config missing. Set Z_AI_BASE_URL and Z_AI_API_KEY env vars on Vercel, ' +
    'or create .z-ai-config file for local development.'
  )
}

/**
 * Check Z AI configuration status — useful for debugging
 */
export function getZAIConfigStatus() {
  const hasBaseUrl = !!process.env.Z_AI_BASE_URL
  const hasApiKey = !!process.env.Z_AI_API_KEY
  const hasChatId = !!process.env.Z_AI_CHAT_ID
  const hasUserId = !!process.env.Z_AI_USER_ID
  const hasToken = !!process.env.Z_AI_TOKEN
  const hasProxySecret = !!process.env.ZAI_PROXY_SECRET
  const isProxyMode = !!(process.env.Z_AI_BASE_URL || '').includes('/api/zai-proxy')

  const envVarsReady = hasBaseUrl && hasApiKey

  return {
    envVars: {
      Z_AI_BASE_URL: hasBaseUrl,
      Z_AI_API_KEY: hasApiKey,
      Z_AI_CHAT_ID: hasChatId,
      Z_AI_USER_ID: hasUserId,
      Z_AI_TOKEN: hasToken,
      ZAI_PROXY_SECRET: hasProxySecret,
      ready: envVarsReady,
    },
    proxyMode: isProxyMode,
    initialized: !!_zaiInstance,
    method: _zaiInstance
      ? 'already initialized'
      : envVarsReady
        ? isProxyMode ? 'will use proxy' : 'will use direct'
        : 'will try config file',
  }
}
