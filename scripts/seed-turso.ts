/**
 * CLI seed — used locally to seed a Turso database.
 * For Vercel HTTP-triggered seeding, see src/app/api/admin/seed/route.ts.
 *
 * Usage:
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... bunx tsx scripts/seed-turso.ts
 *
 * Idempotent: safe to re-run — wipes icon/pack tables, upserts users.
 */
import { createClient } from '@libsql/client'
import { seedDatabase } from '../src/lib/seed-runner'

async function main() {
  const url = process.env.DATABASE_URL
  const token = process.env.DATABASE_AUTH_TOKEN
  if (!url || !token) {
    console.error('DATABASE_URL and DATABASE_AUTH_TOKEN must be set')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })
  try {
    const result = await seedDatabase(client)
    console.log(`\nSeed complete: ${result.packs} packs, ${result.icons} icons`)
  } finally {
    await client.close()
  }
}

main().catch((e) => {
  console.error('FAIL:', e.message)
  console.error(e)
  process.exit(1)
})
