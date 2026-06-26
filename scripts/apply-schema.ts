/**
 * Apply schema.sql to Turso via @libsql/client
 * Usage:
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... bunx tsx scripts/apply-schema.ts
 */
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

async function main() {
  const url = process.env.DATABASE_URL
  const token = process.env.DATABASE_AUTH_TOKEN
  if (!url || !token) {
    console.error('DATABASE_URL and DATABASE_AUTH_TOKEN must be set')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })
  const sql = readFileSync('/tmp/schema.sql', 'utf8')

  // Use Prisma's @libsql/client batch mode — execute multiple statements at once
  // libSQL supports executing a script with multiple statements via executeMultiple
  console.log('Applying schema to Turso (batch)...')

  // Strip SQL comments
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')

  // Split on semicolons followed by newline (end of statement)
  const statements = cleaned
    .split(/;(?=\s*\n)/)
    .map((s) => s.trim() + ';')
    .filter((s) => s !== ';' && s.length > 1)

  console.log(`Found ${statements.length} statements`)
  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 80)
      console.log(`  ✓ ${preview}...`)
    } catch (e: any) {
      // "already exists" is OK — idempotent re-apply
      if (e.message.includes('already exists')) {
        console.log(`  ⊙ skip (already exists): ${stmt.replace(/\s+/g, ' ').slice(0, 60)}...`)
        continue
      }
      console.error(`  ✗ FAIL: ${e.message}`)
      console.error(`    statement: ${stmt.slice(0, 200)}`)
      throw e
    }
  }
  console.log('Schema applied successfully.')

  // Verify
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  )
  console.log('\nTables in Turso:')
  for (const row of tables.rows) {
    console.log('  -', (row as any).name)
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
