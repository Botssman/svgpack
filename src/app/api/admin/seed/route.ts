import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { seedDatabase } from '@/lib/seed-runner'

/**
 * POST /api/admin/seed — re-seeds the Turso database with the canonical
 * packs + icons defined in scripts/packs-data.ts.
 *
 * This route runs ON the Vercel serverless function, so it has direct
 * access to DATABASE_URL and DATABASE_AUTH_TOKEN env vars (no need to
 * expose them to the client).
 *
 * Idempotent: safe to call multiple times. Wipes icon/pack tables and
 * re-inserts. Users (admin, demo) are upserted.
 *
 * For safety, requires a header `x-admin-token` matching
 * env.ADMIN_SEED_TOKEN (or `?token=...` query param). If ADMIN_SEED_TOKEN
 * is not set, the endpoint refuses to run.
 */
export async function POST(req: NextRequest) {
  try {
    const adminToken = process.env.ADMIN_SEED_TOKEN
    if (!adminToken) {
      return NextResponse.json(
        { error: 'ADMIN_SEED_TOKEN env var is not set — seeding via HTTP is disabled.' },
        { status: 403 },
      )
    }

    const url = new URL(req.url)
    const providedToken =
      req.headers.get('x-admin-token') || url.searchParams.get('token') || ''

    if (providedToken !== adminToken) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    const dbUrl = process.env.DATABASE_URL
    const dbToken = process.env.DATABASE_AUTH_TOKEN
    if (!dbUrl || !dbToken) {
      return NextResponse.json(
        { error: 'DATABASE_URL or DATABASE_AUTH_TOKEN not set on server' },
        { status: 500 },
      )
    }

    const client = createClient({ url: dbUrl, authToken: dbToken })
    try {
      const result = await seedDatabase(client)
      return NextResponse.json({
        ok: true,
        packs: result.packs,
        icons: result.icons,
        log: result.log,
      })
    } finally {
      await client.close()
    }
  } catch (e: any) {
    console.error('[/api/admin/seed] ERROR:', e?.message || e)
    console.error('[/api/admin/seed] STACK:', e?.stack)
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error', stack: e?.stack },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Seed endpoint is active. Send POST with x-admin-token header or ?token=... to seed.',
    requiresAdminToken: !!process.env.ADMIN_SEED_TOKEN,
  })
}
