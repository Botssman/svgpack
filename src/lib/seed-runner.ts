/**
 * Shared seed runner — used by both CLI (scripts/seed-turso.ts) and
 * HTTP-triggered route (src/app/api/admin/seed/route.ts).
 */
import type { Client } from '@libsql/client'
import { PACKS } from './packs-data'

function rid() {
  return 'c' + Math.random().toString(36).slice(2, 14) + Date.now().toString(36).slice(-4)
}

export async function seedDatabase(client: Client): Promise<{
  packs: number
  icons: number
  log: string[]
}> {
  const log: string[] = []
  const emit = (s: string) => {
    console.log(s)
    log.push(s)
  }

  emit('Seeding Turso...')

  // 1. Upsert users
  await client.execute({
    sql: `INSERT INTO User (id, email, name, role, credits, createdAt, updatedAt)
          VALUES (?, 'admin@iconhub.test', 'Admin', 'admin', 1000, datetime('now'), datetime('now'))
          ON CONFLICT(email) DO UPDATE SET role='admin', credits=1000, updatedAt=datetime('now')`,
    args: [rid()],
  })
  await client.execute({
    sql: `INSERT INTO User (id, email, name, role, credits, createdAt, updatedAt)
          VALUES (?, 'demo@iconhub.test', 'Demo User', 'user', 30, datetime('now'), datetime('now'))
          ON CONFLICT(email) DO UPDATE SET name='Demo User', updatedAt=datetime('now')`,
    args: [rid()],
  })
  emit('  ✓ Users upserted')

  // 2. Clean packs/icons (CASCADE should remove icons automatically)
  await client.execute('DELETE FROM CustomPackIcon')
  await client.execute('DELETE FROM CustomIcon')
  await client.execute('DELETE FROM CustomPack')
  await client.execute('DELETE FROM Icon')
  await client.execute('DELETE FROM Pack')
  emit('  ✓ Old packs/icons cleaned')

  // 3. Insert packs + icons
  let iconCount = 0
  for (const pack of PACKS) {
    const packId = rid()
    await client.execute({
      sql: `INSERT INTO Pack (id, slug, nameRu, nameEn, descRu, descEn, category, style, tags, priceCredits, isFree, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [packId, pack.slug, pack.nameRu, pack.nameEn, pack.descRu, pack.descEn,
             pack.category, pack.style, pack.tags, pack.priceCredits, pack.isFree ? 1 : 0],
    })
    for (const ic of pack.icons) {
      await client.execute({
        sql: `INSERT INTO Icon (id, packId, slug, nameRu, nameEn, keywords, svg, viewBox, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, '0 0 24 24', datetime('now'))`,
        args: [rid(), packId, ic.slug, ic.nameRu, ic.nameEn, ic.keywords, ic.svg],
      })
      iconCount++
    }
    emit(`  ✓ Pack "${pack.slug}" with ${pack.icons.length} icons`)
  }

  emit(`\n✓ Done: ${PACKS.length} packs, ${iconCount} icons, 2 users`)
  return { packs: PACKS.length, icons: iconCount, log }
}
