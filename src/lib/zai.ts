/**
 * ZAI SDK Helper — initializes ZAI with env vars (Vercel) or config file (local)
 *
 * Priority on Vercel (serverless, no filesystem):
 *   1. Environment variables → direct constructor call
 *   2. ZAI.create() — reads .z-ai-config from filesystem (local dev)
 *
 * Required env vars:
 *   Z_AI_BASE_URL=https://internal-api.z.ai/v1
 *   Z_AI_API_KEY=Z.ai
 *   Z_AI_TOKEN=eyJ... (optional)
 *   Z_AI_CHAT_ID=chat-xxx (optional)
 *   Z_AI_USER_ID=xxx (optional)
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

    // Call constructor directly — works at runtime even though TS says it's private
    // The JS constructor just does: this.config = config — no side effects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _zaiInstance = new (ZAI as any)(config)
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

  const envVarsReady = hasBaseUrl && hasApiKey
  const configFileExists = false // We don't check filesystem to avoid issues

  return {
    envVars: {
      Z_AI_BASE_URL: hasBaseUrl,
      Z_AI_API_KEY: hasApiKey,
      Z_AI_CHAT_ID: hasChatId,
      Z_AI_USER_ID: hasUserId,
      Z_AI_TOKEN: hasToken,
      ready: envVarsReady,
    },
    configFile: {
      exists: configFileExists,
    },
    initialized: !!_zaiInstance,
    method: _zaiInstance
      ? 'already initialized'
      : envVarsReady
        ? 'will use env vars'
        : 'will try config file',
  }
}
