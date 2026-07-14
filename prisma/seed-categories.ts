/**
 * Seed script: populate Category table from the hardcoded CATEGORIES array.
 * Run with: npx tsx prisma/seed-categories.ts
 */
import { PrismaClient } from '@prisma/client'

const CATEGORIES = [
  { slug: 'languages', nameRu: 'Языки', nameEn: 'Languages', descRu: 'Языки программирования и разметки для веб-разработки: HTML, CSS, JavaScript, TypeScript, Python, Go, Rust и другие.', descEn: 'Programming and markup languages for web development: HTML, CSS, JavaScript, TypeScript, Python, Go, Rust and more.', sortOrder: 10 },
  { slug: 'frameworks', nameRu: 'Фреймворки', nameEn: 'Frameworks', descRu: 'JS-фреймворки и библиотеки: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid и другие.', descEn: 'JS frameworks and libraries: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid and more.', sortOrder: 20 },
  { slug: 'brands', nameRu: 'Бренды и логотипы', nameEn: 'Brands & Logos', descRu: 'Логотипы технологий, соцсетей, сервисов: GitHub, React, Docker, AWS и другие.', descEn: 'Tech logos, social networks, services: GitHub, React, Docker, AWS and more.', sortOrder: 15 },
  { slug: 'tools', nameRu: 'Разработка и инструменты', nameEn: 'Dev & Tools', descRu: 'Инструменты разработчика: Git, GitHub, Docker, VS Code, API, базы данных, деплой.', descEn: 'Developer tools: Git, GitHub, Docker, VS Code, API, databases, deploy.', sortOrder: 25 },
  { slug: 'concepts', nameRu: 'Концепты', nameEn: 'Concepts', descRu: 'Веб-концепты и архитектурные паттерны: API, базы данных, кэш, микросервисы, CI/CD и другие.', descEn: 'Web concepts and architecture patterns: API, databases, cache, microservices, CI/CD and more.', sortOrder: 40 },
  { slug: 'education', nameRu: 'Образование', nameEn: 'Education', descRu: 'Иконки для образовательных проектов: наука, обучение, преподавание, расписание, достижение.', descEn: 'Icons for education projects: science, learning, teaching, schedule, achievement.', sortOrder: 50 },
  { slug: 'design', nameRu: 'Дизайн и фото', nameEn: 'Design & Photo', descRu: 'Дизайн-инструменты, палитры, камеры, слои, макеты.', descEn: 'Design tools, palettes, cameras, layers, layouts.', sortOrder: 35 },
  { slug: 'devices', nameRu: 'Устройства', nameEn: 'Devices', descRu: 'Компьютеры, телефоны, планшеты, часы, гаджеты.', descEn: 'Computers, phones, tablets, watches, gadgets.', sortOrder: 45 },
  { slug: 'system', nameRu: 'Системные', nameEn: 'System', descRu: 'Базовые UI-элементы: настройки, фильтры, уведомления, действия.', descEn: 'Basic UI elements: settings, filters, notifications, actions.', sortOrder: 55 },
  { slug: 'arrows', nameRu: 'Стрелки', nameEn: 'Arrows', descRu: 'Направления, навигация, сортировка, перемещение.', descEn: 'Directions, navigation, sorting, movement.', sortOrder: 60 },
  { slug: 'map', nameRu: 'Карты и навигация', nameEn: 'Maps & Navigation', descRu: 'Локации, маршруты, компас, GPS, транспорт на карте.', descEn: 'Locations, routes, compass, GPS, transport on map.', sortOrder: 65 },
  { slug: 'letters', nameRu: 'Буквы и символы', nameEn: 'Letters & Symbols', descRu: 'Алфавит, цифры, символы, знаки препинания, спецсимволы.', descEn: 'Alphabet, numbers, symbols, punctuation, special characters.', sortOrder: 70 },
  { slug: 'document', nameRu: 'Документы', nameEn: 'Documents', descRu: 'Файлы, папки, отчёты, сертификаты, печати.', descEn: 'Files, folders, reports, certificates, stamps.', sortOrder: 75 },
  { slug: 'ecommerce', nameRu: 'E-commerce', nameEn: 'E-commerce', descRu: 'Покупки, корзина, оплата, скидки, доставка, валюты.', descEn: 'Shopping, cart, payment, discounts, delivery, currencies.', sortOrder: 80 },
  { slug: 'communication', nameRu: 'Коммуникации', nameEn: 'Communication', descRu: 'Сообщения, звонки, почта, чат, видео, презентации.', descEn: 'Messages, calls, mail, chat, video, presentations.', sortOrder: 85 },
  { slug: 'media', nameRu: 'Медиа', nameEn: 'Media', descRu: 'Воспроизведение, запись, микрофон, наушники, стриминг.', descEn: 'Playback, recording, microphone, headphones, streaming.', sortOrder: 90 },
  { slug: 'mood', nameRu: 'Эмоции', nameEn: 'Mood', descRu: 'Смайлики, настроение, выражения лица, реакции.', descEn: 'Smileys, mood, facial expressions, reactions.', sortOrder: 95 },
  { slug: 'shapes', nameRu: 'Фигуры', nameEn: 'Shapes', descRu: 'Геометрия: круги, квадраты, треугольники, многоугольники.', descEn: 'Geometry: circles, squares, triangles, polygons.', sortOrder: 100 },
  { slug: 'nature', nameRu: 'Природа', nameEn: 'Nature', descRu: 'Деревья, листья, цветы, погода, животные, знаки зодиака.', descEn: 'Trees, leaves, flowers, weather, animals, zodiac signs.', sortOrder: 105 },
  { slug: 'food', nameRu: 'Еда', nameEn: 'Food', descRu: 'Напитки, блюда, кухня, ресторан, продукты.', descEn: 'Drinks, dishes, kitchen, restaurant, groceries.', sortOrder: 110 },
  { slug: 'buildings', nameRu: 'Здания', nameEn: 'Buildings', descRu: 'Дома, офисы, фабрики, мосты, архитектура.', descEn: 'Houses, offices, factories, bridges, architecture.', sortOrder: 115 },
  { slug: 'vehicles', nameRu: 'Транспорт', nameEn: 'Vehicles', descRu: 'Машины, велосипеды, самолёты, корабли, вертолёты.', descEn: 'Cars, bikes, planes, ships, helicopters.', sortOrder: 120 },
  { slug: 'sport', nameRu: 'Спорт', nameEn: 'Sport', descRu: 'Футбол, баскетбол, теннис, бег, плавание, трофеи.', descEn: 'Football, basketball, tennis, running, swimming, trophies.', sortOrder: 125 },
  { slug: 'health', nameRu: 'Здоровье', nameEn: 'Health', descRu: 'Медицина, аптечка, сердце, стоматология, реабилитация.', descEn: 'Medicine, first aid, heart, dental, rehabilitation.', sortOrder: 130 },
  { slug: 'science', nameRu: 'Наука', nameEn: 'Science', descRu: 'Математика, графики, формулы, аналитика, статистика.', descEn: 'Math, charts, formulas, analytics, statistics.', sortOrder: 135 },
  { slug: 'games', nameRu: 'Игры', nameEn: 'Games', descRu: 'Контроллеры, кости, карты, шахматы, виртуальная реальность.', descEn: 'Controllers, dice, cards, chess, virtual reality.', sortOrder: 140 },
  { slug: 'uncategorized', nameRu: 'Без категории', nameEn: 'Uncategorized', descRu: 'Иконки без определённой категории.', descEn: 'Icons without a specific category.', sortOrder: 999 },
]

async function main() {
  const prisma = new PrismaClient()

  try {
    console.log(`Seeding ${CATEGORIES.length} categories...`)

    for (const cat of CATEGORIES) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {
          nameRu: cat.nameRu,
          nameEn: cat.nameEn,
          descRu: cat.descRu,
          descEn: cat.descEn,
          sortOrder: cat.sortOrder,
        },
        create: {
          slug: cat.slug,
          nameRu: cat.nameRu,
          nameEn: cat.nameEn,
          descRu: cat.descRu,
          descEn: cat.descEn,
          sortOrder: cat.sortOrder,
        },
      })
      console.log(`  ✓ ${cat.slug}`)
    }

    const count = await prisma.category.count()
    console.log(`\nDone! ${count} categories in database.`)
  } finally {
    await prisma.$disconnect()
  }
}

main()
