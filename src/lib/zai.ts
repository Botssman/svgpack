/**
 * ZAI SDK Helper — initializes ZAI with env vars or config file
 *
 * On Vercel (serverless), the filesystem is read-only, so ZAI.create()
 * fails because .z-ai-config doesn't exist. This helper works around it
 * by calling the ZAI constructor directly with config from env vars.
 *
 * Priority:
 * 1. Cached instance (singleton)
 * 2. ZAI.create() — reads .z-ai-config from filesystem
 * 3. new ZAI(config) — from environment variables
 *
 * Set these env vars on Vercel:
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

  // 1. Try SDK default (reads .z-ai-config from filesystem)
  try {
    _zaiInstance = await ZAI.create()
    return _zaiInstance
  } catch {
    // Config file not found — try env vars
  }

  // 2. Create from environment variables
  const baseUrl = process.env.Z_AI_BASE_URL
  const apiKey = process.env.Z_AI_API_KEY

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Z AI config missing. Set Z_AI_BASE_URL and Z_AI_API_KEY env vars, or create .z-ai-config file.'
    )
  }

  // Build config object
  const config: Record<string, string> = { baseUrl, apiKey }
  if (process.env.Z_AI_CHAT_ID) config.chatId = process.env.Z_AI_CHAT_ID
  if (process.env.Z_AI_USER_ID) config.userId = process.env.Z_AI_USER_ID
  if (process.env.Z_AI_TOKEN) config.token = process.env.Z_AI_TOKEN

  // Call constructor directly — works at runtime even though TS says it's private
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _zaiInstance = new (ZAI as any)(config)
  console.log('[zai] Initialized from environment variables')
  return _zaiInstance
}
