/**
 * Import Tabler Icons into the IconPack Hub database.
 *
 * Groups Tabler icons by category, creates one outline Pack + one filled Pack
 * per category. Each icon's SVG body (paths, no wrapper) is stored in the
 * Icon.svg field, matching the existing schema.
 *
 * Tabler icons use viewBox "0 0 24 24" and stroke="currentColor" (outline)
 * or fill="currentColor" (filled) — compatible with our customizer.
 *
 * Run:  npx tsx scripts/import-tabler.ts
 *
 * Source: https://github.com/tabler/tabler-icons  (MIT License)
 */

import { db } from '../src/lib/db'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ──────────────────────────────────────────────────────
const TABLER_DIR = '/home/z/my-project/tabler-icons'
const OUTLINE_DIR = path.join(TABLER_DIR, 'icons/outline')
const FILLED_DIR = path.join(TABLER_DIR, 'icons/filled')

// Mapping Tabler categories → our Pack categories
// We merge some small Tabler categories into bigger ones
const CATEGORY_MAP: Record<string, string> = {
  'Brand':           'brands',
  'Development':     'tools',
  'Version control': 'tools',
  'Database':        'tools',
  'Computers':       'tools',
  'Design':          'design',
  'Photography':     'design',
  'Devices':         'devices',
  'Electrical':      'devices',
  'System':          'system',
  'Arrows':          'arrows',
  'Map':             'map',
  'Letters':         'letters',
  'Numbers':         'letters',
  'Text':            'letters',
  'Badges':          'letters',
  'Symbols':         'letters',
  'Logic':           'letters',
  'Document':        'document',
  'E-commerce':      'ecommerce',
  'Currencies':      'ecommerce',
  'Communication':   'communication',
  'Media':           'media',
  'Mood':            'mood',
  'Shapes':          'shapes',
  'Gestures':        'shapes',
  'Gender':          'shapes',
  'Zodiac':          'shapes',
  'Animals':         'nature',
  'Nature':          'nature',
  'Weather':         'nature',
  'Food':            'food',
  'Laundry':         'food',
  'Buildings':       'buildings',
  'Vehicles':        'vehicles',
  'Sport':           'sport',
  'Health':          'health',
  'Math':            'science',
  'Charts':          'science',
  'Games':           'games',
  'Extensions':      'system',
}

// Human-readable names for our generated pack categories
const CATEGORY_NAMES: Record<string, { nameRu: string; nameEn: string; descRu: string; descEn: string; icon: string; sortOrder: number }> = {
  brands:        { nameRu: 'Бренды и логотипы',   nameEn: 'Brands & Logos',      descRu: 'Логотипы технологий, соцсетей, сервисов: GitHub, React, Docker, AWS и другие.', descEn: 'Tech logos, social networks, services: GitHub, React, Docker, AWS and more.', icon: '🏷', sortOrder: 15 },
  tools:         { nameRu: 'Разработка и инструменты', nameEn: 'Dev & Tools',     descRu: 'Иконки для разработки: код, API, базы данных, деплой, контроль версий.', descEn: 'Development icons: code, API, databases, deploy, version control.', icon: '🛠', sortOrder: 25 },
  design:        { nameRu: 'Дизайн и фото',        nameEn: 'Design & Photo',      descRu: 'Дизайн-инструменты, палитры, камеры, слои, макеты.', descEn: 'Design tools, palettes, cameras, layers, layouts.', icon: '🎨', sortOrder: 35 },
  devices:       { nameRu: 'Устройства',           nameEn: 'Devices',             descRu: 'Компьютеры, телефоны, планшеты, часы, гаджеты.', descEn: 'Computers, phones, tablets, watches, gadgets.', icon: '💻', sortOrder: 45 },
  system:        { nameRu: 'Системные',            nameEn: 'System',              descRu: 'Базовые UI-элементы: настройки, фильтры, уведомления, действия.', descEn: 'Basic UI elements: settings, filters, notifications, actions.', icon: '⚙', sortOrder: 55 },
  arrows:        { nameRu: 'Стрелки',              nameEn: 'Arrows',              descRu: 'Направления, навигация, сортировка, перемещение.', descEn: 'Directions, navigation, sorting, movement.', icon: '↗', sortOrder: 60 },
  map:           { nameRu: 'Карты и навигация',     nameEn: 'Maps & Navigation',   descRu: 'Локации, маршруты, компас, GPS, транспорт на карте.', descEn: 'Locations, routes, compass, GPS, transport on map.', icon: '🗺', sortOrder: 65 },
  letters:       { nameRu: 'Буквы и символы',      nameEn: 'Letters & Symbols',   descRu: 'Алфавит, цифры, символы, знаки препинания, спецсимволы.', descEn: 'Alphabet, numbers, symbols, punctuation, special characters.', icon: '🔤', sortOrder: 70 },
  document:      { nameRu: 'Документы',            nameEn: 'Documents',           descRu: 'Файлы, папки, отчёты, сертификаты, печати.', descEn: 'Files, folders, reports, certificates, stamps.', icon: '📄', sortOrder: 75 },
  ecommerce:     { nameRu: 'E-commerce',           nameEn: 'E-commerce',          descRu: 'Покупки, корзина, оплата, скидки, доставка, валюты.', descEn: 'Shopping, cart, payment, discounts, delivery, currencies.', icon: '🛒', sortOrder: 80 },
  communication: { nameRu: 'Коммуникации',         nameEn: 'Communication',       descRu: 'Сообщения, звонки, почта, чат, видео, презентации.', descEn: 'Messages, calls, mail, chat, video, presentations.', icon: '💬', sortOrder: 85 },
  media:         { nameRu: 'Медиа',                nameEn: 'Media',               descRu: 'Воспроизведение, запись, микрофон, наушники, стриминг.', descEn: 'Playback, recording, microphone, headphones, streaming.', icon: '🎵', sortOrder: 90 },
  mood:          { nameRu: 'Эмоции',               nameEn: 'Mood',                descRu: 'Смайлики, настроение, выражения лица, реакции.', descEn: 'Smileys, mood, facial expressions, reactions.', icon: '😊', sortOrder: 95 },
  shapes:        { nameRu: 'Фигуры',               nameEn: 'Shapes',              descRu: 'Геометрия: круги, квадраты, треугольники, многоугольники.', descEn: 'Geometry: circles, squares, triangles, polygons.', icon: '🔷', sortOrder: 100 },
  nature:        { nameRu: 'Природа',              nameEn: 'Nature',              descRu: 'Деревья, листья, цветы, погода, животные, знаки зодиака.', descEn: 'Trees, leaves, flowers, weather, animals, zodiac signs.', icon: '🌿', sortOrder: 105 },
  food:          { nameRu: 'Еда',                  nameEn: 'Food',                descRu: 'Напитки, блюда, кухня, ресторан, продукты.', descEn: 'Drinks, dishes, kitchen, restaurant, groceries.', icon: '🍽', sortOrder: 110 },
  buildings:     { nameRu: 'Здания',               nameEn: 'Buildings',           descRu: 'Дома, офисы, фабрики, мосты, архитектура.', descEn: 'Houses, offices, factories, bridges, architecture.', icon: '🏢', sortOrder: 115 },
  vehicles:      { nameRu: 'Транспорт',            nameEn: 'Vehicles',            descRu: 'Машины, велосипеды, самолёты, корабли, вертолёты.', descEn: 'Cars, bikes, planes, ships, helicopters.', icon: '🚗', sortOrder: 120 },
  sport:         { nameRu: 'Спорт',                nameEn: 'Sport',               descRu: 'Футбол, баскетбол, теннис, бег, плавание, трофеи.', descEn: 'Football, basketball, tennis, running, swimming, trophies.', icon: '⚽', sortOrder: 125 },
  health:        { nameRu: 'Здоровье',             nameEn: 'Health',              descRu: 'Медицина, аптечка, сердце, стоматология, реабилитация.', descEn: 'Medicine, first aid, heart, dental, rehabilitation.', icon: '❤', sortOrder: 130 },
  science:       { nameRu: 'Наука',                nameEn: 'Science',             descRu: 'Математика, графики, формулы, аналитика, статистика.', descEn: 'Math, charts, formulas, analytics, statistics.', icon: '🔬', sortOrder: 135 },
  games:         { nameRu: 'Игры',                 nameEn: 'Games',               descRu: 'Контроллеры, кости, карты, шахматы, виртуальная реальность.', descEn: 'Controllers, dice, cards, chess, virtual reality.', icon: '🎮', sortOrder: 140 },
}

// ─── Helpers ─────────────────────────────────────────────────────

interface ParsedIcon {
  slug: string
  nameEn: string
  nameRu: string
  keywords: string
  category: string
  svgBody: string   // inner SVG content (no <svg> wrapper)
}

/** Extract SVG body from a full <svg>...</svg> string */
function extractSvgBody(raw: string): string {
  // Remove XML comment (metadata)
  const cleaned = raw.replace(/<!--[\s\S]*?-->/g, '')
  // Remove <svg ...> opening tag
  const noOpen = cleaned.replace(/<svg[^>]*>/, '')
  // Remove </svg> closing tag
  const noClose = noOpen.replace(/<\/svg>/, '')
  // Also strip xmlns attributes that might remain
  const stripped = noClose
    .replace(/\s*xmlns="[^"]*"/g, '')
    .replace(/\s*xmlns:xlink="[^"]*"/g, '')
    .trim()
  return stripped
}

/** Parse an outline SVG file to extract metadata + SVG body */
function parseOutlineIcon(filePath: string): ParsedIcon | null {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const slug = path.basename(filePath, '.svg')

  // Extract metadata from XML comment
  const tagsMatch = raw.match(/tags:\s*\[([^\]]+)\]/)
  const categoryMatch = raw.match(/category:\s*(\w[\w\s]*?)(?:\s*$|\s*-->)/m)

  if (!categoryMatch) return null // skip icons without category

  const category = categoryMatch[1].trim()
  const tags = tagsMatch ? tagsMatch[1] : ''

  // Name from slug: "brand-github" → "Brand GitHub"
  const nameEn = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const svgBody = extractSvgBody(raw)
  if (!svgBody || svgBody.length < 5) return null

  return {
    slug,
    nameEn,
    nameRu: nameEn, // Tabler has no Russian names, use English as fallback
    keywords: tags,
    category,
    svgBody,
  }
}

/** Parse a filled SVG file — no category metadata, but same slug as outline */
function parseFilledIcon(filePath: string): string | null {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const svgBody = extractSvgBody(raw)
  if (!svgBody || svgBody.length < 5) return null
  return svgBody
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Scanning Tabler icons...')

  if (!fs.existsSync(OUTLINE_DIR)) {
    console.error(`❌ Outline directory not found: ${OUTLINE_DIR}`)
    console.error('   Clone tabler-icons first: git clone https://github.com/tabler/tabler-icons.git')
    process.exit(1)
  }

  // 1. Parse all outline icons, group by our categories
  const outlineFiles = fs.readdirSync(OUTLINE_DIR).filter(f => f.endsWith('.svg'))
  console.log(`   Found ${outlineFiles.length} outline icons`)

  const grouped = new Map<string, ParsedIcon[]>()
  let skipped = 0

  for (const file of outlineFiles) {
    const icon = parseOutlineIcon(path.join(OUTLINE_DIR, file))
    if (!icon) { skipped++; continue }

    const ourCategory = CATEGORY_MAP[icon.category] || 'system'
    if (!grouped.has(ourCategory)) grouped.set(ourCategory, [])
    grouped.get(ourCategory)!.push(icon)
  }
  console.log(`   Parsed ${outlineFiles.length - skipped} icons, skipped ${skipped}`)
  console.log(`   Grouped into ${grouped.size} categories`)

  // 2. Parse filled icons (matched by slug)
  const filledSlugs = new Set<string>()
  if (fs.existsSync(FILLED_DIR)) {
    const filledFiles = fs.readdirSync(FILLED_DIR).filter(f => f.endsWith('.svg'))
    for (const f of filledFiles) filledSlugs.add(path.basename(f, '.svg'))
    console.log(`   Found ${filledFiles.length} filled icons`)
  }

  // 3. Insert into database
  console.log('\n📦 Creating packs in database...')

  // Get admin user for ownership (not strictly needed for packs, but good practice)
  const admin = await db.user.findFirst({ where: { role: 'admin' } })

  let totalPacksCreated = 0
  let totalIconsCreated = 0

  for (const [catSlug, icons] of grouped) {
    const catInfo = CATEGORY_NAMES[catSlug]
    if (!catInfo) {
      console.log(`   ⚠ Skipping unknown category: ${catSlug} (${icons.length} icons)`)
      continue
    }

    // Skip categories with fewer than 5 icons (not worth a separate pack)
    if (icons.length < 5) {
      console.log(`   ⚠ Skipping small category: ${catSlug} (${icons.length} icons)`)
      continue
    }

    // Create OUTLINE pack
    const outlinePackSlug = `tabler-${catSlug}-outline`
    const existingOutline = await db.pack.findUnique({ where: { slug: outlinePackSlug } })
    if (existingOutline) {
      console.log(`   ↻ Outline pack "${outlinePackSlug}" already exists, skipping`)
    } else {
      const pack = await db.pack.create({
        data: {
          slug: outlinePackSlug,
          nameRu: `${catInfo.nameRu} (Outline)`,
          nameEn: `${catInfo.nameEn} (Outline)`,
          descRu: catInfo.descRu,
          descEn: catInfo.descEn,
          category: catSlug,
          style: 'outline',
          tags: icons.slice(0, 20).map(i => i.slug.split('-').pop()).join(','),
          isFree: true,
          priceCredits: 10,
          icons: {
            create: icons.map(ic => ({
              slug: `tabler-${ic.slug}`,
              nameRu: ic.nameRu,
              nameEn: ic.nameEn,
              keywords: ic.keywords,
              svg: ic.svgBody,
              viewBox: '0 0 24 24',
            })),
          },
        },
      })
      totalIconsCreated += icons.length
      console.log(`   ✓ Outline: "${outlinePackSlug}" — ${icons.length} icons`)
    }
    totalPacksCreated++

    // Create FILLED pack (only if we have filled versions)
    const filledIcons = icons.filter(ic => filledSlugs.has(ic.slug))
    if (filledIcons.length < 5) continue // not enough filled variants

    const filledPackSlug = `tabler-${catSlug}-filled`
    const existingFilled = await db.pack.findUnique({ where: { slug: filledPackSlug } })
    if (existingFilled) {
      console.log(`   ↻ Filled pack "${filledPackSlug}" already exists, skipping`)
      continue
    }

    const filledData: { slug: string; nameRu: string; nameEn: string; keywords: string; svg: string; viewBox: string }[] = []
    for (const ic of filledIcons) {
      const filledPath = path.join(FILLED_DIR, `${ic.slug}.svg`)
      const svgBody = parseFilledIcon(filledPath)
      if (svgBody) {
        filledData.push({
          slug: `tabler-${ic.slug}-filled`,
          nameRu: `${ic.nameRu} (Filled)`,
          nameEn: `${ic.nameEn} (Filled)`,
          keywords: ic.keywords,
          svg: svgBody,
          viewBox: '0 0 24 24',
        })
      }
    }

    if (filledData.length < 5) continue

    await db.pack.create({
      data: {
        slug: filledPackSlug,
        nameRu: `${catInfo.nameRu} (Filled)`,
        nameEn: `${catInfo.nameEn} (Filled)`,
        descRu: catInfo.descRu,
        descEn: catInfo.descEn,
        category: catSlug,
        style: 'filled',
        tags: filledData.slice(0, 20).map(i => i.slug.split('-').pop()).join(','),
        isFree: true,
        priceCredits: 10,
        icons: {
          create: filledData,
        },
      },
    })
    totalIconsCreated += filledData.length
    console.log(`   ✓ Filled:  "${filledPackSlug}" — ${filledData.length} icons`)
    totalPacksCreated++
  }

  console.log(`\n✅ Done! Created ${totalPacksCreated} packs, ${totalIconsCreated} icons total`)
  console.log(`   from Tabler Icons (MIT License, https://tabler.io/icons)`)
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
