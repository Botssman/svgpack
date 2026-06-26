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

## Чек-лист перед релизом фичи

1. `npm run build` проходит
2. `npx tsc --noEmit` без ошибок в `src/`
3. Если менял схему Prisma → `npm run db:push` локально + на Turso
4. Коммит с осмысленным русским сообщением
5. `git push origin main`
6. Проверить деплой на Vercel (https://svgpack.vercel.app или подобный URL)
7. Если на проде упало с "no such column" — схема Turso не синхронизирована, см. раздел Workflow
