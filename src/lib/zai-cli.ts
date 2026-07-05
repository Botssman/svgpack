/**
 * Z AI Helper — unified API for calling Z AI chat completions
 *
 * Strategy:
 * - On this machine (Z AI workspace): use `z-ai` CLI tool
 *   because fetch() to internal-api.z.ai crashes the Node.js process here
 * - On Vercel (serverless): use the Z AI SDK via getZAI()
 *
 * The CLI approach writes prompts to temp files and reads output from a temp file
 * to avoid shell escaping issues with long/multiline content.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync, mkdtempSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getZAI } from './zai'

const execFileAsync = promisify(execFile)

export interface ZAIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ZAIChatResult {
  content: string
  model: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

let _hasCli: boolean | null = null

async function hasZaiCli(): Promise<boolean> {
  if (_hasCli !== null) return _hasCli
  try {
    await execFileAsync('which', ['z-ai'], { timeout: 3000 })
    _hasCli = true
  } catch {
    _hasCli = false
  }
  return _hasCli
}

/**
 * Call Z AI chat completions — automatically picks the best method
 */
export async function zaiChatCompletion(
  messages: ZAIChatMessage[]
): Promise<ZAIChatResult> {
  if (await hasZaiCli()) {
    return zaiChatViaCli(messages)
  }
  return zaiChatViaSdk(messages)
}

/**
 * Call Z AI via CLI tool — uses temp files for prompts
 */
async function zaiChatViaCli(messages: ZAIChatMessage[]): Promise<ZAIChatResult> {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()
  if (!lastUserMsg) throw new Error('No user message provided')

  const systemMsg = messages.find(m => m.role === 'system')

  // Create temp directory for I/O
  const tmpDir = mkdtempSync(join(tmpdir(), 'zai-'))
  const promptFile = join(tmpDir, 'prompt.txt')
  const systemFile = systemMsg ? join(tmpDir, 'system.txt') : null
  const outputFile = join(tmpDir, 'output.json')

  try {
    // Write prompts to files
    writeFileSync(promptFile, lastUserMsg.content, 'utf-8')
    if (systemMsg && systemFile) {
      writeFileSync(systemFile, systemMsg.content, 'utf-8')
    }

    // Read file contents for CLI args
    const promptText = readFileSync(promptFile, 'utf-8')
    const systemText = systemFile ? readFileSync(systemFile, 'utf-8') : undefined

    // Build command args
    const args: string[] = ['chat', '--prompt', promptText]
    if (systemText) {
      args.push('--system', systemText)
    }
    args.push('--output', outputFile)

    // Execute CLI — use detached: false and don't pipe stdin to avoid process issues
    await execFileAsync('z-ai', args, {
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024, // 2MB
      env: { ...process.env },
    })

    // Read output JSON
    const outputStr = readFileSync(outputFile, 'utf-8')
    const result = JSON.parse(outputStr)
    const choice = result.choices?.[0]

    if (!choice?.message?.content) {
      throw new Error('Empty response from Z AI CLI')
    }

    return {
      content: choice.message.content,
      model: result.model || 'unknown',
      usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  } finally {
    // Cleanup temp files
    try { unlinkSync(promptFile) } catch {}
    try { if (systemFile) unlinkSync(systemFile) } catch {}
    try { unlinkSync(outputFile) } catch {}
    try { unlinkSync(tmpDir) } catch {}
  }
}

/**
 * Call Z AI via SDK — used on Vercel (with proxy or direct access)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function zaiChatViaSdk(messages: ZAIChatMessage[]): Promise<ZAIChatResult> {
  const zai = await getZAI()

  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  })

  const content = completion.choices?.[0]?.message?.content || ''

  return {
    content,
    model: completion.model || 'unknown',
    usage: completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}
