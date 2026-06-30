/**
 * Prisma-based seed — works with both local SQLite and Turso (via Prisma adapter).
 * Used by auto-seed and by the admin seed API endpoint.
 */
import { db } from './db'
import { PACKS } from './packs-data'
import bcrypt from 'bcryptjs'

async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(pw, salt)
}

export async function seedWithPrisma(): Promise<{
  packs: number
  icons: number
  users: number
}> {
  console.log('[seed] Starting Prisma seed...')

  // 1. Upsert users
  const adminHash = await hashPassword('admin123')
  await db.user.upsert({
    where: { email: 'admin@iconhub.test' },
    update: { role: 'admin', credits: 1000, passwordHash: adminHash },
    create: {
      email: 'admin@iconhub.test',
      name: 'Admin',
      role: 'admin',
      credits: 1000,
      passwordHash: adminHash,
    },
  })

  const modHash = await hashPassword('moderator123')
  await db.user.upsert({
    where: { email: 'moderator@iconhub.test' },
    update: { role: 'moderator', credits: 100, passwordHash: modHash },
    create: {
      email: 'moderator@iconhub.test',
      name: 'Moderator',
      role: 'moderator',
      credits: 100,
      passwordHash: modHash,
    },
  })

  const demoHash = await hashPassword('demo123')
  await db.user.upsert({
    where: { email: 'demo@iconhub.test' },
    update: { name: 'Demo User', passwordHash: demoHash },
    create: {
      email: 'demo@iconhub.test',
      name: 'Demo User',
      role: 'user',
      credits: 30,
      passwordHash: demoHash,
    },
  })
  console.log('[seed] ✓ Users upserted (3)')

  // 2. Clean old packs/icons
  await db.customPackIcon.deleteMany()
  await db.customIcon.deleteMany()
  await db.customPack.deleteMany()
  await db.icon.deleteMany()
  await db.pack.deleteMany()
  console.log('[seed] ✓ Old packs/icons cleaned')

  // 3. Insert packs + icons
  let iconCount = 0
  for (const pack of PACKS) {
    await db.pack.create({
      data: {
        slug: pack.slug,
        nameRu: pack.nameRu,
        nameEn: pack.nameEn,
        descRu: pack.descRu,
        descEn: pack.descEn,
        category: pack.category,
        style: pack.style,
        tags: pack.tags,
        priceCredits: pack.priceCredits,
        isFree: pack.isFree,
        icons: {
          create: pack.icons.map((ic) => ({
            slug: ic.slug,
            nameRu: ic.nameRu,
            nameEn: ic.nameEn,
            keywords: ic.keywords,
            svg: ic.svg,
            viewBox: '0 0 24 24',
          })),
        },
      },
    })
    iconCount += pack.icons.length
    console.log(`[seed] ✓ Pack "${pack.slug}" — ${pack.icons.length} icons`)
  }

  console.log(`[seed] ✅ Done: ${PACKS.length} packs, ${iconCount} icons, 3 users`)
  return { packs: PACKS.length, icons: iconCount, users: 3 }
}

/**
 * Auto-seed: check if DB is empty and seed if needed.
 * Safe to call on every cold start — only seeds once.
 */
let autoSeeded = false

export async function autoSeed(): Promise<void> {
  if (autoSeeded) return
  autoSeeded = true

  try {
    const packCount = await db.pack.count()
    if (packCount > 0) {
      console.log(`[auto-seed] DB already has ${packCount} packs, skipping`)
      return
    }
    console.log('[auto-seed] DB is empty, seeding...')
    await seedWithPrisma()
  } catch (e) {
    console.error('[auto-seed] Failed:', e)
  }
}
