// Quick inspector: dump Pack table columns from SQLite.
// Run: node scripts/check-pack-schema.js
const { createClient } = require('@libsql/client')

async function main() {
  const client = createClient({ url: 'file:db/custom.db' })
  const res = await client.execute('PRAGMA table_info(Pack);')
  console.log('Pack columns:')
  for (const row of res.rows) {
    console.log('  -', row.name, '::', row.type)
  }
  // also count rows so we know seed ran
  const c = await client.execute('SELECT COUNT(*) as n FROM Pack;')
  console.log('Pack row count:', c.rows[0].n)
}

main().catch((e) => { console.error(e); process.exit(1) })
