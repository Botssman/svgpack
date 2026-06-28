/**
 * Pack categories — single source of truth for catalog grouping.
 *
 * Stored as TS const (not DB table) because the set is small
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
    slug: 'languages',
    nameRu: 'Языки',
    nameEn: 'Languages',
    descRu: 'Языки программирования и разметки для веб-разработки: HTML, CSS, JavaScript, TypeScript, Python, Go, Rust и другие.',
    descEn: 'Programming and markup languages for web development: HTML, CSS, JavaScript, TypeScript, Python, Go, Rust and more.',
    icon: '🔤',
    sortOrder: 10,
  },
  {
    slug: 'frameworks',
    nameRu: 'Фреймворки',
    nameEn: 'Frameworks',
    descRu: 'JS-фреймворки и библиотеки: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid и другие.',
    descEn: 'JS frameworks and libraries: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid and more.',
    icon: '⚡',
    sortOrder: 20,
  },
  {
    slug: 'tools',
    nameRu: 'Инструменты',
    nameEn: 'Tools',
    descRu: 'Инструменты разработчика: Git, GitHub, Docker, VS Code, ESLint, Webpack, Vite, npm и другие.',
    descEn: 'Developer tools: Git, GitHub, Docker, VS Code, ESLint, Webpack, Vite, npm and more.',
    icon: '🛠',
    sortOrder: 30,
  },
  {
    slug: 'concepts',
    nameRu: 'Концепты',
    nameEn: 'Concepts',
    descRu: 'Веб-концепты и архитектурные паттерны: API, базы данных, кэш, микросервисы, CI/CD и другие.',
    descEn: 'Web concepts and architecture patterns: API, databases, cache, microservices, CI/CD and more.',
    icon: '🧩',
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
