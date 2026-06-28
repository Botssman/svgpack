# Правила проекта SVG Pack Hub

## Workflow

- Сервер: **Vercel** подключён к `github.com/Botssman/svgpack`, ветка `main`. Каждый пуш в main автоматически триггерит деплой.
- БД на проде: **Turso (libsql cloud)**, не локальный SQLite. Локально разработка идёт на `db/custom.db`, но прод-инстанс живёт по `DIRECT_DATABASE_URL` (libsql://...) в env Vercel.
- Схема: `prisma/schema.prisma`. Любое изменение полей → `npm run db:push` локально + **обязательно** применить к Turso через `DIRECT_DATABASE_URL=libsql://... npm run db:push`. Иначе на проде упадёт с `no such column: ...`.

## Коммиты — ОБЯЗАТЕЛЬНО на русском, с осмысленным заголовком

Формат (conventional commits, но тело на русском):

```
<type>(<scope>): краткое описание по-русски

- пункт 1
- пункт 2
```

Где `type`:
- `feat` — новая фича
- `fix` — багфикс
- `refactor` — рефакторинг без изменения поведения
- `chore` — chores (зависимости, скрипты, gitignore)
- `docs` — документация
- `style` — форматирование, пробелы
- `test` — тесты

Примеры хороших сообщений:
- `feat(layout): редизайн главной + каталог по категориям + 36rem padding`
- `fix(css): убрать overflow-x, поднять z-index у sticky header`
- `refactor(routing): миграция SPA-вьюшек на App Router`
- `chore(scripts): добавить check-pack-schema.js для диагностики SQLite`

**ЗАПРЕЩЕНО** коммитить с UUID или бессмысленным набором символов в качестве сообщения. Если коммит создаётся автоматически (через агента) — название всё равно должно быть осмысленным.

## Пуш

- После каждого коммита: `git push origin main`
- Перед пушом: `npm run build` должен проходить без ошибок
- Force-push только при переписывании истории (rebase/reword) и только с `--force-with-lease`

## Файловая гигиена

В `.gitignore` уже добавлены:
- `/tool-results/` — служебные дампы агента, не коммитить
- `/db/` — локальный SQLite, на проде своя БД
- `/download/`, `/upload/` — временные файлы
- `dev.log`, `*.log` — логи

## Роуты (App Router)

```
/                    маркетинг (Hero/Features/Pricing/FAQ/CTA)
/catalog             все паки, сгруппированные по категориям
/catalog/[slug]      страница пака с inline-кастомизатором
/builder             сборка своего пака
/pricing             отдельная страница тарифов
/account             личный кабинет / логин
/admin               админка
/sitemap.xml         динамический sitemap
/robots.txt          allow /, disallow /account /admin /api
```

## i18n

- 2 языка: `ru` (основной), `en`
- Cookie `lang`, читается через `getLang()` в server-components
- URL без `/ru/` префикса — один URL на оба языка
- Словарь в `src/lib/dict.ts`, типизирован через явный `Dict` interface (не `as const` — иначе ru/en литералы конфликтуют)

## Тарифы (в рублях)

| Тариф | Цена | Что входит |
|-------|------|------------|
| Free | 0 ₽ | Все паки в исходном виде, 3 сборки/мес, 10 кредитов в подарок |
| One-time | от 25 ₽ | Пак = 149 ₽, иконка = 25 ₽, хранится навсегда |
| Subscription | 200 ₽/мес | Безлимитная кастомизация всех паков |
| Credits | 100 кр = 149 ₽ | 1 кастомизация = 5 кредитов, не сгорают |

Регистрация — только по email (Google/GitHub OAuth нельзя, в РФ запрещены зарубежные сервисы).

## Категории паков

4 категории, slug пака в URL без категории (плоский):
- `web` — веб-разработка
- `medical` — медицина
- `realestate` — недвижимость
- `law` — право

Конфиг в `src/lib/categories.ts`. Slug пака: `/catalog/web-languages`, не `/catalog/web/web-languages`.

## Контейнеры — ЖЁСТКОЕ ПРАВИЛО ВЁРСТКИ

Проект использует **свою систему контейнеров** из `globals.css`. **ЗАПРЕЩЕНО** использовать Tailwind-утилиты (`max-w-7xl`, `max-w-3xl`, `mx-auto`, `px-4 sm:px-6` и т.д.) как обёртку страницы.

### Два допустимых контейнера

| Класс | Назначение | Определение в globals.css |
|---|---|---|
| `container-wide` | Широкие страницы: каталог, пак, билдер, кастомайзер, админка, биллинг | `padding-inline: 1.6rem → 36rem` по брейкпоинтам |
| `container-narrow` | Текстовые/формы: аккаунт, логин, FAQ, пустые состояния | `max-width: 90rem` + адаптивные padding-inline |

### Маппинг по страницам

| Страница | Контейнер |
|---|---|
| Home | `container-wide` на каждую секцию |
| Catalog | `container-wide` |
| Pack View | `container-wide` |
| Customize | `container-wide` |
| Builder | `container-wide` |
| Admin (основной) | `container-wide` |
| Admin (unauthorized) | `container-narrow` |
| Billing/Pricing | `container-wide` |
| My Packs (основной) | `container-wide` |
| My Packs (не залогинен) | `container-narrow` |
| Account | `container-narrow` |
| Loading/404/Empty | Тот же контейнер, что у основной страницы |

### Запрещённые паттерны (на уровне страницы)

```tsx
// ❌ ЗАПРЕЩЕНО — ломает вёрстку:
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
<div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
<div className="max-w-md mx-auto px-4 sm:px-6 py-20">

// ✅ ПРАВИЛЬНО:
<div className="container-wide py-10">
<div className="container-narrow py-20">
```

### Когда `max-w-*` допустим

Только для **внутренних элементов** внутри контейнера (центрирование текста, модалки и т.д.):
```tsx
<div className="container-wide py-10">
  <div className="mx-auto max-w-2xl text-center">  {/* ← внутри, ОК */}
```

Подробности: `LAYOUT_RULES.md`

## НЕ ТРОГАТЬ работающий функционал

- **Счётчики паков/иконок** на главной — динамические, считаются из `PACKS` в `packs-data.ts`. НЕ хардкодить числа.
- **Анимации** (`hover:-translate-y-0.5`, `hover:shadow-lift`, `hover:scale-110`, `transition-all`) — НЕ удалять без явного запроса владельца.
- **Кастомизация** — работает в 3 местах: customize.tsx (пак), builder.tsx (сборка), my-packs.tsx (сохранённые). НЕ убирать кнопки кастомизации.
- **Селектор области (Все/По одной/Несколько)** — в customize.tsx располагается НАД сеткой иконок, НЕ над Controls.
- Перед изменением view-файла — ПРОЧИТАТЬ его целиком, понять что уже работает, и НЕ ломать существующий функционал.

## Чек-лист перед релизом фичи

1. `npm run build` проходит
2. `npx tsc --noEmit` без ошибок в `src/`
3. Если менял схему Prisma → `npm run db:push` локально + на Turso
4. Коммит с осмысленным русским сообщением
5. `git push origin main`
6. Проверить деплой на Vercel (https://svgpack.vercel.app или подобный URL)
7. Если на проде упало с "no such column" — схема Turso не синхронизирована, см. раздел Workflow
