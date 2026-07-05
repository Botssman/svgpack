/**
 * ZAI SDK Helper — initializes ZAI with env vars fallback
 *
 * Priority:
 * 1. .z-ai-config file in project dir, home dir, or /etc (SDK default)
 * 2. Environment variables: Z_AI_BASE_URL + Z_AI_API_KEY
 *    (writes a temporary .z-ai-config to cwd or /tmp)
 *
 * This allows the app to work on Vercel where .z-ai-config file doesn't exist.
 * Set these env vars on Vercel:
 *   Z_AI_BASE_URL=https://internal-api.z.ai/v1
 *   Z_AI_API_KEY=Z.ai
 *   Z_AI_CHAT_ID=chat-xxx (optional)
 *   Z_AI_USER_ID=xxx (optional)
 *   Z_AI_TOKEN=eyJ... (optional)
 */
import ZAI from 'z-ai-web-dev-sdk'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let _zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null
let _configWritten = false

function ensureConfigFile(): boolean {
  // Only write once per process
  if (_configWritten) return true

  // Check if config file already exists in any search path (SDK checks these)
  const searchPaths = [
    join(process.cwd(), '.z-ai-config'),
    join(require('os').homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ]

  for (const p of searchPaths) {
    if (existsSync(p)) {
      _configWritten = true
      return true
    }
  }

  // Try to create from env vars
  const baseUrl = process.env.Z_AI_BASE_URL
  const apiKey = process.env.Z_AI_API_KEY

  if (!baseUrl || !apiKey) return false

  try {
    const config: Record<string, string> = { baseUrl, apiKey }
    if (process.env.Z_AI_CHAT_ID) config.chatId = process.env.Z_AI_CHAT_ID
    if (process.env.Z_AI_USER_ID) config.userId = process.env.Z_AI_USER_ID
    if (process.env.Z_AI_TOKEN) config.token = process.env.Z_AI_TOKEN

    const configStr = JSON.stringify(config, null, 2)

    // Try writing to cwd first, then /tmp as fallback
    const writePaths = [
      join(process.cwd(), '.z-ai-config'),
      '/tmp/.z-ai-config',
    ]

    for (const writePath of writePaths) {
      try {
        const dir = join(writePath, '..')
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(writePath, configStr, 'utf-8')
        _configWritten = true
        console.log(`[zai] Created config at ${writePath} from env vars`)
        return true
      } catch {
        continue
      }
    }

    return false
  } catch (err) {
    console.error('[zai] Failed to create .z-ai-config from env:', err)
    return false
  }
}

export async function getZAI() {
  if (_zaiInstance) return _zaiInstance

  // Ensure config file exists (from env vars if needed)
  ensureConfigFile()

  // Now ZAI.create() should work
  _zaiInstance = await ZAI.create()
  return _zaiInstance
}
