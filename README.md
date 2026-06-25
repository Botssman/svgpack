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

## Деплой на Vercel + Turso (бесплатно)

Проект готов к деплою на Vercel с базой данных Turso (SQLite-в-облаке, бесплатный тариф).

### Шаг 1. Создать базу в Turso

1. Зарегистрируйся на https://turso.tech (через GitHub, 30 секунд)
2. В дашборде нажми **New database** → имя `svgpack` → **Create**
3. Открой созданную БД, нажми **Settings** → скопируй:
   - `libsql://svgpack-<user>.turso.io` — это `DATABASE_URL`
   - Нажми **Create auth token** → скопируй длинный токен — это `DATABASE_AUTH_TOKEN`

### Шаг 2. Импортировать репозиторий в Vercel

1. Зарегистрируйся на https://vercel.com (через GitHub)
2. **Add New** → **Project** → найди `Botssman/svgpack` → **Import**
3. Framework Preset: **Next.js** (автоматом)
4. **Environment Variables** — добавь две:
   - `DATABASE_URL` = `libsql://svgpack-<user>.turso.io`
   - `DATABASE_AUTH_TOKEN` = (токен из Turso)
5. **Deploy** (≈2 минуты)

### Шаг 3. Применить схему и сидинг на Turso

Локально (после `git pull`):

```bash
# Временно переключаемся на Turso
export DATABASE_URL="libsql://svgpack-<user>.turso.io"
export DATABASE_AUTH_TOKEN="<токен>"

# Применяем схему
bunx prisma db push

# Запускаем сидинг (создаст 4 пакета + 2 юзера)
bunx tsx scripts/seed.ts
```

### Шаг 4. Проверить

Vercel даст URL вида `svgpack.vercel.app`. Открой — увидишь каталог.
Зайди в личный кабинет под `admin@iconhub.test` — увидишь 1000 кредитов.

### Лимиты бесплатных тарифов

| Сервис | Лимит | Хватит на |
| ------ | ----- | --------- |
| Vercel Hobby | 100 GB-ч/мес бандвич, serverless функции | ~100k визитов/мес |
| Turso Free | 9 GB storage, 1B reads/мес, 25M writes/мес | для MVP — с большим запасом |

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
