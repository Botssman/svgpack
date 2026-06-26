/**
 * Pack categories — single source of truth for catalog grouping.
 *
 * Stored as TS const (not DB table) because the set is small (4 items)
 * and changes rarely. Adding a new category: append here + use its slug
 * in PACKS[].category in src/lib/packs-data.ts.
 *
 * Each category has:
 *  - slug        URL-friendly identifier (matches Pack.category in DB)
 *  - nameRu/En   Display name (used in /catalog section headers, metadata)
 *  - descRu/En   Short description for catalog section subtitle
 *  - icon        Emoji or short string for visual marker (kept simple,
 *                no SVG dependency so this file is import-safe anywhere)
 *  - sortOrder   Lower = earlier in catalog
 */

export type Category = {
  slug: string
  nameRu: string
  nameEn: string
  descRu: string
  descEn: string
  icon: string
  sortOrder: number
}

export const CATEGORIES: Category[] = [
  {
    slug: 'web',
    nameRu: 'Веб-разработка',
    nameEn: 'Web Development',
    descRu: 'Иконки языков программирования, фреймворков и инструментов для фронтенда и бэкенда.',
    descEn: 'Icons for programming languages, frameworks and tools for frontend and backend.',
    icon: '🌐',
    sortOrder: 10,
  },
  {
    slug: 'medical',
    nameRu: 'Медицина',
    nameEn: 'Medical',
    descRu: 'Медицинские специальности, учреждения, документы, оборудование и профилактика.',
    descEn: 'Medical specialties, facilities, documents, equipment and prevention.',
    icon: '⚕️',
    sortOrder: 20,
  },
  {
    slug: 'realestate',
    nameRu: 'Недвижимость',
    nameEn: 'Real Estate',
    descRu: 'Объекты недвижимости, сделки, инфраструктура, интерьер и финансы.',
    descEn: 'Real estate objects, deals, infrastructure, interior and finance.',
    icon: '🏠',
    sortOrder: 30,
  },
  {
    slug: 'law',
    nameRu: 'Право',
    nameEn: 'Law',
    descRu: 'Отрасли права, документы, участники, действия и объекты правоотношений.',
    descEn: 'Branches of law, documents, actors, actions and objects of legal relations.',
    icon: '⚖️',
    sortOrder: 40,
  },
]

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
)

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORY_MAP[slug]
}

/**
 * Group packs by category, preserving category sort order.
 * Categories with no packs are still included (so /catalog shows all themes).
 */
export function groupPacksByCategory<T extends { category: string }>(
  packs: T[]
): Array<{ category: Category; packs: T[] }> {
  return CATEGORIES.map((category) => ({
    category,
    packs: packs.filter((p) => p.category === category.slug),
  }))
}
