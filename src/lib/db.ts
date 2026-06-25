import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Look for a libsql URL in DIRECT_DATABASE_URL first (Turso cloud runtime),
  // then in DATABASE_URL. The latter also has to satisfy Prisma's env-var
  // validation (must be file: for sqlite) — so on Turso we keep DATABASE_URL
  // = "file:/dev/null" and pass the real URL via DIRECT_DATABASE_URL.
  const directUrl = process.env.DIRECT_DATABASE_URL ?? ''
  const url = process.env.DATABASE_URL ?? ''

  const libsqlUrl =
    directUrl.startsWith('libsql://') || directUrl.startsWith('http') ? directUrl
    : url.startsWith('libsql://') || url.startsWith('http') ? url
    : ''

  if (libsqlUrl) {
    const libsql = createClient({
      url: libsqlUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    } as never)
  }

  // Local dev: plain SQLite file
  return new PrismaClient({ log: ['error', 'warn'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
