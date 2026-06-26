# ICON RULES — READ BEFORE TOUCHING ICONS

> **MANDATORY.** Прочитай этот файл ЦЕЛИКОМ перед любым изменением, касающимся
> иконок: путей SVG, функции `renderSvg()`, скрипта `build-seed.js`, данных в
> `packs-data.ts`, или состава паков. Если файл не прочитан — не делай правки.
>
> Правило №0 от владельца продукта: **«Если иконки уже сделаны — не трогай их.»**
> Любое изменение путей иконок согласуется с владельцем. Правки допускаются
> только для: (а) исправления критических багов рендеринга, (б) добавления
> НОВЫХ иконок в существующие/новые паки, (в) исправления опечаток в nameRu/nameEn.

---

## 1. Что уже сделано и работает (НЕ ЛОМАТЬ)

| Часть | Файл | Что там | Статус |
|---|---|---|---|
| Источник данных | `src/lib/packs-data.ts` | 4 пака × 121 иконка, JSON-stringified SVG-тела | ✅ работает |
| Генератор | `scripts/build-seed.js` | Берёт пути из `simple-icons` (brands) и `lucide-react` (concepts) | ✅ работает (после фикса 2026-06-26) |
| Рендерер | `src/lib/svg.ts` → `renderSvg()` | Применяет конфиг кастомайзера к svg-телу | ✅ работает |
| Customizer | `src/views/customize.tsx` | 3 режима: All / Single / Multi | ✅ работает |
| Download API | `src/app/api/download/pack/route.ts` | Поддержка `cfg` (legacy) и `cfgMap` (per-icon) | ✅ работает |

**Конфигурация паков (121 иконка):**
- `web-languages` — 32 (HTML5, CSS3, JS, TS, Python, PHP, Go, Rust, Java, Kotlin, Swift, C#, C++, Dart, Scala, Elixir, Haskell, Lua, Perl, R, .NET, YAML, XML, Markdown, GraphQL, Sass, Less, SQL, JSON, CSS, Ruby)
- `js-frameworks` — 27 (React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid, Remix, Qwik, Lit, Alpine, Ember, Backbone, Meteor, Express, NestJS, Fastify, Koa, Deno, Bun, и др.)
- `dev-tools` — 34 (Git, GitHub, GitLab, Bitbucket, Docker, Kubernetes, Podman, Webpack, Vite, Rollup, esbuild, Turbopack, Babel, SWC, PostCSS, Tailwind, ESLint, Prettier, Jest, Vitest, Cypress, Playwright, Storybook, npm, Yarn, pnpm, Figma, Sketch, VS Code, Neovim, WebStorm, Postman, Terminal, Adobe XD)
- `web-concepts` — 28 (Browser, Server, API, DB, Cache, CDN, Component, Layout, Responsive, WebSocket, Webhook, OAuth, JWT, Cookie, REST, GraphQL, gRPC, Microservice, Serverless, SSR, SSG, SEO, PWA, Security, Deploy, Monitoring, Logging, CI/CD)

---

## 2. Архитектура (коротко)

```
simple-icons (npm)        ──┐
   brand logos             │
   3446 SVG paths          ├──> scripts/build-seed.js  ──> src/lib/packs-data.ts
                            │        (helpers:             (TypeScript module,
lucide-react (npm)         │         brand(),              consumed by seed-runner
   outline concepts        │         brandOnBg(),           + views/home.tsx)
   ISC license             │         lucide(), outline())
                           ─┘
```

Поток данных:
1. `build-seed.js` читает пути из `simple-icons` и `lucide-react`, прогоняет через хелперы, пишет `packs-data.ts`.
2. `packs-data.ts` импортируется `src/lib/seed-runner.ts` — используется CLI (`scripts/seed-turso.ts`) и HTTP-роутом (`src/app/api/admin/seed/route.ts`).
3. В БД каждая иконка хранится как `Icon { id, slug, nameRu, nameEn, keywords, svg, viewBox, packId }`. Поле `svg` — **только внутренности** (paths, circles, rects...) без внешнего `<svg>...</svg>`.
4. При рендере `renderSvg(svg, viewBox, cfg)` заворачивает `svg` в `<svg viewBox=...>` и применяет конфиг.

---

## 3. КРИТИЧЕСКИЕ ПРАВИЛА (нарушение = сломанный прод)

### 3.1. ВСЕ иконки используют `currentColor`

```js
// ✅ ПРАВИЛЬНО
<path fill="currentColor" stroke="none" d="..."/>          // brand
<path fill="none" stroke="currentColor" stroke-width="2".../>  // outline

// ❌ НЕЛЬЗЯ — ломает color picker в customize.tsx
<path fill="#E34F26" d="..."/>                              // захардкоженный цвет
<path stroke="#1572B6" d="..."/>                            // захардкоженный stroke
```

**Почему:** `renderSvg()` делает буквальную замену `currentColor` → `cfg.color` (строка 65 в `svg.ts`). Если в путь вшит конкретный hex — customizer не сможет его перебить (regex-негативный-lukaahead в `svg.ts` пропускает элементы с явным `fill=`/`stroke=`).

### 3.2. Brand icons = FILLED, Concept icons = OUTLINED

| Тип | Источник | Хелпер | Результирующий тег |
|---|---|---|---|
| Бренд-логотип | `simple-icons` | `brand('html5')` | `<path fill="currentColor" stroke="none" fill-rule="evenodd" d="..."/>` |
| Концепт | `lucide-react` | `outline(lucide('database'))` | несколько `<path/circle/rect/line fill="none" stroke="currentColor" .../>` |

**Не путать.** Бренд-путь нарисован под заливку. Если его обвести (stroke) — получится уродливая проволочная рамка. И наоборот: outline-иконку нельзя заливать — получится чёрное пятно.

### 3.3. Хелпер `outline()` — ОПАСНОЕ МЕСТО

```js
function outline(svg) {
  svg = svg.replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
  svg = svg.replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
  svg = svg.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*stroke=)/g, '<$1 stroke="currentColor"')
  svg = svg.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*fill=)/g, '<$1 fill="none"')
  //                                                                 ^^^ MUST be '<$1 fill="none"' — NOT '$1 fill="none"'
  return svg
}
```

⚠️ **Грабли, на которые уже наступали (2026-06-26):** если в последнем `replace` потерять ведущий `<` в replacement-строке, получится `path fill="none"...` вместо `<path fill="none"...`. Браузер игнорирует текст без `<` → иконка не рисуется. Симптом: в БД в поле `svg` строки начинаются с `path`/`circle`/`rect` без `<`. Проверка:

```bash
grep -E 'svg: "(path|circle|rect|ellipse|line|polyline)' src/lib/packs-data.ts
# Должно быть 0 строк.
```

### 3.4. Не трогать `simple-icons`/`lucide-react` пути вручную

Пути брендов — каноничные, взяты из `simple-icons` v16.24.0 (https://simpleicons.org). Если меняешь путь — добавляй комментарий, почему. Лучше — не меняй.

### 3.5. Проверка после каждого регена

После `node scripts/build-seed.js` обязательна:

```bash
# 1. Все иконки имеют хотя бы один <tag
node -e 'const c=require("fs").readFileSync("src/lib/packs-data.ts","utf8");const re=/slug:\s*"([^"]+)".*?svg:\s*"((?:[^"\\]|\\.)*)"/gms;let m,bad=[];while((m=re.exec(c))){const s=m[2].replace(/\\"/g,"\"").replace(/\\\\/g,"\\");if(!/<(path|circle|rect|ellipse|line|polyline|polygon|g)\b/.test(s))bad.push(m[1]);}console.log(bad.length?("BAD: "+bad.join(", ")):"OK: all icons have shape tags");'

# 2. Нет захардкоженных цветов (кроме white в brandOnBg)
grep -E 'fill="#[0-9A-Fa-f]{3,8}"' src/lib/packs-data.ts | grep -v '#FFFFFF'
# Должно быть 0 строк.

# 3. Все используют currentColor
grep -c 'currentColor' src/lib/packs-data.ts
# Должно быть >= 121.
```

---

## 4. Процедура деплоя после правок

```bash
# 1. Чиним build-seed.js (если нужно)
# 2. Регенерим packs-data.ts
cd /home/z/my-project && node scripts/build-seed.js

# 3. Локальная проверка (раздел 3.5)

# 4. git
git add src/lib/packs-data.ts scripts/build-seed.js docs/ICON_RULES.md
git commit -m "fix(icons): <description>"
git push origin main

# 5. Vercel авто-деплоит (~30-60 сек). Ждём READY.
# Проверка: https://svgpack.vercel.app/api/health

# 6. Триггерим пересев в проде
curl -X POST https://svgpack.vercel.app/api/admin/seed \
  -H "x-admin-token: seed_b75ae41549d90c02cf1c2721c608eb53"

# 7. Verify
curl -s https://svgpack.vercel.app/api/packs | jq '.packs[].icons[] | {slug, hasLt: (.svg | test("<"))}' | jq -s 'group_by(.hasLt) | map({hasLt: .[0].hasLt, count: length})'
# Ожидание: [{"hasLt": true, "count": 121}]
```

---

## 5. Частые ошибки и симптомы

| Симптом | Причина | Фикс |
|---|---|---|
| Иконка не отображается (пусто) | В `svg` нет ведущего `<` у тегов | Проверить `outline()` в `build-seed.js` (раздел 3.3) |
| Иконка рисуется чёрным пятном | Outline-иконку залили (`fill="currentColor"` вместо `fill="none"`) | Проверить хелпер, должен быть `outline(lucide(...))` |
| Иконка рисуется проволочной рамкой | Brand-иконку обвели (`stroke` вместо `fill`) | Использовать `brand('slug')`, не `outline(lucide(...))` |
| Color picker не меняет цвет иконки | В пути вшит `fill="#XXXXXX"` | Убрать, заменить на `currentColor` |
| Иконка выглядит слишком тонко/толсто | `stroke-width` не наследуется от `<svg>` | `renderSvg()` уже проставляет `stroke-width="${cfg.strokeWidth}"` на все shape-теги; не трогать |
| Duotone-режим красит неправильно | Иконка использует `<g>` для группировки, а `renderSvg()` чередует цвета по прямым детям | Преобразовать `<g>` в плоский список shape-тегов |

---

## 6. Список файлов, которые нужно знать

| Файл | Назначение |
|---|---|
| `docs/ICON_RULES.md` | **этот файл** — читать перед любыми правками |
| `src/lib/packs-data.ts` | Сгенерированный источник данных (НЕ править руками, регенерить через `build-seed.js`) |
| `scripts/build-seed.js` | Генератор packs-data.ts из `simple-icons` + `lucide-react` |
| `src/lib/svg.ts` | `renderSvg()` + `makeZip()` |
| `src/lib/seed-runner.ts` | `seedDatabase(prismaClient)` — общий для CLI и HTTP |
| `src/app/api/admin/seed/route.ts` | POST endpoint для пересева на проде (токен в env `ADMIN_SEED_TOKEN`) |
| `scripts/seed-turso.ts` | CLI-альтернатива (для локального запуска против dev-БД) |
| `src/views/customize.tsx` | Кастомизатор пака (3 режима редактирования) |
| `src/views/catalog.tsx` | Витрина иконок (читает из БД) |
| `src/views/home.tsx` | Превью паков на главной (читает из `packs-data.ts` напрямую) |
| `.npmrc` | `legacy-peer-deps=true` — обход конфликта peer-deps `simple-icons` vs `@prisma/adapter-libsql` |

---

## 7. История изменений иконок

| Дата | Коммит | Что |
|---|---|---|
| 2026-06-25 | 3dfbc7d7 | Начальный редизайн: 31 иконка (Simple Icons brands + Lucide concepts) |
| 2026-06-25 | b2f84be | Fix: 6 language icons рендерились пустыми (bare path data без `<path>`) |
| 2026-06-25 | c087015 | Расширение до 121 иконки, переход на `currentColor` |
| 2026-06-25 | 47794c8 | `.npmrc` для обхода peer-deps |
| 2026-06-25 | f2f1284 | `stroke="currentColor"` на всех outline-иконках |
| 2026-06-25 | 66db136 | 3 режима в customize.tsx (All / Single / Multi) |
| 2026-06-26 | (этот коммит) | Fix: `outline()` срезал ведущий `<` → 32 outline-иконки не рендерились. Создан `docs/ICON_RULES.md` |

---

## 8. Чек-лист перед коммитом

- [ ] Прочитан этот файл целиком
- [ ] Не менялись пути уже существующих иконок (только добавлены новые или исправлен критический баг)
- [ ] После `node scripts/build-seed.js` проверки раздела 3.5 проходят
- [ ] Локально `npm run dev` показывает иконки корректно
- [ ] Коммит содержит осмысленное сообщение
- [ ] После push — Vercel READY
- [ ] После `/api/admin/seed` — verify через `/api/packs`
- [ ] `worklog.md` обновлён новой секцией `---`
