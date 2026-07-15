import { NextRequest, NextResponse } from 'next/server'

/**
 * Diagnostic endpoint — tests Figma API directly from server.
 * Usage: GET /api/admin/figma-test?figmaToken=xxx&fileKey=yyy
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const figmaToken = searchParams.get('figmaToken')
  const fileKey = searchParams.get('fileKey')

  if (!figmaToken) {
    return NextResponse.json({ error: 'figmaToken required' }, { status: 400 })
  }

  const results: Record<string, any> = {}

  // Test 1: /v1/me
  try {
    const meRes = await fetch('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': figmaToken },
    })
    results.me = {
      status: meRes.status,
      ok: meRes.ok,
      headers: Object.fromEntries(meRes.headers.entries()),
      data: meRes.ok ? await meRes.json() : await meRes.text().then(t => t.substring(0, 200)),
    }
  } catch (e: any) {
    results.me = { error: e.message }
  }

  // Test 2: /v1/files/{key}?depth=1 (if fileKey provided)
  if (fileKey) {
    try {
      const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
        headers: { 'X-Figma-Token': figmaToken },
      })
      results.file_depth1 = {
        status: fileRes.status,
        ok: fileRes.ok,
        headers: Object.fromEntries(fileRes.headers.entries()),
        data: fileRes.ok
          ? await fileRes.json().then(d => ({ name: d.name, lastModified: d.lastModified }))
          : await fileRes.text().then(t => t.substring(0, 300)),
      }
    } catch (e: any) {
      results.file_depth1 = { error: e.message }
    }
  }

  // Test 3: /v1/files/{key}/nodes?ids=0:0 (lighter alternative)
  if (fileKey) {
    try {
      const nodesRes = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=0:0`, {
        headers: { 'X-Figma-Token': figmaToken },
      })
      results.nodes = {
        status: nodesRes.status,
        ok: nodesRes.ok,
        headers: Object.fromEntries(nodesRes.headers.entries()),
        data: await nodesRes.text().then(t => t.substring(0, 300)),
      }
    } catch (e: any) {
      results.nodes = { error: e.message }
    }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
