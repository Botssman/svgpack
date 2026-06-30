import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/migrate — добавляет недостающие колонки в Turso БД
// Вызывается вручную после деплоя или автоматически при 500 ошибке
export async function POST() {
  const results: string[] = []

  try {
    // Проверяем и добавляем колонки, которые могут отсутствовать в Turso

    // Pack: category, style, tags, priceCredits, isFree, SEO fields
    const packColumns = [
      { name: 'category', sql: 'ALTER TABLE Pack ADD COLUMN category TEXT NOT NULL DEFAULT \'web\'' },
      { name: 'style', sql: 'ALTER TABLE Pack ADD COLUMN style TEXT NOT NULL DEFAULT \'outline\'' },
      { name: 'tags', sql: 'ALTER TABLE Pack ADD COLUMN tags TEXT NOT NULL DEFAULT \'\'' },
      { name: 'priceCredits', sql: 'ALTER TABLE Pack ADD COLUMN priceCredits INTEGER NOT NULL DEFAULT 10' },
      { name: 'isFree', sql: 'ALTER TABLE Pack ADD COLUMN isFree BOOLEAN NOT NULL DEFAULT 1' },
      { name: 'seoTitleRu', sql: 'ALTER TABLE Pack ADD COLUMN seoTitleRu TEXT' },
      { name: 'seoTitleEn', sql: 'ALTER TABLE Pack ADD COLUMN seoTitleEn TEXT' },
      { name: 'seoDescRu', sql: 'ALTER TABLE Pack ADD COLUMN seoDescRu TEXT' },
      { name: 'seoDescEn', sql: 'ALTER TABLE Pack ADD COLUMN seoDescEn TEXT' },
      { name: 'seoTextRu', sql: 'ALTER TABLE Pack ADD COLUMN seoTextRu TEXT' },
      { name: 'seoTextEn', sql: 'ALTER TABLE Pack ADD COLUMN seoTextEn TEXT' },
    ]

    // User: freeBuildsUsed, freeBuildsResetAt
    const userColumns = [
      { name: 'freeBuildsUsed', sql: 'ALTER TABLE User ADD COLUMN freeBuildsUsed INTEGER NOT NULL DEFAULT 0' },
      { name: 'freeBuildsResetAt', sql: 'ALTER TABLE User ADD COLUMN freeBuildsResetAt DATETIME' },
    ]

    // Icon: viewBox
    const iconColumns = [
      { name: 'viewBox', sql: 'ALTER TABLE Icon ADD COLUMN viewBox TEXT NOT NULL DEFAULT \'0 0 24 24\'' },
    ]

    // CustomPack: basePackId
    const customPackColumns = [
      { name: 'basePackId', sql: 'ALTER TABLE CustomPack ADD COLUMN basePackId TEXT' },
    ]

    // CustomIcon: basePackId
    const customIconColumns = [
      { name: 'basePackId', sql: 'ALTER TABLE CustomIcon ADD COLUMN basePackId TEXT' },
    ]

    const allColumns = [
      ...packColumns.map(c => ({ ...c, table: 'Pack' })),
      ...userColumns.map(c => ({ ...c, table: 'User' })),
      ...iconColumns.map(c => ({ ...c, table: 'Icon' })),
      ...customPackColumns.map(c => ({ ...c, table: 'CustomPack' })),
      ...customIconColumns.map(c => ({ ...c, table: 'CustomIcon' })),
    ]

    for (const col of allColumns) {
      try {
        await db.$executeRawUnsafe(col.sql)
        results.push(`✓ ${col.table}.${col.name} — added`)
      } catch (e: any) {
        if (e?.message?.includes('duplicate column') || e?.message?.includes('already exists')) {
          results.push(`· ${col.table}.${col.name} — already exists`)
        } else {
          results.push(`✗ ${col.table}.${col.name} — ${e?.message || 'error'}`)
        }
      }
    }

    // Создаём таблицы если их нет
    const tables = [
      {
        name: 'CustomPack',
        sql: `CREATE TABLE IF NOT EXISTS CustomPack (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          basePackId TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (basePackId) REFERENCES Pack(id) ON DELETE SET NULL
        )`,
      },
      {
        name: 'CustomIcon',
        sql: `CREATE TABLE IF NOT EXISTS CustomIcon (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          baseIconId TEXT,
          basePackId TEXT,
          name TEXT NOT NULL,
          config TEXT NOT NULL,
          svgSnapshot TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (baseIconId) REFERENCES Icon(id) ON DELETE SET NULL,
          FOREIGN KEY (basePackId) REFERENCES Pack(id) ON DELETE SET NULL
        )`,
      },
      {
        name: 'CustomPackIcon',
        sql: `CREATE TABLE IF NOT EXISTS CustomPackIcon (
          id TEXT PRIMARY KEY NOT NULL,
          customPackId TEXT NOT NULL,
          customIconId TEXT,
          baseIconId TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (customPackId) REFERENCES CustomPack(id) ON DELETE CASCADE,
          FOREIGN KEY (customIconId) REFERENCES CustomIcon(id) ON DELETE CASCADE
        )`,
      },
      {
        name: 'UserPalette',
        sql: `CREATE TABLE IF NOT EXISTS UserPalette (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          nameRu TEXT NOT NULL,
          nameEn TEXT NOT NULL,
          color1 TEXT NOT NULL,
          color2 TEXT NOT NULL,
          bgColor1 TEXT NOT NULL DEFAULT '#F1F5F9',
          bgColor2 TEXT NOT NULL DEFAULT '#F1F5F9',
          isGradient BOOLEAN NOT NULL DEFAULT 0,
          isBgGradient BOOLEAN NOT NULL DEFAULT 0,
          gradientAngle INTEGER NOT NULL DEFAULT 135,
          mode TEXT NOT NULL DEFAULT 'mono',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        )`,
      },
    ]

    for (const table of tables) {
      try {
        await db.$executeRawUnsafe(table.sql)
        results.push(`✓ Table ${table.name} — created/exists`)
      } catch (e: any) {
        results.push(`✗ Table ${table.name} — ${e?.message || 'error'}`)
      }
    }

  } catch (e: any) {
    results.push(`FATAL: ${e?.message || 'unknown error'}`)
  }

  return NextResponse.json({ results })
}
