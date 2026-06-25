import { NextResponse } from 'next/server'

// GET /api/health — simple health check, no DB
export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasToken: !!process.env.DATABASE_AUTH_TOKEN,
      dbUrlPrefix: (process.env.DATABASE_URL || '').slice(0, 30),
      nodeEnv: process.env.NODE_ENV,
    },
  })
}
