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
    slug: 'brands',
    nameRu: 'Бренды и логотипы',
    nameEn: 'Brands & Logos',
    descRu: 'Логотипы технологий, соцсетей, сервисов: GitHub, React, Docker, AWS и другие.',
    descEn: 'Tech logos, social networks, services: GitHub, React, Docker, AWS and more.',
    icon: '🏷',
    sortOrder: 15,
  },
  {
    slug: 'tools',
    nameRu: 'Разработка и инструменты',
    nameEn: 'Dev & Tools',
    descRu: 'Инструменты разработчика: Git, GitHub, Docker, VS Code, API, базы данных, деплой.',
    descEn: 'Developer tools: Git, GitHub, Docker, VS Code, API, databases, deploy.',
    icon: '🛠',
    sortOrder: 25,
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
  {
    slug: 'education',
    nameRu: 'Образование',
    nameEn: 'Education',
    descRu: 'Иконки для образовательных проектов: наука, обучение, преподавание, расписание, достижение.',
    descEn: 'Icons for education projects: science, learning, teaching, schedule, achievement.',
    icon: '🎓',
    sortOrder: 50,
  },
  // ── Tabler icon categories ──
  {
    slug: 'design',
    nameRu: 'Дизайн и фото',
    nameEn: 'Design & Photo',
    descRu: 'Дизайн-инструменты, палитры, камеры, слои, макеты.',
    descEn: 'Design tools, palettes, cameras, layers, layouts.',
    icon: '🎨',
    sortOrder: 35,
  },
  {
    slug: 'devices',
    nameRu: 'Устройства',
    nameEn: 'Devices',
    descRu: 'Компьютеры, телефоны, планшеты, часы, гаджеты.',
    descEn: 'Computers, phones, tablets, watches, gadgets.',
    icon: '💻',
    sortOrder: 45,
  },
  {
    slug: 'system',
    nameRu: 'Системные',
    nameEn: 'System',
    descRu: 'Базовые UI-элементы: настройки, фильтры, уведомления, действия.',
    descEn: 'Basic UI elements: settings, filters, notifications, actions.',
    icon: '⚙',
    sortOrder: 55,
  },
  {
    slug: 'arrows',
    nameRu: 'Стрелки',
    nameEn: 'Arrows',
    descRu: 'Направления, навигация, сортировка, перемещение.',
    descEn: 'Directions, navigation, sorting, movement.',
    icon: '↗',
    sortOrder: 60,
  },
  {
    slug: 'map',
    nameRu: 'Карты и навигация',
    nameEn: 'Maps & Navigation',
    descRu: 'Локации, маршруты, компас, GPS, транспорт на карте.',
    descEn: 'Locations, routes, compass, GPS, transport on map.',
    icon: '🗺',
    sortOrder: 65,
  },
  {
    slug: 'letters',
    nameRu: 'Буквы и символы',
    nameEn: 'Letters & Symbols',
    descRu: 'Алфавит, цифры, символы, знаки препинания, спецсимволы.',
    descEn: 'Alphabet, numbers, symbols, punctuation, special characters.',
    icon: '🔠',
    sortOrder: 70,
  },
  {
    slug: 'document',
    nameRu: 'Документы',
    nameEn: 'Documents',
    descRu: 'Файлы, папки, отчёты, сертификаты, печати.',
    descEn: 'Files, folders, reports, certificates, stamps.',
    icon: '📄',
    sortOrder: 75,
  },
  {
    slug: 'ecommerce',
    nameRu: 'E-commerce',
    nameEn: 'E-commerce',
    descRu: 'Покупки, корзина, оплата, скидки, доставка, валюты.',
    descEn: 'Shopping, cart, payment, discounts, delivery, currencies.',
    icon: '🛒',
    sortOrder: 80,
  },
  {
    slug: 'communication',
    nameRu: 'Коммуникации',
    nameEn: 'Communication',
    descRu: 'Сообщения, звонки, почта, чат, видео, презентации.',
    descEn: 'Messages, calls, mail, chat, video, presentations.',
    icon: '💬',
    sortOrder: 85,
  },
  {
    slug: 'media',
    nameRu: 'Медиа',
    nameEn: 'Media',
    descRu: 'Воспроизведение, запись, микрофон, наушники, стриминг.',
    descEn: 'Playback, recording, microphone, headphones, streaming.',
    icon: '🎵',
    sortOrder: 90,
  },
  {
    slug: 'mood',
    nameRu: 'Эмоции',
    nameEn: 'Mood',
    descRu: 'Смайлики, настроение, выражения лица, реакции.',
    descEn: 'Smileys, mood, facial expressions, reactions.',
    icon: '😊',
    sortOrder: 95,
  },
  {
    slug: 'shapes',
    nameRu: 'Фигуры',
    nameEn: 'Shapes',
    descRu: 'Геометрия: круги, квадраты, треугольники, многоугольники.',
    descEn: 'Geometry: circles, squares, triangles, polygons.',
    icon: '🔷',
    sortOrder: 100,
  },
  {
    slug: 'nature',
    nameRu: 'Природа',
    nameEn: 'Nature',
    descRu: 'Деревья, листья, цветы, погода, животные, знаки зодиака.',
    descEn: 'Trees, leaves, flowers, weather, animals, zodiac signs.',
    icon: '🌿',
    sortOrder: 105,
  },
  {
    slug: 'food',
    nameRu: 'Еда',
    nameEn: 'Food',
    descRu: 'Напитки, блюда, кухня, ресторан, продукты.',
    descEn: 'Drinks, dishes, kitchen, restaurant, groceries.',
    icon: '🍽',
    sortOrder: 110,
  },
  {
    slug: 'buildings',
    nameRu: 'Здания',
    nameEn: 'Buildings',
    descRu: 'Дома, офисы, фабрики, мосты, архитектура.',
    descEn: 'Houses, offices, factories, bridges, architecture.',
    icon: '🏢',
    sortOrder: 115,
  },
  {
    slug: 'vehicles',
    nameRu: 'Транспорт',
    nameEn: 'Vehicles',
    descRu: 'Машины, велосипеды, самолёты, корабли, вертолёты.',
    descEn: 'Cars, bikes, planes, ships, helicopters.',
    icon: '🚗',
    sortOrder: 120,
  },
  {
    slug: 'sport',
    nameRu: 'Спорт',
    nameEn: 'Sport',
    descRu: 'Футбол, баскетбол, теннис, бег, плавание, трофеи.',
    descEn: 'Football, basketball, tennis, running, swimming, trophies.',
    icon: '⚽',
    sortOrder: 125,
  },
  {
    slug: 'health',
    nameRu: 'Здоровье',
    nameEn: 'Health',
    descRu: 'Медицина, аптечка, сердце, стоматология, реабилитация.',
    descEn: 'Medicine, first aid, heart, dental, rehabilitation.',
    icon: '❤',
    sortOrder: 130,
  },
  {
    slug: 'science',
    nameRu: 'Наука',
    nameEn: 'Science',
    descRu: 'Математика, графики, формулы, аналитика, статистика.',
    descEn: 'Math, charts, formulas, analytics, statistics.',
    icon: '🔬',
    sortOrder: 135,
  },
  {
    slug: 'games',
    nameRu: 'Игры',
    nameEn: 'Games',
    descRu: 'Контроллеры, кости, карты, шахматы, виртуальная реальность.',
    descEn: 'Controllers, dice, cards, chess, virtual reality.',
    icon: '🎮',
    sortOrder: 140,
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
