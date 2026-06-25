# SVGPack — SaaS-сервис иконок веб-разработки

Минимально жизнеспособный SaaS-сервис для скачивания SVG-пакетов иконок на тему
веб-разработки. Базовые пакеты бесплатны, кастомизация (цвет, толщина линий,
размер, фон, поворот, двухцветный режим) — платная, по модели микротранзакций.

## Возможности

- **Каталог пакетов** — 4 предустановленных пакета (31 иконка): веб-языки,
  JS-фреймворки, dev-инструменты, веб-концепты
- **Поиск и фильтрация** по категориям и ключевым словам
- **Скачивание** — целиком пакетом (ZIP) или по одной иконке (SVG)
- **Кастомизация** — цвет, толщина линий, размер, фон, поворот, duotone-режим
- **Сборщик пакетов** — соберите свой набор иконок из разных пакетов
- **Биллинг** — 3 плана: одноразовая покупка, подписка, кредиты (mock-режим)
- **Личный кабинет** — история покупок, статус подписки, остаток кредитов
- **Админ-панель** — CRUD по пакетам/иконкам + статистика
- **Двуязычность** — русский / английский, переключение в реальном времени
- **Light minimal** — чистый светлый интерфейс с акцентом на контент

## Технологии

- **Next.js 16** (App Router, TypeScript)
- **Prisma** + **SQLite** (локальная БД)
- **Tailwind CSS 4** + **shadcn/ui**
- **React Context** для состояния (user / build / i18n)
- **Hand-written ZIP** (PKZIP store mode + CRC32, без зависимостей)
- **SVG-рендерер** — применяет конфиг кастомизации к `currentColor`/`stroke`/`fill`

## Быстрый старт

```bash
# 1. Установка зависимостей
bun install   # или npm install / pnpm install

# 2. Создать .env с путём к БД
echo 'DATABASE_URL=file:./db/custom.db' > .env

# 3. Инициализация схемы и сидинг
bun run db:push
bunx tsx scripts/seed.ts

# 4. Запуск дев-сервера
bun run dev
```

Откройте http://localhost:3000

## Демо-аккаунты

После сидинга в базе появятся два пользователя:

| Email                  | Роль    | Кредиты |
| ---------------------- | ------- | ------- |
| `admin@iconhub.test`   | admin   | 1000    |
| `demo@iconhub.test`    | user    | 30      |

Любой email принимается системой (mocked auth через заголовок `x-user-email`).

## Структура проекта

```
prisma/
  schema.prisma          # 8 моделей: User, Pack, Icon, Subscription, Purchase,
                         # CustomIcon, CustomPacks, CustomPackIcon
scripts/
  seed.ts                # 4 пакета × 31 иконка + admin/demo юзеры
src/
  app/
    page.tsx             # state-based роутинг (8 view)
    api/                 # 12 REST-эндпоинтов (packs, download, customize,
                         # billing, admin, auth)
  views/                 # 8 экранов: home, catalog, pack-view, customize,
                         # builder, billing, account, admin
  components/
    icon-view.tsx        # рендер SVG с применением CustomConfig
  lib/
    dict.ts              # RU/EN словарь
    i18n.tsx             # I18nProvider
    svg.ts               # renderSvg() + makeZip() + CustomConfig
    user-store.tsx       # auth + user state
    build-store.tsx      # состояние сборщика пакетов
```

## API

| Метод | Эндпоинт                          | Описание                          |
| ----- | --------------------------------- | --------------------------------- |
| GET   | `/api/packs?q=&category=`         | Список пакетов с поиском          |
| GET   | `/api/packs/[slug]`               | Один пакет со всеми иконками      |
| GET   | `/api/download/pack/[slug]?cfg=`  | Скачать ZIP пакета                |
| GET   | `/api/download/icon/[id]?cfg=`    | Скачать SVG одной иконки          |
| POST  | `/api/download/build`             | Скачать ZIP собранного пакета     |
| POST  | `/api/customize`                  | Сохранить кастомную конфигурацию  |
| POST  | `/api/billing/credits`            | Купить кредиты (mock)             |
| POST  | `/api/billing/subscribe`          | Оформить подписку (mock)          |
| POST  | `/api/billing/onetime`            | Разовая покупка (mock)            |
| GET   | `/api/admin/packs`                | Список пакетов (admin)            |
| POST  | `/api/admin/packs`                | Создать пакет (admin)             |
| PATCH | `/api/admin/packs/[id]`           | Обновить пакет (admin)            |
| DELETE| `/api/admin/packs/[id]`           | Удалить пакет (admin)             |
| GET   | `/api/admin/stats`                | Статистика (admin)                |
| POST  | `/api/auth/login`                 | Mocked login (по email)           |
| GET   | `/api/me`                         | Текущий пользователь              |

## Roadmap

- Реальная интеграция Stripe (тестовый режим)
- UGC: загрузка пользовательских пакетов
- NextAuth для полноценной аутентификации
- Расширение каталога: payment / crypto / social пакеты
- Темная тема
- Экспорт в PNG / React-компоненты

## Лицензия

MIT — используйте и модифицируйте как угодно.
