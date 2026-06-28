/**
 * Build src/lib/packs-data.ts with high-quality SVG icons.
 *
 * Design rules (CRITICAL — do not break these):
 *   1. EVERY icon stores its inner SVG with `fill="currentColor"` and
 *      `stroke="none"`. NEVER hardcode brand colors like fill="#E34F26".
 *      Reason: the customize view lets the user pick any color via
 *      <input type="color">, and renderSvg() in src/lib/svg.ts replaces
 *      the literal `currentColor` token with the chosen color. If we
 *      hardcode a color, the customizer is broken.
 *   2. Brand logos are FILLED shapes (not stroked outlines). Stroking
 *      them produces ugly wireframes because their paths are designed
 *      to be filled.
 *   3. Concept icons (browser, server, database, etc.) are OUTLINES —
 *      they use <path fill="none" stroke="currentColor" stroke-width="2"
 *      stroke-linecap="round" stroke-linejoin="round" .../>. The
 *      renderSvg() pipeline replaces `currentColor` in stroke attrs too.
 *
 * Sources:
 *   - Brand logos: simple-icons npm package (3446+ canonical brand SVGs)
 *   - Generic concepts: lucide-react (already installed, ISC license)
 *
 * Output: /home/z/my-project/src/lib/packs-data.ts (overwrites existing).
 * Run: node /home/z/my-project/scripts/build-seed.js
 */
const fs = require('fs')
const path = require('path')
const si = require('simple-icons')

// =====================================================================
// HELPERS
// =====================================================================

/**
 * Brand logo from simple-icons → filled <path> using currentColor.
 * User can override color via the customizer.
 */
function brand(slug) {
  // simple-icons exports icons as si<PascalCase> e.g. siHtml5, siJavascript
  const key = 'si' + slug.charAt(0).toUpperCase() + slug.slice(1)
  const icon = si[key]
  if (!icon) throw new Error(`simple-icons: icon "${slug}" not found (looked for ${key})`)
  return `<path fill="currentColor" stroke="none" fill-rule="evenodd" d="${icon.path}"/>`
}

/**
 * Try to get a brand icon; if the slug doesn't exist in simple-icons,
 * fall back to a lucide outline icon so the pack still has a useful glyph.
 * This prevents the build from crashing when a brand logo is unavailable.
 *
 * @param {string} slug            simple-icons slug (camelCase key)
 * @param {string} fallbackLucide  lucide-react icon name for fallback
 * @returns {string}               SVG body string
 */
function tryBrand(slug, fallbackLucide) {
  try {
    return brand(slug)
  } catch (_) {
    return outline(lucide(fallbackLucide))
  }
}

/**
 * Brand logo wrapped in a rounded square background — useful when the
 * raw logo path is too thin / unfamiliar on its own. Background uses
 * currentColor too, foreground is white.
 */
function brandOnBg(slug) {
  const key = 'si' + slug.charAt(0).toUpperCase() + slug.slice(1)
  const icon = si[key]
  if (!icon) throw new Error(`simple-icons: icon "${slug}" not found`)
  return `<rect x="1" y="1" width="22" height="22" rx="4" fill="currentColor" stroke="none"/><g fill="#FFFFFF" stroke="none" transform="translate(4 4) scale(0.667)"><path fill-rule="evenodd" d="${icon.path}"/></g>`
}

/**
 * Lucide concept icon — outline style with stroke=currentColor.
 * Reads node_modules/lucide-react/dist/esm/icons/<name>.js
 * Handles re-export aliases (e.g. bar-chart-2 → chart-no-axes-column).
 */
const _lucideCache = new Map()
function lucide(name) {
  if (_lucideCache.has(name)) return _lucideCache.get(name)

  const iconsDir = '/home/z/my-project/node_modules/lucide-react/dist/esm/icons'
  let file = path.join(iconsDir, name + '.js')
  let src = fs.readFileSync(file, 'utf8')

  // Follow re-export aliases like: export { default } from './real-name.js'
  const aliasMatch = src.match(/export\s*\{\s*default\s*\}\s*from\s*'\.\/(.+?)\.js'/)
  if (aliasMatch) {
    file = path.join(iconsDir, aliasMatch[1] + '.js')
    src = fs.readFileSync(file, 'utf8')
  }

  const m = src.match(/const __iconNode = (\[[\s\S]+?\]);/)
  if (!m) throw new Error('could not find __iconNode in ' + name)
  // eslint-disable-next-line no-eval
  const node = eval(m[1])
  const result = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `<${tag}${a ? ' ' + a : ''}/>`
    })
    .join('')

  _lucideCache.set(name, result)
  return result
}

/**
 * Wrap an SVG body so that all stroke / fill references use currentColor.
 * Lucide icons don't include stroke="currentColor" themselves — they
 * rely on the parent <svg stroke="currentColor">. We add it explicitly
 * to each shape so the icon is self-contained and the customizer's
 * color picker works.
 */
function outline(svg) {
  // Replace any existing stroke="..." with currentColor
  svg = svg.replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
  // Replace any existing fill="..." (except "none") with currentColor
  svg = svg.replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
  // Add stroke="currentColor" to shapes that have no stroke
  svg = svg.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*stroke=)/g, '<$1 stroke="currentColor"')
  // Add fill="none" to shapes that have no fill (so they're outlines).
  // CRITICAL: replacement MUST start with '<' — without it, the leading '<'
  // gets stripped and the resulting `path fill="none"...` (no '<') is ignored
  // by the browser. See docs/ICON_RULES.md §3.3.
  svg = svg.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*fill=)/g, '<$1 fill="none"')
  return svg
}

/**
 * Build icon entry: [slug, nameRu, nameEn, keywords, svgBody]
 */
function icon(slug, nameRu, nameEn, keywords, svgBody) {
  return [slug, nameRu, nameEn, keywords, svgBody]
}

// =====================================================================
// PACKS
// =====================================================================

const PACKS = [

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY: LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'web-languages',
    nameRu: 'Языки веб-разработки',
    nameEn: 'Web Languages',
    descRu: 'HTML, CSS, JavaScript, TypeScript, Python, Go, Rust, Java, PHP, Ruby и др. — базовые знаки для маркировки стека. Цвет настраивается в редакторе.',
    descEn: 'HTML, CSS, JavaScript, TypeScript, Python, Go, Rust, Java, PHP, Ruby and more — core stack marks. Color editable in customizer.',
    category: 'languages',
    style: 'outline',
    tags: 'code,language,web,html,css,js,ts,sql,json,go,rust,java',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('html5', 'HTML5', 'HTML5', 'html,markup,web', brand('html5')),
      icon('css3', 'CSS3', 'CSS3', 'css,style,design', brand('css')),
      icon('css', 'CSS', 'CSS', 'css,style', brand('css')),
      icon('javascript', 'JavaScript', 'JavaScript', 'js,ecmascript,web', brand('javascript')),
      icon('typescript', 'TypeScript', 'TypeScript', 'ts,types,web', brand('typescript')),
      icon('python', 'Python', 'Python', 'python,backend,snake', brand('python')),
      icon('php', 'PHP', 'PHP', 'php,backend,server', brand('php')),
      icon('ruby', 'Ruby', 'Ruby', 'ruby,backend,rails', brand('ruby')),
      icon('go', 'Go', 'Go', 'go,golang,backend,google', brand('go')),
      icon('rust', 'Rust', 'Rust', 'rust,systems,backend', brand('rust')),
      icon('java', 'Java', 'Java', 'java,jvm,backend', brand('openjdk')),
      icon('kotlin', 'Kotlin', 'Kotlin', 'kotlin,jvm,android', brand('kotlin')),
      icon('swift', 'Swift', 'Swift', 'swift,apple,ios', brand('swift')),
      icon('csharp', 'C#', 'C#', 'csharp,dotnet,microsoft', tryBrand('sharp', 'hash')),
      icon('dotnet', '.NET', '.NET', 'dotnet,microsoft,framework', brand('dotnet')),
      icon('cpp', 'C++', 'C++', 'cpp,cplusplus,systems', brand('cplusplus')),
      icon('c-lang', 'C', 'C', 'c,systems,language', brand('c')),
      icon('dart', 'Dart', 'Dart', 'dart,flutter,mobile', brand('dart')),
      icon('scala', 'Scala', 'Scala', 'scala,jvm,functional', brand('scala')),
      icon('elixir', 'Elixir', 'Elixir', 'elixir,erlang,beam', brand('elixir')),
      icon('haskell', 'Haskell', 'Haskell', 'haskell,functional,pure', brand('haskell')),
      icon('lua', 'Lua', 'Lua', 'lua,scripting,game', brand('lua')),
      icon('perl', 'Perl', 'Perl', 'perl,scripting,sysadmin', brand('perl')),
      icon('r-lang', 'R', 'R', 'r,stats,datascience', brand('r')),
      icon('sql', 'SQL Database', 'SQL Database', 'sql,db,database,query', outline(lucide('database'))),
      icon('json', 'JSON', 'JSON', 'json,format,data', outline(lucide('braces'))),
      icon('yaml', 'YAML', 'YAML', 'yaml,config,data', brand('yaml')),
      icon('xml', 'XML', 'XML', 'xml,markup,data', outline(lucide('file-code'))),
      icon('markdown', 'Markdown', 'Markdown', 'md,markdown,docs', brand('markdown')),
      icon('graphql', 'GraphQL', 'GraphQL', 'graphql,api,query', brand('graphql')),
      icon('sass', 'Sass', 'Sass', 'sass,scss,style', brand('sass')),
      icon('less', 'Less', 'Less', 'less,style,css', brand('less')),
      icon('clojure', 'Clojure', 'Clojure', 'clojure,lisp,jvm', tryBrand('clojure', 'braces')),
      icon('fortran', 'Fortran', 'Fortran', 'fortran,scientific,hpc', tryBrand('fortran', 'calculator')),
      icon('julia', 'Julia', 'Julia', 'julia,scientific,numeric', tryBrand('julia', 'calculator')),
      icon('erlang', 'Erlang', 'Erlang', 'erlang,beam,telecom', tryBrand('erlang', 'phone')),
      icon('ocaml', 'OCaml', 'OCaml', 'ocaml,functional,ml', tryBrand('ocaml', 'lambda')),
      icon('fsharp', 'F#', 'F#', 'fsharp,functional,dotnet', tryBrand('fsharp', 'hash')),
      icon('apachegroovy', 'Groovy', 'Groovy', 'groovy,jvm,scripting', tryBrand('apachegroovy', 'code')),
      icon('shell', 'Shell', 'Shell', 'shell,scripting,bash', tryBrand('shell', 'square-terminal')),
      icon('gnubash', 'Bash', 'Bash', 'bash,shell,gnu', tryBrand('gnubash', 'square-terminal')),
      icon('solidity', 'Solidity', 'Solidity', 'solidity,ethereum,smartcontract', tryBrand('solidity', 'file-code-2')),
      icon('racket', 'Racket', 'Racket', 'racket,lisp,scheme', tryBrand('racket', 'lambda')),
      icon('coffeescript', 'CoffeeScript', 'CoffeeScript', 'coffeescript,js,transpile', tryBrand('coffeescript', 'coffee')),
      icon('purescript', 'PureScript', 'PureScript', 'purescript,functional,haskell', tryBrand('purescript', 'lambda')),
      icon('nim', 'Nim', 'Nim', 'nim,systems,efficient', tryBrand('nim', 'diamond')),
      icon('zig', 'Zig', 'Zig', 'zig,systems,lowlevel', tryBrand('zig', 'zap')),
      icon('wolfram', 'Wolfram', 'Wolfram', 'wolfram,mathematica,science', tryBrand('wolfram', 'braces')),
      icon('haxe', 'Haxe', 'Haxe', 'haxe,crossplatform,language', tryBrand('haxe', 'code')),
      icon('reason', 'ReasonML', 'ReasonML', 'reasonml,ocaml,web', tryBrand('reason', 'lambda')),
      icon('vala', 'Vala', 'Vala', 'vala,gnome,systems', tryBrand('vala', 'code')),
      icon('red-lang', 'Red', 'Red', 'red,rebol,language', tryBrand('red', 'circle')),
      icon('labview', 'LabVIEW', 'LabVIEW', 'labview,visual,instrument', tryBrand('labview', 'workflow')),
      icon('vlang', 'V', 'V', 'v,systems,simple', outline(lucide('diamond'))),
      icon('gleam', 'Gleam', 'Gleam', 'gleam,erlang,functional', tryBrand('gleam', 'sparkles')),
      icon('odin', 'Odin', 'Odin', 'odin,systems,language', tryBrand('odin', 'sword')),
      icon('deno', 'Deno', 'Deno', 'deno,runtime,ts', brand('deno')),
      icon('bun', 'Bun', 'Bun', 'bun,runtime,js', brand('bun')),
      icon('webassembly', 'WebAssembly', 'WebAssembly', 'wasm,binary,web', tryBrand('webassembly', 'cpu')),
      icon('assemblyscript', 'AssemblyScript', 'AssemblyScript', 'assemblyscript,wasm,typescript', tryBrand('assemblyscript', 'binary')),
      icon('toml', 'TOML', 'TOML', 'toml,config,data', tryBrand('toml', 'file-code')),
      icon('protobuf', 'Protocol Buffers', 'Protocol Buffers', 'protobuf,grpc,serialization', tryBrand('protobuf', 'layers')),
      icon('graphql-l', 'GraphQL', 'GraphQL', 'graphql,api,query', brand('graphql')),
      icon('prisma-l', 'Prisma Schema', 'Prisma Schema', 'prisma,schema,orm', tryBrand('prisma', 'database')),
      icon('regex', 'Regex', 'Regex', 'regex,pattern,search', outline(lucide('regex'))),
      icon('handlebars', 'Handlebars', 'Handlebars', 'handlebars,template,mustache', tryBrand('handlebarsdotjs', 'braces')),
      icon('pug', 'Pug', 'Pug', 'pug,template,jade', tryBrand('pug', 'code')),
      icon('mustache', 'Mustache', 'Mustache', 'mustache,template,logicless', tryBrand('mustache', 'braces')),
      icon('ejs', 'EJS', 'EJS', 'ejs,template,javascript', tryBrand('ejs', 'braces')),
      icon('htmx', 'htmx', 'htmx', 'htmx,html,hypertext', tryBrand('htmx', 'zap')),
      icon('tsx', 'TSX', 'TSX', 'tsx,react,typescript', outline(lucide('file-code-2'))),
      icon('jsx', 'JSX', 'JSX', 'jsx,react,javascript', outline(lucide('file-code-2'))),
      icon('vite-env', 'Vite Env', 'Vite Env', 'vite,env,config', outline(lucide('file-code'))),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY: FRAMEWORKS
  // ═══════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'js-frameworks',
    nameRu: 'JS-фреймворки',
    nameEn: 'JS Frameworks',
    descRu: 'React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid, Remix и др. — для маркировки стека и архитектуры. Цвет настраивается.',
    descEn: 'React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Solid, Remix and more — for stack and architecture marks. Color editable.',
    category: 'frameworks',
    style: 'outline',
    tags: 'framework,react,vue,angular,svelte,next,nuxt,astro,solid',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('react', 'React', 'React', 'react,library,frontend', brand('react')),
      icon('reactrouter', 'React Router', 'React Router', 'router,react,navigation', brand('reactrouter')),
      icon('redux', 'Redux', 'Redux', 'redux,state,react', brand('redux')),
      icon('vue', 'Vue', 'Vue', 'vue,framework,frontend', brand('vuedotjs')),
      icon('pinia', 'Pinia', 'Pinia', 'pinia,vue,state', brand('pinia')),
      icon('nuxt', 'Nuxt', 'Nuxt', 'nuxt,vue,ssr', brand('nuxt')),
      icon('angular', 'Angular', 'Angular', 'angular,framework,ts', brand('angular')),
      icon('svelte', 'Svelte', 'Svelte', 'svelte,compiler,frontend', brand('svelte')),
      icon('kit', 'SvelteKit', 'SvelteKit', 'sveltekit,framework,ssr', brand('svelte')),
      icon('solid', 'Solid', 'Solid', 'solid,reactive,frontend', brand('solid')),
      icon('astro', 'Astro', 'Astro', 'astro,static,frontend', brand('astro')),
      icon('remix', 'Remix', 'Remix', 'remix,react,ssr', brand('remix')),
      icon('nextjs', 'Next.js', 'Next.js', 'next,framework,react,ssr', brand('nextdotjs')),
      icon('gatsby', 'Gatsby', 'Gatsby', 'gatsby,react,static', brand('gatsby')),
      icon('qwik', 'Qwik', 'Qwik', 'qwik,resume,framework', brand('qwik')),
      icon('lit', 'Lit', 'Lit', 'lit,webcomponents,frontend', brand('lit')),
      icon('alpine', 'Alpine.js', 'Alpine.js', 'alpine,reactive,lightweight', brand('alpinedotjs')),
      icon('ember', 'Ember', 'Ember', 'ember,framework,frontend', brand('emberdotjs')),
      icon('backbone', 'Backbone', 'Backbone', 'backbone,mvc,frontend', brand('backbonedotjs')),
      icon('meteor', 'Meteor', 'Meteor', 'meteor,fullstack,realtime', brand('meteor')),
      icon('express', 'Express', 'Express', 'express,node,server', brand('express')),
      icon('nestjs', 'NestJS', 'NestJS', 'nestjs,node,backend', brand('nestjs')),
      icon('fastify', 'Fastify', 'Fastify', 'fastify,node,server', brand('fastify')),
      icon('koa', 'Koa', 'Koa', 'koa,node,server', tryBrand('koajs', 'server')),
      icon('nodejs', 'Node.js', 'Node.js', 'node,js,server,runtime', brand('nodedotjs')),
      icon('deno-fw', 'Deno', 'Deno', 'deno,runtime,ts', brand('deno')),
      icon('bun-fw', 'Bun', 'Bun', 'bun,runtime,js', brand('bun')),
      icon('hono', 'Hono', 'Hono', 'hono,edge,server', tryBrand('hono', 'zap')),
      icon('trpc', 'tRPC', 'tRPC', 'trpc,typescript,api', tryBrand('trpc', 'arrow-right-left')),
      icon('sailsdotjs', 'Sails.js', 'Sails.js', 'sails,node,mvc', tryBrand('sailsdotjs', 'ship')),
      icon('vite', 'Vite', 'Vite', 'vite,bundler,fast', brand('vite')),
      icon('vitepress', 'VitePress', 'VitePress', 'vitepress,docs,static', tryBrand('vitepress', 'book-open')),
      icon('vitest', 'Vitest', 'Vitest', 'vitest,test,vite', brand('vitest')),
      icon('nuxt-ui', 'Nuxt UI', 'Nuxt UI', 'nuxt,ui,components', outline(lucide('layout-grid'))),
      icon('gridsome', 'Gridsome', 'Gridsome', 'gridsome,vue,static', tryBrand('gridsome', 'grid-3x3')),
      icon('preact', 'Preact', 'Preact', 'preact,lightweight,react', tryBrand('preact', 'atom')),
      icon('stencil', 'Stencil', 'Stencil', 'stencil,webcomponents,compiler', tryBrand('stencil', 'layers')),
      icon('eleventy', 'Eleventy', 'Eleventy', '11ty,static,ssg', tryBrand('eleventy', 'hash')),
      icon('docusaurus', 'Docusaurus', 'Docusaurus', 'docs,react,static', tryBrand('docusaurus', 'book-open')),
      icon('docsify', 'Docsify', 'Docsify', 'docs,markdown,lightweight', tryBrand('docsify', 'book-open')),
      icon('gitbook', 'GitBook', 'GitBook', 'docs,git,documentation', tryBrand('gitbook', 'book-open')),
      icon('slidev', 'Slidev', 'Slidev', 'slides,markdown,developer', outline(lucide('presentation'))),
      icon('mdx', 'MDX', 'MDX', 'mdx,markdown,jsx', tryBrand('mdx', 'file-code-2')),
      icon('remark', 'Remark', 'Remark', 'remark,markdown,processor', tryBrand('remark', 'message-circle')),
      icon('biome', 'Biome', 'Biome', 'biome,linter,formatter', tryBrand('biome', 'scan')),
      icon('stylelint', 'Stylelint', 'Stylelint', 'stylelint,css,linter', tryBrand('stylelint', 'check')),
      icon('testinglibrary', 'Testing Library', 'Testing Library', 'testing,react,dom', tryBrand('testinglibrary', 'test-tubes')),
      icon('mocha', 'Mocha', 'Mocha', 'mocha,test,js', tryBrand('mocha', 'coffee')),
      icon('chai', 'Chai', 'Chai', 'chai,assertion,test', tryBrand('chai', 'check')),
      icon('avajs', 'Ava', 'Ava', 'ava,test,concurrent', tryBrand('avajs', 'zap')),
      icon('selenium', 'Selenium', 'Selenium', 'selenium,browser,automation', tryBrand('selenium', 'globe')),
      icon('puppeteer', 'Puppeteer', 'Puppeteer', 'puppeteer,chrome,automation', tryBrand('puppeteer', 'bot')),
      icon('cypress-fw', 'Cypress', 'Cypress', 'cypress,e2e,test', brand('cypress')),
      icon('testcafe', 'TestCafe', 'TestCafe', 'testcafe,e2e,browser', tryBrand('testcafe', 'coffee')),
      icon('playwright-fw', 'Playwright', 'Playwright', 'playwright,e2e,test', outline(lucide('flask-conical'))),
      icon('storybook-fw', 'Storybook', 'Storybook', 'storybook,ui,components', brand('storybook')),
      icon('i18next', 'i18next', 'i18next', 'i18next,internationalization,locale', tryBrand('i18next', 'globe')),
      icon('framer-motion', 'Framer Motion', 'Framer Motion', 'motion,animation,react', outline(lucide('move'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'backend-frameworks',
    nameRu: 'Бэкенд-фреймворки',
    nameEn: 'Backend Frameworks',
    descRu: 'Django, Flask, FastAPI, Spring, Laravel, Rails, Express, NestJS и др. — серверные фреймворки. Цвет настраивается.',
    descEn: 'Django, Flask, FastAPI, Spring, Laravel, Rails, Express, NestJS and more — server-side frameworks. Color editable.',
    category: 'frameworks',
    style: 'outline',
    tags: 'backend,server,framework,django,flask,spring,laravel,rails,api',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('django', 'Django', 'Django', 'django,python,backend', tryBrand('django', 'snake')),
      icon('flask', 'Flask', 'Flask', 'flask,python,backend', tryBrand('flask', 'flask-conical')),
      icon('fastapi', 'FastAPI', 'FastAPI', 'fastapi,python,async', tryBrand('fastapi', 'zap')),
      icon('spring', 'Spring', 'Spring', 'spring,java,backend', tryBrand('spring', 'leaf')),
      icon('laravel', 'Laravel', 'Laravel', 'laravel,php,backend', tryBrand('laravel', 'box')),
      icon('rails', 'Ruby on Rails', 'Ruby on Rails', 'rails,ruby,backend', tryBrand('rubyonrails', 'train-front')),
      icon('sinatra', 'Sinatra', 'Sinatra', 'sinatra,ruby,lightweight', tryBrand('rubysinatra', 'music')),
      icon('symfony', 'Symfony', 'Symfony', 'symfony,php,backend', tryBrand('symfony', 'layers')),
      icon('adonisjs', 'AdonisJS', 'AdonisJS', 'adonis,node,backend', tryBrand('adonisjs', 'leaf')),
      icon('express-bk', 'Express', 'Express', 'express,node,server', brand('express')),
      icon('nestjs-bk', 'NestJS', 'NestJS', 'nestjs,node,backend', brand('nestjs')),
      icon('fastify-bk', 'Fastify', 'Fastify', 'fastify,node,server', brand('fastify')),
      icon('koa-bk', 'Koa', 'Koa', 'koa,node,server', tryBrand('koajs', 'server')),
      icon('hapi', 'Hapi', 'Hapi', 'hapi,node,server', outline(lucide('server'))),
      icon('hono-bk', 'Hono', 'Hono', 'hono,edge,server', tryBrand('hono', 'zap')),
      icon('gin', 'Gin', 'Gin', 'gin,go,backend', tryBrand('gin', 'zap')),
      icon('fiber', 'Fiber', 'Fiber', 'fiber,go,backend', outline(lucide('zap'))),
      icon('actix', 'Actix', 'Actix', 'actix,rust,backend', tryBrand('actix', 'zap')),
      icon('rocket', 'Rocket', 'Rocket', 'rocket,rust,backend', tryBrand('rocket', 'rocket')),
      icon('phoenix', 'Phoenix', 'Phoenix', 'phoenix,elixir,backend', tryBrand('phoenixframework', 'flame')),
      icon('aspnet', 'ASP.NET', 'ASP.NET', 'aspnet,dotnet,backend', tryBrand('dotnet', 'server')),
      icon('buffalo', 'Buffalo', 'Buffalo', 'buffalo,go,backend', outline(lucide('server'))),
      icon('strapi', 'Strapi', 'Strapi', 'strapi,cms,node', tryBrand('strapi', 'database')),
      icon('keystone', 'Keystone', 'Keystone', 'keystone,cms,graphql', tryBrand('keystone', 'key')),
      icon('sanity', 'Sanity', 'Sanity', 'sanity,cms,headless', tryBrand('sanity', 'layers')),
      icon('payloadcms', 'Payload CMS', 'Payload CMS', 'payload,cms,node', tryBrand('payloadcms', 'database')),
      icon('directus', 'Directus', 'Directus', 'directus,cms,headless', tryBrand('directus', 'database')),
      icon('contentful', 'Contentful', 'Contentful', 'contentful,cms,headless', tryBrand('contentful', 'layers')),
      icon('medusa', 'Medusa', 'Medusa', 'medusa,commerce,node', tryBrand('medusa', 'shopping-cart')),
      icon('saleor', 'Saleor', 'Saleor', 'saleor,commerce,graphql', outline(lucide('shopping-cart'))),
      icon('hasura', 'Hasura', 'Hasura', 'hasura,graphql,engine', tryBrand('hasura', 'database')),
      icon('supabase-bk', 'Supabase', 'Supabase', 'supabase,baas,postgres', tryBrand('supabase', 'database')),
      icon('appwrite', 'Appwrite', 'Appwrite', 'appwrite,baas,opensource', tryBrand('appwrite', 'database')),
      icon('nhost', 'Nhost', 'Nhost', 'nhost,baas,graphql', tryBrand('nhost', 'database')),
      icon('pocketbase', 'PocketBase', 'PocketBase', 'pocketbase,baas,go', tryBrand('pocketbase', 'database')),
      icon('firebase-bk', 'Firebase', 'Firebase', 'firebase,baas,google', tryBrand('firebase', 'database')),
      icon('wordpress', 'WordPress', 'WordPress', 'wordpress,cms,php', tryBrand('wordpress', 'file-text')),
      icon('drupal', 'Drupal', 'Drupal', 'drupal,cms,php', tryBrand('drupal', 'file-text')),
      icon('joomla', 'Joomla', 'Joomla', 'joomla,cms,php', tryBrand('joomla', 'file-text')),
      icon('ghost', 'Ghost', 'Ghost', 'ghost,cms,node', tryBrand('ghost', 'ghost')),
      icon('webflow', 'Webflow', 'Webflow', 'webflow,cms,visual', tryBrand('webflow', 'layout-grid')),
      icon('wix', 'Wix', 'Wix', 'wix,cms,website', tryBrand('wix', 'layout-grid')),
      icon('squarespace', 'Squarespace', 'Squarespace', 'squarespace,cms,website', tryBrand('squarespace', 'layout-grid')),
      icon('craftcms', 'Craft CMS', 'Craft CMS', 'craft,cms,php', tryBrand('craftcms', 'hammer')),
      icon('statamic', 'Statamic', 'Statamic', 'statamic,cms,flatfile', tryBrand('statamic', 'file-text')),
      icon('hubspot', 'HubSpot', 'HubSpot', 'hubspot,cms,marketing', tryBrand('hubspot', 'megaphone')),
      icon('shopify', 'Shopify', 'Shopify', 'shopify,commerce,store', tryBrand('shopify', 'shopping-bag')),
      icon('woocommerce', 'WooCommerce', 'WooCommerce', 'woocommerce,commerce,wordpress', tryBrand('woocommerce', 'shopping-cart')),
      icon('magento', 'Magento', 'Magento', 'magento,commerce,php', tryBrand('magento', 'shopping-cart')),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'css-frameworks',
    nameRu: 'CSS-фреймворки',
    nameEn: 'CSS Frameworks',
    descRu: 'Tailwind CSS, Bootstrap, Bulma, Material UI, Chakra UI, Ant Design, Sass и др. — фреймворки и инструменты стилизации. Цвет настраивается.',
    descEn: 'Tailwind CSS, Bootstrap, Bulma, Material UI, Chakra UI, Ant Design, Sass and more — styling frameworks & tools. Color editable.',
    category: 'frameworks',
    style: 'outline',
    tags: 'css,style,framework,tailwind,bootstrap,bulma,sass,design',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('tailwindcss', 'Tailwind CSS', 'Tailwind CSS', 'tailwind,css,utility', tryBrand('tailwindcss', 'wind')),
      icon('bootstrap', 'Bootstrap', 'Bootstrap', 'bootstrap,css,component', tryBrand('bootstrap', 'layout-grid')),
      icon('bulma', 'Bulma', 'Bulma', 'bulma,css,flexbox', tryBrand('bulma', 'layout-grid')),
      icon('foundation', 'Foundation', 'Foundation', 'foundation,css,responsive', tryBrand('foundation', 'layout-grid')),
      icon('materialui', 'Material UI', 'Material UI', 'mui,material,react,components', tryBrand('materialdesign', 'palette')),
      icon('chakraui', 'Chakra UI', 'Chakra UI', 'chakra,react,components', tryBrand('chakraui', 'zap')),
      icon('antdesign', 'Ant Design', 'Ant Design', 'ant,react,components', tryBrand('antdesign', 'layout-grid')),
      icon('radixui', 'Radix UI', 'Radix UI', 'radix,react,headless', tryBrand('radixui', 'layers')),
      icon('headlessui', 'Headless UI', 'Headless UI', 'headless,react,components', tryBrand('headlessui', 'eye')),
      icon('mantine', 'Mantine', 'Mantine', 'mantine,react,components', tryBrand('mantine', 'palette')),
      icon('styledcomponents', 'Styled Components', 'Styled Components', 'styled,react,cssinjs', tryBrand('styledcomponents', 'paintbrush')),
      icon('emotion', 'Emotion', 'Emotion', 'emotion,cssinjs,react', tryBrand('emotion', 'palette')),
      icon('cssmodules', 'CSS Modules', 'CSS Modules', 'cssmodules,modular,scope', tryBrand('cssmodules', 'file-code')),
      icon('postcss-fw', 'PostCSS', 'PostCSS', 'postcss,css,transform', tryBrand('postcss', 'settings')),
      icon('sass-fw', 'Sass', 'Sass', 'sass,scss,preprocessor', tryBrand('sass', 'paintbrush')),
      icon('less-fw', 'Less', 'Less', 'less,preprocessor,css', tryBrand('less', 'paintbrush')),
      icon('stylus', 'Stylus', 'Stylus', 'stylus,preprocessor,css', tryBrand('stylus', 'pen-line')),
      icon('unocss', 'UnoCSS', 'UnoCSS', 'unocss,atomic,instant', tryBrand('unocss', 'zap')),
      icon('windicss', 'Windi CSS', 'Windi CSS', 'windi,utility,css', tryBrand('windicss', 'wind')),
      icon('twind', 'Twind', 'Twind', 'twind,utility,runtime', tryBrand('twind', 'zap')),
      icon('openprops', 'Open Props', 'Open Props', 'openprops,css,properties', outline(lucide('settings'))),
      icon('vanillaextract', 'Vanilla Extract', 'Vanilla Extract', 'vanillaextract,css,typescript', outline(lucide('ice-cream-cone'))),
      icon('pandacss', 'Panda CSS', 'Panda CSS', 'pandacss,atomic,typescript', outline(lucide('palette'))),
      icon('classvarianceauthority', 'CVA', 'CVA', 'cVA,variants,components', outline(lucide('layers'))),
      icon('tailwindvariants', 'Tailwind Variants', 'Tailwind Variants', 'variants,tailwind,components', outline(lucide('layers'))),
      icon('pencss', 'Pen CSS', 'Pen CSS', 'pen,css,styling', outline(lucide('pen-line'))),
      icon('shadcnui', 'shadcn/ui', 'shadcn/ui', 'shadcn,components,react', outline(lucide('component'))),
      icon('reakit', 'Reakit', 'Reakit', 'reakit,react,accessible', outline(lucide('accessibility'))),
      icon('reachui', 'Reach UI', 'Reach UI', 'reach,react,accessible', outline(lucide('accessibility'))),
      icon('arkui', 'Ark UI', 'Ark UI', 'ark,headless,components', outline(lucide('box'))),
      icon('radixthemes', 'Radix Themes', 'Radix Themes', 'radix,themes,components', outline(lucide('palette'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'mobile-frameworks',
    nameRu: 'Мобильная разработка',
    nameEn: 'Mobile Development',
    descRu: 'Flutter, React Native, Expo, Ionic, SwiftUI, Unity и др. — фреймворки и инструменты мобильной разработки. Цвет настраивается.',
    descEn: 'Flutter, React Native, Expo, Ionic, SwiftUI, Unity and more — mobile dev frameworks & tools. Color editable.',
    category: 'frameworks',
    style: 'outline',
    tags: 'mobile,app,ios,android,flutter,reactnative,expo,ionic',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('reactnative', 'React Native', 'React Native', 'reactnative,mobile,react', tryBrand('reactnative', 'smartphone')),
      icon('flutter', 'Flutter', 'Flutter', 'flutter,dart,mobile', tryBrand('flutter', 'smartphone')),
      icon('expo', 'Expo', 'Expo', 'expo,reactnative,mobile', tryBrand('expo', 'smartphone')),
      icon('ionic', 'Ionic', 'Ionic', 'ionic,hybrid,mobile', tryBrand('ionic', 'smartphone')),
      icon('capacitor', 'Capacitor', 'Capacitor', 'capacitor,ionic,hybrid', tryBrand('capacitor', 'plug')),
      icon('swiftui', 'SwiftUI', 'SwiftUI', 'swiftui,apple,ios', tryBrand('swiftui', 'pen-tool')),
      icon('kotlinmultiplatform', 'Kotlin Multiplatform', 'Kotlin Multiplatform', 'kmp,kotlin,multiplatform', tryBrand('kotlin', 'layers')),
      icon('nativescript', 'NativeScript', 'NativeScript', 'nativescript,mobile,js', tryBrand('nativescript', 'smartphone')),
      icon('xamarin', 'Xamarin', 'Xamarin', 'xamarin,microsoft,dotnet', tryBrand('xamarin', 'smartphone')),
      icon('cordova', 'Apache Cordova', 'Apache Cordova', 'cordova,hybrid,mobile', tryBrand('apachecordova', 'plug')),
      icon('phonegap', 'PhoneGap', 'PhoneGap', 'phonegap,cordova,hybrid', tryBrand('phonegap', 'smartphone')),
      icon('appcelerator', 'Appcelerator', 'Appcelerator', 'appcelerator,titanium,mobile', tryBrand('appcelerator', 'zap')),
      icon('corona', 'Corona SDK', 'Corona SDK', 'corona,lua,game,mobile', tryBrand('coronaengine', 'flame')),
      icon('unity', 'Unity', 'Unity', 'unity,game,engine,crossplatform', tryBrand('unity', 'box')),
      icon('unrealengine', 'Unreal Engine', 'Unreal Engine', 'unreal,game,engine', tryBrand('unrealengine', 'hexagon')),
      icon('dotnetmaui', '.NET MAUI', '.NET MAUI', 'maui,dotnet,crossplatform', tryBrand('dotnet', 'smartphone')),
      icon('appium', 'Appium', 'Appium', 'appium,test,mobile', outline(lucide('smartphone'))),
      icon('realm-fw', 'Realm', 'Realm', 'realm,mongodb,mobile', tryBrand('realm', 'database')),
      icon('apollo', 'Apollo', 'Apollo', 'apollo,graphql,mobile', tryBrand('apollographql', 'rocket')),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY: TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'dev-tools',
    nameRu: 'Инструменты разработчика',
    nameEn: 'Developer Tools',
    descRu: 'Git, GitHub, Docker, VS Code, Vim, ESLint, Webpack, Vite, npm, pnpm и др. — ежедневный набор. Цвет настраивается.',
    descEn: 'Git, GitHub, Docker, VS Code, Vim, ESLint, Webpack, Vite, npm, pnpm and more — daily driver set. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'tool,git,docker,webpack,vite,npm,terminal,figma,vscode',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('git', 'Git', 'Git', 'git,vcs,version', brand('git')),
      icon('github', 'GitHub', 'GitHub', 'github,vcs,repo', brand('github')),
      icon('gitlab', 'GitLab', 'GitLab', 'gitlab,vcs,repo', brand('gitlab')),
      icon('bitbucket', 'Bitbucket', 'Bitbucket', 'bitbucket,vcs,atlassian', brand('bitbucket')),
      icon('docker', 'Docker', 'Docker', 'docker,container,devops', brand('docker')),
      icon('kubernetes', 'Kubernetes', 'Kubernetes', 'k8s,container,orchestration', brand('kubernetes')),
      icon('podman', 'Podman', 'Podman', 'podman,container,daemonless', tryBrand('podman', 'box')),
      icon('webpack', 'Webpack', 'Webpack', 'webpack,bundler,build', brand('webpack')),
      icon('vite-dt', 'Vite', 'Vite', 'vite,bundler,fast', brand('vite')),
      icon('rollup', 'Rollup', 'Rollup', 'rollup,bundler,esm', tryBrand('rollupdotjs', 'package')),
      icon('esbuild', 'esbuild', 'esbuild', 'esbuild,bundler,fast', tryBrand('esbuild', 'zap')),
      icon('turborepo', 'Turbopack', 'Turbopack', 'turbo,bundler,monorepo', tryBrand('turborepo', 'zap')),
      icon('babel', 'Babel', 'Babel', 'babel,transpiler,js', tryBrand('babel', 'code')),
      icon('swc', 'SWC', 'SWC', 'swc,compiler,rust', tryBrand('swc', 'zap')),
      icon('postcss', 'PostCSS', 'PostCSS', 'postcss,css,transform', tryBrand('postcss', 'settings')),
      icon('tailwind-dt', 'Tailwind CSS', 'Tailwind CSS', 'tailwind,css,utility', tryBrand('tailwindcss', 'wind')),
      icon('eslint', 'ESLint', 'ESLint', 'eslint,linter,js', tryBrand('eslint', 'check')),
      icon('prettier', 'Prettier', 'Prettier', 'prettier,formatter,code', tryBrand('prettier', 'sparkles')),
      icon('jest', 'Jest', 'Jest', 'jest,test,js', tryBrand('jest', 'check-circle')),
      icon('vitest-dt', 'Vitest', 'Vitest', 'vitest,test,vite', tryBrand('vitest', 'flask-conical')),
      icon('cypress-dt', 'Cypress', 'Cypress', 'cypress,e2e,test', tryBrand('cypress', 'shield-check')),
      icon('playwright-dt', 'Playwright', 'Playwright', 'playwright,e2e,test', outline(lucide('flask-conical'))),
      icon('storybook-dt', 'Storybook', 'Storybook', 'storybook,ui,components', tryBrand('storybook', 'book-open')),
      icon('npm', 'npm', 'npm', 'npm,package,registry', tryBrand('npm', 'package')),
      icon('yarn', 'Yarn', 'Yarn', 'yarn,package,node', tryBrand('yarn', 'package')),
      icon('pnpm', 'pnpm', 'pnpm', 'pnpm,package,fast', tryBrand('pnpm', 'package')),
      icon('terminal', 'Terminal', 'Terminal', 'terminal,shell,cli', outline(lucide('square-terminal'))),
      icon('figma', 'Figma', 'Figma', 'figma,design,ui', tryBrand('figma', 'pen-tool')),
      icon('sketch', 'Sketch', 'Sketch', 'sketch,design,ui', tryBrand('sketch', 'pen-tool')),
      icon('adobexd', 'Adobe XD', 'Adobe XD', 'xd,design,adobe', outline(lucide('pen-tool'))),
      icon('vscode', 'VS Code', 'VS Code', 'vscode,editor,ide', tryBrand('vscodium', 'code')),
      icon('neovim', 'Neovim', 'Neovim', 'neovim,editor,vim', tryBrand('neovim', 'terminal')),
      icon('webstorm', 'WebStorm', 'WebStorm', 'webstorm,ide,jetbrains', tryBrand('webstorm', 'code')),
      icon('postman', 'Postman', 'Postman', 'postman,api,test', tryBrand('postman', 'send')),
      icon('intellijidea', 'IntelliJ IDEA', 'IntelliJ IDEA', 'intellij,ide,jetbrains', tryBrand('intellijidea', 'code')),
      icon('pycharm', 'PyCharm', 'PyCharm', 'pycharm,ide,jetbrains', tryBrand('pycharm', 'code')),
      icon('rubymine', 'RubyMine', 'RubyMine', 'rubymine,ide,jetbrains', tryBrand('rubymine', 'code')),
      icon('phpstorm', 'PhpStorm', 'PhpStorm', 'phpstorm,ide,jetbrains', tryBrand('phpstorm', 'code')),
      icon('rider', 'Rider', 'Rider', 'rider,ide,dotnet,jetbrains', tryBrand('rider', 'code')),
      icon('clion', 'CLion', 'CLion', 'clion,ide,c,jetbrains', tryBrand('clion', 'code')),
      icon('datagrip', 'DataGrip', 'DataGrip', 'datagrip,ide,db,jetbrains', tryBrand('datagrip', 'database')),
      icon('goland', 'GoLand', 'GoLand', 'goland,ide,go,jetbrains', tryBrand('goland', 'code')),
      icon('eclipseide', 'Eclipse', 'Eclipse', 'eclipse,ide,java', tryBrand('eclipseide', 'code')),
      icon('xcode', 'Xcode', 'Xcode', 'xcode,ide,apple', tryBrand('xcode', 'code')),
      icon('androidstudio', 'Android Studio', 'Android Studio', 'androidstudio,ide,google', tryBrand('androidstudio', 'smartphone')),
      icon('codesandbox', 'CodeSandbox', 'CodeSandbox', 'codesandbox,cloud,editor', tryBrand('codesandbox', 'code')),
      icon('stackblitz', 'StackBlitz', 'StackBlitz', 'stackblitz,cloud,editor', tryBrand('stackblitz', 'zap')),
      icon('gitpod', 'Gitpod', 'Gitpod', 'gitpod,cloud,ide', tryBrand('gitpod', 'code')),
      icon('replit', 'Replit', 'Replit', 'replit,cloud,editor', tryBrand('replit', 'code')),
      icon('glitch', 'Glitch', 'Glitch', 'glitch,cloud,editor', tryBrand('glitch', 'code')),
      icon('lerna', 'Lerna', 'Lerna', 'lerna,monorepo,node', tryBrand('lerna', 'layers')),
      icon('nx', 'Nx', 'Nx', 'nx,monorepo,build', tryBrand('nx', 'box')),
      icon('codepen', 'CodePen', 'CodePen', 'codepen,editor,playground', outline(lucide('codepen'))),
      icon('excalidraw', 'Excalidraw', 'Excalidraw', 'excalidraw,whiteboard,drawing', tryBrand('excalidraw', 'pen-tool')),
      icon('insomnia', 'Insomnia', 'Insomnia', 'insomnia,api,rest', tryBrand('insomnia', 'moon')),
      icon('hoppscotch', 'Hoppscotch', 'Hoppscotch', 'hoppscotch,api,opensource', tryBrand('hoppscotch', 'send')),
      icon('sourcetree', 'SourceTree', 'SourceTree', 'sourcetree,git,atlassian', tryBrand('sourcetree', 'git-branch')),
      icon('towergit', 'Tower', 'Tower', 'tower,git,client', tryBrand('towergit', 'git-branch')),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'databases',
    nameRu: 'Базы данных',
    nameEn: 'Databases',
    descRu: 'MongoDB, PostgreSQL, MySQL, Redis, SQLite, Supabase, Prisma, Firebase и др. — иконки БД и ORM. Цвет настраивается.',
    descEn: 'MongoDB, PostgreSQL, MySQL, Redis, SQLite, Supabase, Prisma, Firebase and more — database & ORM icons. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'database,db,sql,nosql,orm,storage,mongodb,postgres,mysql,redis',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('mongodb', 'MongoDB', 'MongoDB', 'mongodb,nosql,document', tryBrand('mongodb', 'database')),
      icon('mysql', 'MySQL', 'MySQL', 'mysql,sql,relational', tryBrand('mysql', 'database')),
      icon('postgresql', 'PostgreSQL', 'PostgreSQL', 'postgres,sql,relational', tryBrand('postgresql', 'database')),
      icon('redis', 'Redis', 'Redis', 'redis,cache,keyvalue', tryBrand('redis', 'database')),
      icon('sqlite', 'SQLite', 'SQLite', 'sqlite,embedded,sql', tryBrand('sqlite', 'database')),
      icon('supabase-db', 'Supabase', 'Supabase', 'supabase,baas,postgres', tryBrand('supabase', 'database')),
      icon('prisma-db', 'Prisma', 'Prisma', 'prisma,orm,node', tryBrand('prisma', 'database')),
      icon('firebase-db', 'Firebase', 'Firebase', 'firebase,baas,google', tryBrand('firebase', 'database')),
      icon('elasticsearch', 'Elasticsearch', 'Elasticsearch', 'elastic,search,analytics', tryBrand('elasticsearch', 'search')),
      icon('couchdb', 'CouchDB', 'CouchDB', 'couchdb,nosql,document', tryBrand('apachecouchdb', 'database')),
      icon('mariadb', 'MariaDB', 'MariaDB', 'mariadb,sql,relational', tryBrand('mariadb', 'database')),
      icon('neo4j', 'Neo4j', 'Neo4j', 'neo4j,graph,nosql', tryBrand('neo4j', 'network')),
      icon('cassandra', 'Cassandra', 'Cassandra', 'cassandra,nosql,widecolumn', tryBrand('apachecassandra', 'database')),
      icon('influxdb', 'InfluxDB', 'InfluxDB', 'influxdb,timeseries,metrics', tryBrand('influxdb', 'activity')),
      icon('cockroachdb', 'CockroachDB', 'CockroachDB', 'cockroachdb,sql,distributed', tryBrand('cockroachlabs', 'database')),
      icon('planetscale', 'PlanetScale', 'PlanetScale', 'planetscale,mysql,serverless', tryBrand('planetscale', 'database')),
      icon('faunadb', 'FaunaDB', 'FaunaDB', 'fauna,serverless,nosql', tryBrand('fauna', 'database')),
      icon('dynamodb', 'DynamoDB', 'DynamoDB', 'dynamodb,aws,nosql,keyvalue', tryBrand('amazondynamodb', 'database')),
      icon('firestore', 'Firestore', 'Firestore', 'firestore,google,nosql,document', tryBrand('firestore', 'database')),
      icon('realm-db', 'Realm', 'Realm', 'realm,mongodb,mobile', tryBrand('realm', 'database')),
      icon('sequelize', 'Sequelize', 'Sequelize', 'sequelize,orm,node', tryBrand('sequelize', 'database')),
      icon('typeorm', 'TypeORM', 'TypeORM', 'typeorm,orm,node', tryBrand('typeorm', 'database')),
      icon('mongoose', 'Mongoose', 'Mongoose', 'mongoose,mongodb,odm', tryBrand('mongoose', 'database')),
      icon('drizzle', 'Drizzle', 'Drizzle', 'drizzle,orm,typescript', tryBrand('drizzle', 'database')),
      icon('knex', 'Knex.js', 'Knex.js', 'knex,querybuilder,sql', tryBrand('knexdotjs', 'database')),
      icon('flyway', 'Flyway', 'Flyway', 'flyway,migration,sql', tryBrand('flyway', 'database')),
      icon('liquibase', 'Liquibase', 'Liquibase', 'liquibase,migration,sql', tryBrand('liquibase', 'database')),
      icon('dbeaver', 'DBeaver', 'DBeaver', 'dbeaver,sql,gui', tryBrand('dbeaver', 'database')),
      icon('datagrip-db', 'DataGrip', 'DataGrip', 'datagrip,ide,db', tryBrand('datagrip', 'database')),
      icon('phpmyadmin', 'phpMyAdmin', 'phpMyAdmin', 'phpmyadmin,mysql,web', tryBrand('phpmyadmin', 'database')),
      icon('adminer', 'Adminer', 'Adminer', 'adminer,db,web', tryBrand('adminer', 'database')),
      icon('redisinsight', 'RedisInsight', 'RedisInsight', 'redisinsight,redis,gui', outline(lucide('database'))),
      icon('prismastudio', 'Prisma Studio', 'Prisma Studio', 'prisma,studio,gui', tryBrand('prisma', 'table')),
      icon('mongocompass', 'MongoDB Compass', 'MongoDB Compass', 'mongodb,compass,gui', outline(lucide('compass'))),
      icon('mikroorm', 'MikroORM', 'MikroORM', 'mikroorm,orm,typescript', outline(lucide('database'))),
      icon('kysely', 'Kysely', 'Kysely', 'kysely,querybuilder,typescript', outline(lucide('database'))),
      icon('appwrite-db', 'Appwrite', 'Appwrite', 'appwrite,baas,database', tryBrand('appwrite', 'database')),
      icon('pocketbase-db', 'PocketBase', 'PocketBase', 'pocketbase,baas,database', tryBrand('pocketbase', 'database')),
      icon('nhost-db', 'Nhost', 'Nhost', 'nhost,baas,postgres', tryBrand('nhost', 'database')),
      icon('hasura-db', 'Hasura', 'Hasura', 'hasura,graphql,postgres', tryBrand('hasura', 'database')),
      icon('rockset', 'Rockset', 'Rockset', 'rockset,search,analytics', tryBrand('rocksdb', 'database')),
      icon('scylladb', 'ScyllaDB', 'ScyllaDB', 'scylla,nosql,cassandra', outline(lucide('database'))),
      icon('timescaledb', 'TimescaleDB', 'TimescaleDB', 'timescale,postgres,timeseries', outline(lucide('clock'))),
      icon('clickhouse', 'ClickHouse', 'ClickHouse', 'clickhouse,olap,analytics', tryBrand('clickhouse', 'database')),
      icon('snowflake-db', 'Snowflake', 'Snowflake', 'snowflake,datawarehouse,cloud', tryBrand('snowflake', 'database')),
      icon('databricks-db', 'Databricks', 'Databricks', 'databricks,lakehouse,spark', tryBrand('databricks', 'database')),
      icon('amazonrds', 'Amazon RDS', 'Amazon RDS', 'rds,aws,sql', tryBrand('amazonrds', 'database')),
      icon('googlecloudsql', 'Google Cloud SQL', 'Google Cloud SQL', 'cloudsql,gcp,sql', tryBrand('googlecloudsql', 'database')),
      icon('azuresql', 'Azure SQL', 'Azure SQL', 'azure,sql,microsoft', outline(lucide('database'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'cloud-hosting',
    nameRu: 'Облачные платформы',
    nameEn: 'Cloud & Hosting',
    descRu: 'AWS, Google Cloud, Azure, Vercel, Netlify, Cloudflare, DigitalOcean и др. — облачные платформы и хостинг. Цвет настраивается.',
    descEn: 'AWS, Google Cloud, Azure, Vercel, Netlify, Cloudflare, DigitalOcean and more — cloud platforms & hosting. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'cloud,hosting,server,deploy,aws,azure,gcp,vercel,netlify',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('aws', 'AWS', 'AWS', 'aws,amazon,cloud', tryBrand('amazonaws', 'cloud')),
      icon('googlecloud', 'Google Cloud', 'Google Cloud', 'gcp,google,cloud', tryBrand('googlecloud', 'cloud')),
      icon('azure', 'Azure', 'Azure', 'azure,microsoft,cloud', tryBrand('microsoftazure', 'cloud')),
      icon('digitalocean', 'DigitalOcean', 'DigitalOcean', 'digitalocean,cloud,vps', tryBrand('digitalocean', 'cloud')),
      icon('heroku', 'Heroku', 'Heroku', 'heroku,paas,cloud', outline(lucide('cloud'))),
      icon('vercel', 'Vercel', 'Vercel', 'vercel,deploy,frontend', tryBrand('vercel', 'triangle')),
      icon('netlify', 'Netlify', 'Netlify', 'netlify,deploy,jamstack', tryBrand('netlify', 'globe')),
      icon('cloudflare', 'Cloudflare', 'Cloudflare', 'cloudflare,cdn,dns', tryBrand('cloudflare', 'shield')),
      icon('cloudflarepages', 'Cloudflare Pages', 'Cloudflare Pages', 'cloudflare,pages,jamstack', tryBrand('cloudflarepages', 'file-text')),
      icon('cloudflareworkers', 'Cloudflare Workers', 'Cloudflare Workers', 'cloudflare,workers,edge', tryBrand('cloudflareworkers', 'zap')),
      icon('linode', 'Linode', 'Linode', 'linode,cloud,vps', tryBrand('linode', 'server')),
      icon('vultr', 'Vultr', 'Vultr', 'vultr,cloud,vps', tryBrand('vultr', 'server')),
      icon('railway', 'Railway', 'Railway', 'railway,paas,deploy', tryBrand('railway', 'train-front')),
      icon('render', 'Render', 'Render', 'render,paas,cloud', tryBrand('render', 'cloud')),
      icon('flyio', 'Fly.io', 'Fly.io', 'flyio,edge,deploy', tryBrand('flydotio', 'cloud')),
      icon('scaleway', 'Scaleway', 'Scaleway', 'scaleway,cloud,europe', tryBrand('scaleway', 'server')),
      icon('ovh', 'OVH', 'OVH', 'ovh,hosting,europe', tryBrand('ovh', 'server')),
      icon('hetzner', 'Hetzner', 'Hetzner', 'hetzner,hosting,europe', tryBrand('hetzner', 'server')),
      icon('oraclecloud', 'Oracle Cloud', 'Oracle Cloud', 'oracle,cloud,server', outline(lucide('cloud'))),
      icon('alibabacloud', 'Alibaba Cloud', 'Alibaba Cloud', 'alibaba,cloud,china', tryBrand('alibabacloud', 'cloud')),
      icon('upcloud', 'UpCloud', 'UpCloud', 'upcloud,cloud,vps', tryBrand('upcloud', 'server')),
      icon('contabo', 'Contabo', 'Contabo', 'contabo,vps,hosting', tryBrand('contabo', 'server')),
      icon('hostinger', 'Hostinger', 'Hostinger', 'hostinger,web,hosting', tryBrand('hostinger', 'globe')),
      icon('wpengine', 'WP Engine', 'WP Engine', 'wpengine,wordpress,managed', tryBrand('wpengine', 'server')),
      icon('kinsta', 'Kinsta', 'Kinsta', 'kinsta,wordpress,managed', tryBrand('kinsta', 'server')),
      icon('pantheon', 'Pantheon', 'Pantheon', 'pantheon,drupal,wordpress', tryBrand('pantheon', 'server')),
      icon('platformsh', 'Platform.sh', 'Platform.sh', 'platform,paas,cloud', tryBrand('platformdotsh', 'cloud')),
      icon('clevercloud', 'Clever Cloud', 'Clever Cloud', 'clevercloud,paas,europe', tryBrand('clevercloud', 'cloud')),
      icon('denodeploy', 'Deno Deploy', 'Deno Deploy', 'deno,deploy,edge', tryBrand('denodeploy', 'globe')),
      icon('supabase-cloud', 'Supabase', 'Supabase', 'supabase,baas,cloud', tryBrand('supabase', 'database')),
      icon('firebase-cloud', 'Firebase', 'Firebase', 'firebase,baas,google', tryBrand('firebase', 'database')),
      icon('begin', 'Begin', 'Begin', 'begin,serverless,aws', outline(lucide('cloud'))),
      icon('flightcontrol', 'Flightcontrol', 'Flightcontrol', 'flightcontrol,aws,deploy', outline(lucide('cloud'))),
      icon('koyeb', 'Koyeb', 'Koyeb', 'koyeb,serverless,edge', outline(lucide('cloud'))),
      icon('northflank', 'Northflank', 'Northflank', 'northflank,platform,deploy', outline(lucide('cloud'))),
      icon('porter', 'Porter', 'Porter', 'porter,deploy,kubernetes', outline(lucide('cloud'))),
      icon('qovery', 'Qovery', 'Qovery', 'qovery,paas,kubernetes', outline(lucide('cloud'))),
      icon('shuttle', 'Shuttle', 'Shuttle', 'shuttle,rust,deploy', tryBrand('shuttle', 'rocket')),
      icon('zeabur', 'Zeabur', 'Zeabur', 'zeabur,deploy,cloud', outline(lucide('cloud'))),
      icon('kamatera', 'Kamatera', 'Kamatera', 'kamatera,cloud,vps', outline(lucide('server'))),
      icon('dreamhost', 'DreamHost', 'DreamHost', 'dreamhost,hosting,web', outline(lucide('globe'))),
      icon('bluehost', 'Bluehost', 'Bluehost', 'bluehost,hosting,web', outline(lucide('globe'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'devops',
    nameRu: 'DevOps',
    nameEn: 'DevOps',
    descRu: 'Jenkins, Terraform, Ansible, Docker, Kubernetes, Prometheus, Grafana и др. — инструменты DevOps. Цвет настраивается.',
    descEn: 'Jenkins, Terraform, Ansible, Docker, Kubernetes, Prometheus, Grafana and more — DevOps tools. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'devops,ci,cd,pipeline,terraform,ansible,docker,kubernetes,monitoring',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('jenkins', 'Jenkins', 'Jenkins', 'jenkins,ci,automation', tryBrand('jenkins', 'server')),
      icon('circleci', 'CircleCI', 'CircleCI', 'circleci,ci,automation', tryBrand('circleci', 'refresh-cw')),
      icon('travisci', 'Travis CI', 'Travis CI', 'travis,ci,automation', tryBrand('travisci', 'check')),
      icon('githubactions', 'GitHub Actions', 'GitHub Actions', 'actions,ci,github', tryBrand('githubactions', 'play')),
      icon('gitlabci', 'GitLab CI', 'GitLab CI', 'gitlab,ci,pipeline', tryBrand('gitlab', 'git-branch')),
      icon('argocd', 'ArgoCD', 'ArgoCD', 'argocd,gitops,kubernetes', outline(lucide('git-branch'))),
      icon('terraform', 'Terraform', 'Terraform', 'terraform,iac,hashicorp', tryBrand('terraform', 'layers')),
      icon('ansible', 'Ansible', 'Ansible', 'ansible,automation,redhat', tryBrand('ansible', 'settings')),
      icon('puppet', 'Puppet', 'Puppet', 'puppet,automation,config', tryBrand('puppet', 'settings')),
      icon('chef', 'Chef', 'Chef', 'chef,automation,config', tryBrand('chef', 'settings')),
      icon('helm', 'Helm', 'Helm', 'helm,kubernetes,charts', tryBrand('helm', 'ship')),
      icon('istio', 'Istio', 'Istio', 'istio,service,mesh', tryBrand('istio', 'network')),
      icon('consul', 'Consul', 'Consul', 'consul,service,mesh', tryBrand('consul', 'network')),
      icon('vault', 'Vault', 'Vault', 'vault,secrets,hashicorp', tryBrand('vault', 'lock')),
      icon('packer', 'Packer', 'Packer', 'packer,image,hashicorp', tryBrand('packer', 'package')),
      icon('nomad', 'Nomad', 'Nomad', 'nomad,scheduler,hashicorp', tryBrand('nomad', 'server')),
      icon('rancher', 'Rancher', 'Rancher', 'rancher,kubernetes,management', tryBrand('rancher', 'box')),
      icon('traefik', 'Traefik', 'Traefik', 'traefik,proxy,router', tryBrand('traefikproxy', 'arrow-right-left')),
      icon('envoy', 'Envoy', 'Envoy', 'envoy,proxy,lyft', tryBrand('envoyproxy', 'arrow-right-left')),
      icon('linkerd', 'Linkerd', 'Linkerd', 'linkerd,service,mesh', tryBrand('linkerd', 'link')),
      icon('prometheus', 'Prometheus', 'Prometheus', 'prometheus,monitoring,metrics', tryBrand('prometheus', 'activity')),
      icon('grafana', 'Grafana', 'Grafana', 'grafana,dashboard,monitoring', tryBrand('grafana', 'bar-chart')),
      icon('datadog', 'Datadog', 'Datadog', 'datadog,monitoring,apm', tryBrand('datadog', 'activity')),
      icon('newrelic', 'New Relic', 'New Relic', 'newrelic,monitoring,apm', tryBrand('newrelic', 'activity')),
      icon('splunk', 'Splunk', 'Splunk', 'splunk,logging,monitoring', tryBrand('splunk', 'search')),
      icon('pagerduty', 'PagerDuty', 'PagerDuty', 'pagerduty,alerting,oncall', tryBrand('pagerduty', 'bell')),
      icon('opsgenie', 'Opsgenie', 'Opsgenie', 'opsgenie,alerting,atlassian', tryBrand('opsgenie', 'bell')),
      icon('sumologic', 'Sumo Logic', 'Sumo Logic', 'sumologic,logging,analytics', tryBrand('sumologic', 'search')),
      icon('jaeger', 'Jaeger', 'Jaeger', 'jaeger,tracing,opentelemetry', tryBrand('jaeger', 'search')),
      icon('zipkin', 'Zipkin', 'Zipkin', 'zipkin,tracing,distributed', outline(lucide('search'))),
      icon('opentelemetry', 'OpenTelemetry', 'OpenTelemetry', 'otel,tracing,metrics', tryBrand('opentelemetry', 'activity')),
      icon('falco', 'Falco', 'Falco', 'falco,security,runtime', tryBrand('falco', 'shield')),
      icon('trivy', 'Trivy', 'Trivy', 'trivy,scanner,security', tryBrand('trivy', 'shield-check')),
      icon('snyk', 'Snyk', 'Snyk', 'snyk,security,vulnerability', tryBrand('snyk', 'shield')),
      icon('sonarqube', 'SonarQube', 'SonarQube', 'sonarqube,quality,code', tryBrand('sonarqubeserver', 'check')),
      icon('sentry', 'Sentry', 'Sentry', 'sentry,error,tracking', tryBrand('sentry', 'alert-triangle')),
      icon('rollbar', 'Rollbar', 'Rollbar', 'rollbar,error,tracking', tryBrand('rollbar', 'alert-triangle')),
      icon('airbrake', 'Airbrake', 'Airbrake', 'airbrake,error,tracking', tryBrand('airbrake', 'alert-triangle')),
      icon('docker-dv', 'Docker', 'Docker', 'docker,container,build', brand('docker')),
      icon('kubernetes-dv', 'Kubernetes', 'Kubernetes', 'k8s,container,orchestration', brand('kubernetes')),
      icon('podman-dv', 'Podman', 'Podman', 'podman,container,pod', tryBrand('podman', 'box')),
      icon('minikube', 'Minikube', 'Minikube', 'minikube,kubernetes,local', tryBrand('minikube', 'box')),
      icon('kind', 'Kind', 'Kind', 'kind,kubernetes,docker', outline(lucide('box'))),
      icon('k3s', 'K3s', 'K3s', 'k3s,kubernetes,lightweight', tryBrand('k3s', 'box')),
      icon('helm-dv', 'Helm', 'Helm', 'helm,charts,kubernetes', tryBrand('helm', 'ship')),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'ai-ml',
    nameRu: 'ИИ и машинное обучение',
    nameEn: 'AI & Machine Learning',
    descRu: 'OpenAI, TensorFlow, PyTorch, Hugging Face, Jupyter, Pandas и др. — фреймворки и инструменты ИИ/ML. Цвет настраивается.',
    descEn: 'OpenAI, TensorFlow, PyTorch, Hugging Face, Jupyter, Pandas and more — AI/ML frameworks & tools. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'ai,ml,deeplearning,neural,tensorflow,pytorch,openai,jupyter,data',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('openai', 'OpenAI', 'OpenAI', 'openai,gpt,chatgpt,ai', tryBrand('openai', 'sparkles')),
      icon('tensorflow', 'TensorFlow', 'TensorFlow', 'tensorflow,google,deeplearning', tryBrand('tensorflow', 'brain')),
      icon('pytorch', 'PyTorch', 'PyTorch', 'pytorch,meta,deeplearning', tryBrand('pytorch', 'flame')),
      icon('huggingface', 'Hugging Face', 'Hugging Face', 'huggingface,nlp,models', tryBrand('huggingface', 'smile')),
      icon('opencv', 'OpenCV', 'OpenCV', 'opencv,vision,computer', tryBrand('opencv', 'eye')),
      icon('jupyter', 'Jupyter', 'Jupyter', 'jupyter,notebook,python', tryBrand('jupyter', 'book-open')),
      icon('pandas', 'Pandas', 'Pandas', 'pandas,python,data', tryBrand('pandas', 'table')),
      icon('numpy', 'NumPy', 'NumPy', 'numpy,python,arrays', tryBrand('numpy', 'grid-3x3')),
      icon('scikitlearn', 'Scikit-learn', 'Scikit-learn', 'sklearn,python,ml', tryBrand('scikitlearn', 'flask-conical')),
      icon('keras', 'Keras', 'Keras', 'keras,deeplearning,python', tryBrand('keras', 'brain')),
      icon('streamlit', 'Streamlit', 'Streamlit', 'streamlit,python,dashboard', tryBrand('streamlit', 'layout-dashboard')),
      icon('langchain', 'LangChain', 'LangChain', 'langchain,llm,framework', tryBrand('langchain', 'link')),
      icon('weightsandbiases', 'Weights & Biases', 'Weights & Biases', 'wandb,tracking,ml', tryBrand('weightsandbiases', 'bar-chart')),
      icon('mlflow', 'MLflow', 'MLflow', 'mlflow,tracking,experiment', tryBrand('mlflow', 'flask-conical')),
      icon('kubeflow', 'Kubeflow', 'Kubeflow', 'kubeflow,kubernetes,ml', tryBrand('kubeflow', 'workflow')),
      icon('onnx', 'ONNX', 'ONNX', 'onnx,model,exchange', tryBrand('onnx', 'circuit-board')),
      icon('spacy', 'spaCy', 'spaCy', 'spacy,nlp,python', tryBrand('spacy', 'message-circle')),
      icon('nltk', 'NLTK', 'NLTK', 'nltk,nlp,python', outline(lucide('book-open'))),
      icon('anaconda', 'Anaconda', 'Anaconda', 'anaconda,python,distribution', tryBrand('anaconda', 'package')),
      icon('databricks', 'Databricks', 'Databricks', 'databricks,lakehouse,spark', tryBrand('databricks', 'sparkles')),
      icon('anthropic', 'Anthropic', 'Anthropic', 'anthropic,claude,ai', tryBrand('anthropic', 'sparkles')),
      icon('googlegemini', 'Gemini', 'Gemini', 'gemini,google,ai', tryBrand('googlegemini', 'sparkles')),
      icon('githubcopilot', 'GitHub Copilot', 'GitHub Copilot', 'copilot,github,ai', tryBrand('githubcopilot', 'sparkles')),
      icon('ollama', 'Ollama', 'Ollama', 'ollama,llm,local', tryBrand('ollama', 'cpu')),
      icon('vllm', 'vLLM', 'vLLM', 'vllm,serving,inference', tryBrand('vllm', 'server')),
      icon('metaai', 'Meta AI', 'Meta AI', 'meta,llama,ai', tryBrand('metaai', 'sparkles')),
      icon('mistralai', 'Mistral AI', 'Mistral AI', 'mistral,llm,french', tryBrand('mistralai', 'wind')),
      icon('cursor-ai', 'Cursor', 'Cursor', 'cursor,ai,editor', tryBrand('cursor', 'mouse-pointer')),
      icon('gradio', 'Gradio', 'Gradio', 'gradio,ml,interface', tryBrand('gradio', 'layout-dashboard')),
      icon('ray', 'Ray', 'Ray', 'ray,distributed,compute', tryBrand('ray', 'zap')),
      icon('apacheairflow', 'Airflow', 'Airflow', 'airflow,pipeline,workflow', tryBrand('apacheairflow', 'workflow')),
      icon('apachespark', 'Apache Spark', 'Apache Spark', 'spark,bigdata,processing', tryBrand('apachespark', 'zap')),
      icon('plotly-ai', 'Plotly', 'Plotly', 'plotly,python,visualization', tryBrand('plotly', 'bar-chart')),
      icon('apollographql', 'Apollo GraphQL', 'Apollo GraphQL', 'apollo,graphql,client', tryBrand('apollographql', 'rocket')),
      icon('replicate', 'Replicate', 'Replicate', 'replicate,ai,model', tryBrand('replicate', 'copy')),
      icon('togetherai', 'Together AI', 'Together AI', 'together,llm,inference', outline(lucide('sparkles'))),
      icon('groq', 'Groq', 'Groq', 'groq,inference,fast', tryBrand('groq', 'zap')),
      icon('deeplearningai', 'DeepLearning.AI', 'DeepLearning.AI', 'deeplearning,course,ai', outline(lucide('brain'))),
      icon('stabilityai', 'Stability AI', 'Stability AI', 'stability,diffusion,image', outline(lucide('image'))),
      icon('midjourney', 'Midjourney', 'Midjourney', 'midjourney,image,generative', outline(lucide('image'))),
      icon('cohere', 'Cohere', 'Cohere', 'cohere,llm,nlp', outline(lucide('sparkles'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'communication',
    nameRu: 'Коммуникации',
    nameEn: 'Communication',
    descRu: 'Slack, Discord, Telegram, WhatsApp, Zoom, Notion, Jira, Trello и др. — инструменты коммуникации и управления. Цвет настраивается.',
    descEn: 'Slack, Discord, Telegram, WhatsApp, Zoom, Notion, Jira, Trello and more — communication & management tools. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'communication,chat,project,management,slack,discord,telegram,notion',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('slack', 'Slack', 'Slack', 'slack,chat,work', tryBrand('slack', 'hash')),
      icon('discord', 'Discord', 'Discord', 'discord,chat,gaming', tryBrand('discord', 'message-circle')),
      icon('telegram', 'Telegram', 'Telegram', 'telegram,chat,messaging', tryBrand('telegram', 'send')),
      icon('whatsapp', 'WhatsApp', 'WhatsApp', 'whatsapp,chat,messaging', tryBrand('whatsapp', 'message-circle')),
      icon('zoom', 'Zoom', 'Zoom', 'zoom,video,meeting', tryBrand('zoom', 'video')),
      icon('microsoftteams', 'Microsoft Teams', 'Microsoft Teams', 'teams,microsoft,video', outline(lucide('users'))),
      icon('googlemeet', 'Google Meet', 'Google Meet', 'meet,google,video', tryBrand('googlemeet', 'video')),
      icon('skype', 'Skype', 'Skype', 'skype,video,microsoft', outline(lucide('video'))),
      icon('twilio', 'Twilio', 'Twilio', 'twilio,sms,api', outline(lucide('phone'))),
      icon('sendgrid', 'SendGrid', 'SendGrid', 'sendgrid,email,api', outline(lucide('mail'))),
      icon('mailchimp', 'Mailchimp', 'Mailchimp', 'mailchimp,email,marketing', tryBrand('mailchimp', 'mail')),
      icon('intercom', 'Intercom', 'Intercom', 'intercom,chat,support', tryBrand('intercom', 'message-circle')),
      icon('zendesk', 'Zendesk', 'Zendesk', 'zendesk,support,ticket', tryBrand('zendesk', 'headphones')),
      icon('notion', 'Notion', 'Notion', 'notion,notes,wiki', tryBrand('notion', 'file-text')),
      icon('confluence', 'Confluence', 'Confluence', 'confluence,wiki,atlassian', tryBrand('confluence', 'book-open')),
      icon('jira', 'Jira', 'Jira', 'jira,agile,atlassian', tryBrand('jirasoftware', 'clipboard')),
      icon('trello', 'Trello', 'Trello', 'trello,kanban,atlassian', tryBrand('trello', 'columns')),
      icon('asana', 'Asana', 'Asana', 'asana,project,management', tryBrand('asana', 'check-circle')),
      icon('linear', 'Linear', 'Linear', 'linear,project,tracking', tryBrand('linear', 'arrow-up-right')),
      icon('clickup', 'ClickUp', 'ClickUp', 'clickup,project,management', tryBrand('clickup', 'check')),
      icon('basecamp', 'Basecamp', 'Basecamp', 'basecamp,project,management', tryBrand('basecamp', 'mountain')),
      icon('monday', 'Monday.com', 'Monday.com', 'monday,project,management', outline(lucide('calendar'))),
      icon('airtable', 'Airtable', 'Airtable', 'airtable,spreadsheet,database', tryBrand('airtable', 'table')),
      icon('coda', 'Coda', 'Coda', 'coda,document,sheet', tryBrand('coda', 'file-text')),
      icon('obsidian', 'Obsidian', 'Obsidian', 'obsidian,notes,markdown', tryBrand('obsidian', 'file-edit')),
      icon('logseq', 'Logseq', 'Logseq', 'logseq,notes,outliner', tryBrand('logseq', 'list')),
      icon('mattermost', 'Mattermost', 'Mattermost', 'mattermost,chat,opensource', tryBrand('mattermost', 'message-circle')),
      icon('rocketchat', 'Rocket.Chat', 'Rocket.Chat', 'rocketchat,chat,opensource', tryBrand('rocketchat', 'message-circle')),
      icon('matrix', 'Matrix', 'Matrix', 'matrix,chat,decentralized', tryBrand('matrix', 'grid-3x3')),
      icon('lark', 'Lark', 'Lark', 'lark,productivity,suite', tryBrand('lark', 'bird')),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'payment-commerce',
    nameRu: 'Платежи и коммерция',
    nameEn: 'Payment & Commerce',
    descRu: 'Stripe, PayPal, Shopify, Square, Razorpay и др. — платежные системы и коммерция. Цвет настраивается.',
    descEn: 'Stripe, PayPal, Shopify, Square, Razorpay and more — payment systems & commerce. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'payment,commerce,money,stripe,paypal,shopify,square',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('stripe', 'Stripe', 'Stripe', 'stripe,payment,card', tryBrand('stripe', 'credit-card')),
      icon('paypal', 'PayPal', 'PayPal', 'paypal,payment,money', tryBrand('paypal', 'credit-card')),
      icon('shopify-pay', 'Shopify', 'Shopify', 'shopify,commerce,store', tryBrand('shopify', 'shopping-bag')),
      icon('woocommerce-pay', 'WooCommerce', 'WooCommerce', 'woocommerce,commerce,wordpress', tryBrand('woocommerce', 'shopping-cart')),
      icon('square', 'Square', 'Square', 'square,payment,pos', tryBrand('square', 'credit-card')),
      icon('braintree', 'Braintree', 'Braintree', 'braintree,payment,paypal', tryBrand('braintree', 'credit-card')),
      icon('razorpay', 'Razorpay', 'Razorpay', 'razorpay,payment,india', tryBrand('razorpay', 'credit-card')),
      icon('adyen', 'Adyen', 'Adyen', 'adyen,payment,netherlands', tryBrand('adyen', 'credit-card')),
      icon('klarna', 'Klarna', 'Klarna', 'klarna,payment,bnpl', tryBrand('klarna', 'credit-card')),
      icon('mercadopago', 'Mercado Pago', 'Mercado Pago', 'mercadopago,payment,latam', tryBrand('mercadopago', 'credit-card')),
      icon('paddle', 'Paddle', 'Paddle', 'paddle,payment,saaS', tryBrand('paddle', 'credit-card')),
      icon('gumroad', 'Gumroad', 'Gumroad', 'gumroad,payment,digital', tryBrand('gumroad', 'shopping-bag')),
      icon('buymeacoffee', 'Buy Me a Coffee', 'Buy Me a Coffee', 'buymeacoffee,donation,support', tryBrand('buymeacoffee', 'coffee')),
      icon('kofi', 'Ko-fi', 'Ko-fi', 'kofi,donation,support', tryBrand('kofi', 'coffee')),
      icon('patreon', 'Patreon', 'Patreon', 'patreon,creator,support', tryBrand('patreon', 'heart')),
      icon('opencollective', 'Open Collective', 'Open Collective', 'opencollective,funding,opensource', tryBrand('opencollective', 'users')),
      icon('alipay', 'Alipay', 'Alipay', 'alipay,payment,china', tryBrand('alipay', 'credit-card')),
      icon('wechatpay', 'WeChat Pay', 'WeChat Pay', 'wechat,payment,china', tryBrand('wechat', 'credit-card')),
      icon('applepay', 'Apple Pay', 'Apple Pay', 'applepay,mobile,wallet', tryBrand('applepay', 'credit-card')),
      icon('googlepay', 'Google Pay', 'Google Pay', 'googlepay,mobile,wallet', tryBrand('googlepay', 'credit-card')),
      icon('samsungpay', 'Samsung Pay', 'Samsung Pay', 'samsungpay,mobile,wallet', tryBrand('samsungpay', 'credit-card')),
      icon('cashapp', 'Cash App', 'Cash App', 'cashapp,payment,square', tryBrand('cashapp', 'dollar-sign')),
      icon('venmo', 'Venmo', 'Venmo', 'venmo,payment,paypal', tryBrand('venmo', 'dollar-sign')),
      icon('wise', 'Wise', 'Wise', 'wise,transfer,international', tryBrand('wise', 'arrow-right-left')),
      icon('revolut', 'Revolut', 'Revolut', 'revolut,banking,fintech', tryBrand('revolut', 'credit-card')),
      icon('monzo', 'Monzo', 'Monzo', 'monzo,banking,uk', tryBrand('monzo', 'credit-card')),
      icon('n26', 'N26', 'N26', 'n26,banking,europe', tryBrand('n26', 'credit-card')),
      icon('lemonsqueezy', 'Lemon Squeezy', 'Lemon Squeezy', 'lemonsqueezy,payment,saaS', tryBrand('lemonsqueezy', 'credit-card')),
      icon('magnusts', 'Stripe Atlas', 'Stripe Atlas', 'atlas,stripe,incorporation', outline(lucide('globe'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'design',
    nameRu: 'Дизайн',
    nameEn: 'Design',
    descRu: 'Figma, Sketch, Framer, Canva, Blender и др. — инструменты дизайна и прототипирования. Цвет настраивается.',
    descEn: 'Figma, Sketch, Framer, Canva, Blender and more — design & prototyping tools. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'design,ui,ux,figma,sketch,framer,canva,prototype',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('figma-design', 'Figma', 'Figma', 'figma,design,collaboration', tryBrand('figma', 'pen-tool')),
      icon('sketch-design', 'Sketch', 'Sketch', 'sketch,design,mac', tryBrand('sketch', 'pen-tool')),
      icon('adobexd-design', 'Adobe XD', 'Adobe XD', 'xd,adobe,design', outline(lucide('pen-tool'))),
      icon('adobephotoshop', 'Adobe Photoshop', 'Adobe Photoshop', 'photoshop,adobe,image', tryBrand('adobephotoshop', 'image')),
      icon('adobeillustrator', 'Adobe Illustrator', 'Adobe Illustrator', 'illustrator,adobe,vector', tryBrand('adobeillustrator', 'pen-tool')),
      icon('invision', 'InVision', 'InVision', 'invision,prototype,design', tryBrand('invision', 'layers')),
      icon('framer', 'Framer', 'Framer', 'framer,design,motion', tryBrand('framer', 'frame')),
      icon('canva', 'Canva', 'Canva', 'canva,design,graphics', tryBrand('canva', 'palette')),
      icon('spline', 'Spline', 'Spline', 'spline,3d,design', tryBrand('spline', 'box-select')),
      icon('rive', 'Rive', 'Rive', 'rive,animation,interactive', tryBrand('rive', 'play')),
      icon('lottie', 'Lottie', 'Lottie', 'lottie,animation,json', tryBrand('lottiefiles', 'film')),
      icon('principle', 'Principle', 'Principle', 'principle,prototype,motion', outline(lucide('play'))),
      icon('protopie', 'ProtoPie', 'ProtoPie', 'protopie,prototype,mobile', tryBrand('protopie', 'smartphone')),
      icon('marvel', 'Marvel', 'Marvel', 'marvel,prototype,design', tryBrand('marvelapp', 'star')),
      icon('zeplin', 'Zeplin', 'Zeplin', 'zeplin,handoff,design', tryBrand('zeplin', 'ruler')),
      icon('avocode', 'Avocode', 'Avocode', 'avocode,handoff,design', tryBrand('avocode', 'code')),
      icon('storybook-design', 'Storybook', 'Storybook', 'storybook,components,design', tryBrand('storybook', 'book-open')),
      icon('coolors', 'Coolors', 'Coolors', 'coolors,palette,generator', tryBrand('coolors', 'swatch-book')),
      icon('blender', 'Blender', 'Blender', 'blender,3d,opensource', tryBrand('blender', 'box')),
      icon('cinema4d', 'Cinema 4D', 'Cinema 4D', 'cinema4d,3d,motion', tryBrand('cinema4d', 'box')),
      icon('penpot', 'Penpot', 'Penpot', 'penpot,design,opensource', tryBrand('penpot', 'pen-tool')),
      icon('affinitydesigner', 'Affinity Designer', 'Affinity Designer', 'affinity,vector,design', tryBrand('affinitydesigner', 'pen-tool')),
      icon('affinityphoto', 'Affinity Photo', 'Affinity Photo', 'affinity,photo,edit', tryBrand('affinityphoto', 'image')),
      icon('affinitypublisher', 'Affinity Publisher', 'Affinity Publisher', 'affinity,publish,layout', tryBrand('affinitypublisher', 'layout-grid')),
      icon('adobeaftereffects', 'After Effects', 'After Effects', 'aftereffects,adobe,motion', outline(lucide('film'))),
      icon('adobepremierepro', 'Premiere Pro', 'Premiere Pro', 'premiere,adobe,video', outline(lucide('film'))),
      icon('adobeindesign', 'InDesign', 'InDesign', 'indesign,adobe,layout', outline(lucide('layout-grid'))),
      icon('adobelightroom', 'Lightroom', 'Lightroom', 'lightroom,adobe,photo', outline(lucide('image'))),
      icon('linearity', 'Linearity', 'Linearity', 'linearity,vector,curve', outline(lucide('pen-tool'))),
      icon('overflow', 'Overflow', 'Overflow', 'overflow,flow,diagram', outline(lucide('git-branch'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'analytics',
    nameRu: 'Аналитика',
    nameEn: 'Analytics',
    descRu: 'Google Analytics, Mixpanel, PostHog, Hotjar и др. — инструменты веб-аналитики и A/B-тестирования. Цвет настраивается.',
    descEn: 'Google Analytics, Mixpanel, PostHog, Hotjar and more — web analytics & A/B testing tools. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'analytics,tracking,metrics,abtesting,google,mixpanel,posthog',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('googleanalytics', 'Google Analytics', 'Google Analytics', 'ga,google,analytics', tryBrand('googleanalytics', 'bar-chart')),
      icon('mixpanel', 'Mixpanel', 'Mixpanel', 'mixpanel,analytics,events', tryBrand('mixpanel', 'trending-up')),
      icon('amplitude', 'Amplitude', 'Amplitude', 'amplitude,analytics,product', tryBrand('amplitude', 'trending-up')),
      icon('segment', 'Segment', 'Segment', 'segment,cdp,data', tryBrand('segment', 'git-merge')),
      icon('heap', 'Heap', 'Heap', 'heap,analytics,autocapture', tryBrand('heap', 'layers')),
      icon('hotjar', 'Hotjar', 'Hotjar', 'hotjar,heatmap,recording', tryBrand('hotjar', 'flame')),
      icon('plausible', 'Plausible', 'Plausible', 'plausible,analytics,privacy', tryBrand('plausible', 'bar-chart')),
      icon('matomo', 'Matomo', 'Matomo', 'matomo,analytics,privacy', tryBrand('matomo', 'bar-chart')),
      icon('fathom', 'Fathom', 'Fathom', 'fathom,analytics,simple', tryBrand('fathom', 'activity')),
      icon('posthog', 'PostHog', 'PostHog', 'posthog,analytics,opensource', tryBrand('posthog', 'bar-chart')),
      icon('countly', 'Countly', 'Countly', 'countly,analytics,mobile', tryBrand('countly', 'hash')),
      icon('clicky', 'Clicky', 'Clicky', 'clicky,analytics,realtime', tryBrand('clicky', 'pointer')),
      icon('piwik', 'Piwik', 'Piwik', 'piwik,analytics,matomo', tryBrand('matomo', 'gauge')),
      icon('snowplow', 'Snowplow', 'Snowplow', 'snowplow,analytics,data', tryBrand('snowplow', 'snowflake')),
      icon('rudderstack', 'RudderStack', 'RudderStack', 'rudderstack,cdp,data', tryBrand('rudderstack', 'refresh-cw')),
      icon('googletagmanager', 'Google Tag Manager', 'Google Tag Manager', 'gtm,google,tags', tryBrand('googletagmanager', 'tag')),
      icon('optimizely', 'Optimizely', 'Optimizely', 'optimizely,abtesting,experiment', tryBrand('optimizely', 'flask-conical')),
      icon('vwo', 'VWO', 'VWO', 'vwo,abtesting,experiment', tryBrand('vwo', 'scan-eye')),
      icon('launchdarkly', 'LaunchDarkly', 'LaunchDarkly', 'launchdarkly,feature,flags', tryBrand('launchdarkly', 'flag')),
      icon('splitio', 'Split.io', 'Split.io', 'split,feature,flags', tryBrand('splitdotio', 'git-compare')),
      icon('crazyegg', 'Crazy Egg', 'Crazy Egg', 'crazyegg,heatmap,testing', outline(lucide('eye'))),
      icon('fullstory', 'FullStory', 'FullStory', 'fullstory,session,replay', outline(lucide('play'))),
      icon('logrocket', 'LogRocket', 'LogRocket', 'logrocket,session,replay', outline(lucide('scroll-text'))),
      icon('smartlook', 'Smartlook', 'Smartlook', 'smartlook,heatmap,recording', outline(lucide('eye'))),
      icon('microsoftclarity', 'Clarity', 'Clarity', 'clarity,microsoft,heatmap', outline(lucide('eye'))),
      icon('simpleanalytics', 'Simple Analytics', 'Simple Analytics', 'simple,analytics,privacy', outline(lucide('bar-chart'))),
      icon('goatcounter', 'Goat Counter', 'Goat Counter', 'goatcounter,analytics,simple', outline(lucide('bar-chart'))),
      icon('umami', 'Umami', 'Umami', 'umami,analytics,opensource', outline(lucide('bar-chart'))),
      icon('abtasty', 'AB Tasty', 'AB Tasty', 'abtasty,abtesting,experiment', outline(lucide('flask-conical'))),
      icon('mouseflow', 'Mouseflow', 'Mouseflow', 'mouseflow,heatmap,recording', outline(lucide('mouse'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'social-media',
    nameRu: 'Социальные сети',
    nameEn: 'Social Media',
    descRu: 'Twitter/X, Facebook, Instagram, LinkedIn, YouTube, TikTok и др. — социальные платформы. Цвет настраивается.',
    descEn: 'Twitter/X, Facebook, Instagram, LinkedIn, YouTube, TikTok and more — social platforms. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'social,media,twitter,facebook,instagram,linkedin,youtube,tiktok',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('x-twitter', 'X', 'X', 'x,twitter,social', tryBrand('x', 'at-sign')),
      icon('facebook', 'Facebook', 'Facebook', 'facebook,social,meta', tryBrand('facebook', 'thumbs-up')),
      icon('instagram', 'Instagram', 'Instagram', 'instagram,social,photo', tryBrand('instagram', 'camera')),
      icon('linkedin-sm', 'LinkedIn', 'LinkedIn', 'linkedin,social,business', outline(lucide('briefcase'))),
      icon('youtube', 'YouTube', 'YouTube', 'youtube,video,google', tryBrand('youtube', 'play')),
      icon('tiktok', 'TikTok', 'TikTok', 'tiktok,video,social', tryBrand('tiktok', 'music')),
      icon('pinterest', 'Pinterest', 'Pinterest', 'pinterest,social,images', tryBrand('pinterest', 'image')),
      icon('reddit', 'Reddit', 'Reddit', 'reddit,social,forum', tryBrand('reddit', 'message-circle')),
      icon('snapchat', 'Snapchat', 'Snapchat', 'snapchat,social,photo', tryBrand('snapchat', 'camera')),
      icon('twitch', 'Twitch', 'Twitch', 'twitch,streaming,live', tryBrand('twitch', 'video')),
      icon('medium', 'Medium', 'Medium', 'medium,blog,article', tryBrand('medium', 'book-open')),
      icon('devdotto', 'Dev.to', 'Dev.to', 'dev,blog,developer', tryBrand('devdotto', 'code')),
      icon('stackoverflow', 'Stack Overflow', 'Stack Overflow', 'stackoverflow,qa,developer', tryBrand('stackoverflow', 'layers')),
      icon('hashnode', 'Hashnode', 'Hashnode', 'hashnode,blog,developer', tryBrand('hashnode', 'hash')),
      icon('ycombinator', 'Hacker News', 'Hacker News', 'hackernews,ycombinator,news', tryBrand('ycombinator', 'arrow-up')),
      icon('producthunt', 'Product Hunt', 'Product Hunt', 'producthunt,launch,startup', tryBrand('producthunt', 'target')),
      icon('indiehackers', 'Indie Hackers', 'Indie Hackers', 'indiehackers,startup,community', tryBrand('indiehackers', 'rocket')),
      icon('dribbble', 'Dribbble', 'Dribbble', 'dribbble,design,portfolio', tryBrand('dribbble', 'circle')),
      icon('behance', 'Behance', 'Behance', 'behance,design,portfolio', tryBrand('behance', 'pen-tool')),
      icon('mastodon', 'Mastodon', 'Mastodon', 'mastodon,fediverse,decentralized', tryBrand('mastodon', 'message-circle')),
      icon('bluesky', 'Bluesky', 'Bluesky', 'bluesky,social,atproto', tryBrand('bluesky', 'cloud')),
      icon('threads', 'Threads', 'Threads', 'threads,meta,social', tryBrand('threads', 'at-sign')),
      icon('diaspora', 'Diaspora', 'Diaspora', 'diaspora,fediverse,decentralized', tryBrand('diaspora', 'globe')),
      icon('tumblr', 'Tumblr', 'Tumblr', 'tumblr,blog,microblog', tryBrand('tumblr', 'pen-line')),
      icon('vimeo', 'Vimeo', 'Vimeo', 'vimeo,video,creative', tryBrand('vimeo', 'play')),
      icon('flickr', 'Flickr', 'Flickr', 'flickr,photos,yahoo', tryBrand('flickr', 'image')),
      icon('soundcloud', 'SoundCloud', 'SoundCloud', 'soundcloud,music,audio', tryBrand('soundcloud', 'music')),
      icon('spotify', 'Spotify', 'Spotify', 'spotify,music,streaming', tryBrand('spotify', 'music')),
      icon('letterboxd', 'Letterboxd', 'Letterboxd', 'letterboxd,movies,reviews', tryBrand('letterboxd', 'film')),
      icon('goodreads', 'Goodreads', 'Goodreads', 'goodreads,books,reviews', tryBrand('goodreads', 'book-open')),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'security',
    nameRu: 'Безопасность',
    nameEn: 'Security',
    descRu: "Let's Encrypt, Auth0, Okta, Keycloak, Snyk, 1Password и др. — инструменты безопасности. Цвет настраивается.",
    descEn: "Let's Encrypt, Auth0, Okta, Keycloak, Snyk, 1Password and more — security tools. Color editable.",
    category: 'tools',
    style: 'outline',
    tags: 'security,auth,encryption,vulnerability,firewall,password',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('letsencrypt', "Let's Encrypt", "Let's Encrypt", 'letsencrypt,ssl,certificate', tryBrand('letsencrypt', 'lock')),
      icon('auth0', 'Auth0', 'Auth0', 'auth0,identity,okta', tryBrand('auth0', 'shield')),
      icon('okta', 'Okta', 'Okta', 'okta,identity,sso', tryBrand('okta', 'key')),
      icon('keycloak', 'Keycloak', 'Keycloak', 'keycloak,identity,opensource', tryBrand('keycloak', 'key')),
      icon('snyk-sec', 'Snyk', 'Snyk', 'snyk,security,vulnerability', tryBrand('snyk', 'shield')),
      icon('sonarqube-sec', 'SonarQube', 'SonarQube', 'sonarqube,quality,security', tryBrand('sonarqubeserver', 'shield')),
      icon('owasp', 'OWASP', 'OWASP', 'owasp,security,web', tryBrand('owasp', 'shield-alert')),
      icon('vault-sec', 'HashiCorp Vault', 'HashiCorp Vault', 'vault,secrets,hashicorp', tryBrand('vault', 'lock')),
      icon('onepassword', '1Password', '1Password', '1password,password,manager', tryBrand('1password', 'key')),
      icon('bitwarden', 'Bitwarden', 'Bitwarden', 'bitwarden,password,opensource', tryBrand('bitwarden', 'lock')),
      icon('lastpass', 'LastPass', 'LastPass', 'lastpass,password,manager', tryBrand('lastpass', 'key')),
      icon('wireguard', 'WireGuard', 'WireGuard', 'wireguard,vpn,tunnel', tryBrand('wireguard', 'shield')),
      icon('openssl', 'OpenSSL', 'OpenSSL', 'openssl,tls,crypto', tryBrand('openssl', 'lock')),
      icon('gnupg', 'GnuPG', 'GnuPG', 'gpg,encryption,pgp', outline(lucide('lock'))),
      icon('paloaltonetworks', 'Palo Alto', 'Palo Alto', 'paloalto,firewall,network', tryBrand('paloaltonetworks', 'shield')),
      icon('fortinet', 'Fortinet', 'Fortinet', 'fortinet,firewall,security', tryBrand('fortinet', 'shield')),
      icon('mcafee', 'McAfee', 'McAfee', 'mcafee,antivirus,security', tryBrand('mcafee', 'shield')),
      icon('kaspersky', 'Kaspersky', 'Kaspersky', 'kaspersky,antivirus,security', tryBrand('kaspersky', 'shield')),
      icon('avast', 'Avast', 'Avast', 'avast,antivirus,security', tryBrand('avast', 'shield')),
      icon('malwarebytes', 'Malwarebytes', 'Malwarebytes', 'malwarebytes,antivirus,malware', tryBrand('malwarebytes', 'shield')),
      icon('snort', 'Snort', 'Snort', 'snort,ids,network', tryBrand('snort', 'eye')),
      icon('cloudflare-waf', 'Cloudflare WAF', 'Cloudflare WAF', 'cloudflare,waf,firewall', tryBrand('cloudflare', 'shield')),
      icon('certbot', 'Certbot', 'Certbot', 'certbot,ssl,letsencrypt', outline(lucide('award'))),
      icon('caddycert', 'Caddy', 'Caddy', 'caddy,webserver,https', tryBrand('caddy', 'lock')),
      icon('oauth2', 'OAuth 2.0', 'OAuth 2.0', 'oauth,auth,token', outline(lucide('key-round'))),
      icon('jwt-sec', 'JWT', 'JWT', 'jwt,token,auth', outline(lucide('shield-check'))),
      icon('csrf', 'CSRF', 'CSRF', 'csrf,token,security', outline(lucide('shield-alert'))),
      icon('cors', 'CORS', 'CORS', 'cors,origin,policy', outline(lucide('globe'))),
      icon('csp', 'CSP', 'CSP', 'csp,content,policy', outline(lucide('file-text'))),
      icon('hsts', 'HSTS', 'HSTS', 'hsts,https,strict', outline(lucide('lock'))),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'data-viz',
    nameRu: 'Визуализация данных',
    nameEn: 'Data Visualization',
    descRu: 'D3.js, Chart.js, Plotly, Recharts, Grafana, Metabase и др. — библиотеки и инструменты визуализации. Цвет настраивается.',
    descEn: 'D3.js, Chart.js, Plotly, Recharts, Grafana, Metabase and more — visualization libraries & tools. Color editable.',
    category: 'tools',
    style: 'outline',
    tags: 'dataviz,chart,graph,d3,plotly,grafana,metabase,visualization',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('d3js', 'D3.js', 'D3.js', 'd3,visualization,svg', tryBrand('d3', 'bar-chart')),
      icon('chartjs', 'Chart.js', 'Chart.js', 'chartjs,canvas,charts', outline(lucide('bar-chart'))),
      icon('plotly', 'Plotly', 'Plotly', 'plotly,python,interactive', tryBrand('plotly', 'trending-up')),
      icon('recharts', 'Recharts', 'Recharts', 'recharts,react,charts', outline(lucide('line-chart'))),
      icon('victory', 'Victory', 'Victory', 'victory,react,charts', outline(lucide('bar-chart'))),
      icon('nivo', 'Nivo', 'Nivo', 'nivo,react,dataviz', outline(lucide('pie-chart'))),
      icon('apacheecharts', 'Apache ECharts', 'Apache ECharts', 'echarts,charts,interactive', tryBrand('apacheecharts', 'bar-chart')),
      icon('highcharts', 'Highcharts', 'Highcharts', 'highcharts,charts,interactive', outline(lucide('line-chart'))),
      icon('threedotjs', 'Three.js', 'Three.js', 'threejs,3d,webgl', tryBrand('threedotjs', 'box')),
      icon('vega', 'Vega', 'Vega', 'vega,grammar,visualization', tryBrand('vega', 'eye')),
      icon('observable', 'Observable', 'Observable', 'observable,notebook,dataviz', tryBrand('observable', 'eye')),
      icon('grafana-dv', 'Grafana', 'Grafana', 'grafana,dashboard,monitoring', tryBrand('grafana', 'bar-chart')),
      icon('metabase', 'Metabase', 'Metabase', 'metabase,sql,dashboard', tryBrand('metabase', 'bar-chart')),
      icon('apachesuperset', 'Apache Superset', 'Apache Superset', 'superset,bidata,dashboard', tryBrand('apachesuperset', 'bar-chart')),
      icon('redash', 'Redash', 'Redash', 'redash,sql,dashboard', tryBrand('redash', 'bar-chart')),
      icon('looker', 'Looker', 'Looker', 'looker,bidata,google', tryBrand('looker', 'bar-chart')),
      icon('tableau', 'Tableau', 'Tableau', 'tableau,bi,visualization', outline(lucide('bar-chart'))),
      icon('powerbi', 'Power BI', 'Power BI', 'powerbi,microsoft,bi', outline(lucide('bar-chart'))),
      icon('googlelookerstudio', 'Looker Studio', 'Looker Studio', 'lookerstudio,google,bi', outline(lucide('bar-chart'))),
      icon('cubejs', 'Cube.js', 'Cube.js', 'cube,semantic,analytics', outline(lucide('box'))),
      icon('mapbox', 'Mapbox', 'Mapbox', 'mapbox,maps,geospatial', tryBrand('mapbox', 'map')),
      icon('leaflet', 'Leaflet', 'Leaflet', 'leaflet,maps,opensource', tryBrand('leaflet', 'map')),
      icon('deckgl', 'Deck.gl', 'Deck.gl', 'deckgl,maps,webgl', outline(lucide('map'))),
      icon('apollographql-dv', 'Apollo', 'Apollo', 'apollo,graphql,client', tryBrand('apollographql', 'rocket')),
      icon('perspectivedotai', 'Perspective', 'Perspective', 'perspective,streaming,analytics', outline(lucide('activity'))),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY: CONCEPTS
  // ═══════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'web-concepts',
    nameRu: 'Веб-концепты',
    nameEn: 'Web Concepts',
    descRu: 'Браузер, сервер, API, БД, кэш, CDN, WebSocket, OAuth, JWT, микросервисы и др. — для архитектурных схем. Цвет настраивается.',
    descEn: 'Browser, server, API, DB, cache, CDN, WebSocket, OAuth, JWT, microservices and more — for architecture diagrams. Color editable.',
    category: 'concepts',
    style: 'outline',
    tags: 'concept,browser,server,api,db,cache,oauth,jwt,microservice',
    isFree: true,
    priceCredits: 10,
    icons: [
      icon('browser', 'Браузер', 'Browser', 'browser,web,window', outline(lucide('app-window'))),
      icon('server', 'Сервер', 'Server', 'server,backend,hosting', outline(lucide('server'))),
      icon('api', 'API', 'API', 'api,rest,endpoint', outline(lucide('webhook'))),
      icon('database', 'База данных', 'Database', 'database,db,storage', outline(lucide('database'))),
      icon('cache', 'Кэш', 'Cache', 'cache,redis,memory', outline(lucide('hard-drive'))),
      icon('cdn', 'CDN', 'CDN', 'cdn,edge,network', outline(lucide('globe'))),
      icon('component', 'Компонент', 'Component', 'component,ui,react', outline(lucide('blocks'))),
      icon('layout', 'Layout', 'Layout', 'layout,grid,structure', outline(lucide('layout-dashboard'))),
      icon('responsive', 'Responsive', 'Responsive', 'responsive,mobile,adaptive', outline(lucide('smartphone'))),
      icon('websocket', 'WebSocket', 'WebSocket', 'websocket,realtime,socket', outline(lucide('radio'))),
      icon('webhook', 'Webhook', 'Webhook', 'webhook,event,callback', outline(lucide('webhook'))),
      icon('oauth', 'OAuth', 'OAuth', 'oauth,auth,token', outline(lucide('key-round'))),
      icon('jwt', 'JWT', 'JWT', 'jwt,token,auth', outline(lucide('shield-check'))),
      icon('cookie', 'Cookie', 'Cookie', 'cookie,session,browser', outline(lucide('cookie'))),
      icon('rest', 'REST', 'REST', 'rest,api,http', outline(lucide('share-2'))),
      icon('graphql-concept', 'GraphQL', 'GraphQL', 'graphql,api,query', brand('graphql')),
      icon('grpc', 'gRPC', 'gRPC', 'grpc,rpc,protocol', outline(lucide('network'))),
      icon('microservice', 'Микросервис', 'Microservice', 'microservice,architecture,service', outline(lucide('boxes'))),
      icon('serverless', 'Serverless', 'Serverless', 'serverless,lambda,cloud', outline(lucide('cloud'))),
      icon('ssr', 'SSR', 'SSR', 'ssr,server,render', outline(lucide('file-code-2'))),
      icon('ssg', 'SSG', 'SSG', 'ssg,static,generate', outline(lucide('file-text'))),
      icon('seo', 'SEO', 'SEO', 'seo,search,google', outline(lucide('search'))),
      icon('pwa', 'PWA', 'PWA', 'pwa,offline,installable', outline(lucide('smartphone'))),
      icon('security', 'Security', 'Security', 'security,shield,lock', outline(lucide('shield-check'))),
      icon('deploy', 'Deploy', 'Deploy', 'deploy,rocket,release', outline(lucide('rocket'))),
      icon('monitoring', 'Мониторинг', 'Monitoring', 'monitoring,metrics,observability', outline(lucide('activity'))),
      icon('logging', 'Логи', 'Logging', 'log,logs,observability', outline(lucide('scroll-text'))),
      icon('cicd', 'CI/CD', 'CI/CD', 'cicd,pipeline,automation', outline(lucide('git-branch'))),
      icon('state', 'State', 'State', 'state,management,data', outline(lucide('database'))),
      icon('props', 'Props', 'Props', 'props,component,data', outline(lucide('arrow-down'))),
      icon('hook', 'Hook', 'Hook', 'hook,react,state', outline(lucide('anchor'))),
      icon('middleware', 'Middleware', 'Middleware', 'middleware,pipeline,request', outline(lucide('arrow-right-left'))),
      icon('proxy', 'Proxy', 'Proxy', 'proxy,reverse,forward', outline(lucide('arrow-right-left'))),
      icon('loadbalancer', 'Load Balancer', 'Load Balancer', 'lb,balance,distribute', outline(lucide('network'))),
      icon('queue', 'Queue', 'Queue', 'queue,message,broker', outline(lucide('list'))),
      icon('event', 'Event', 'Event', 'event,dispatch,listener', outline(lucide('zap'))),
      icon('stream', 'Stream', 'Stream', 'stream,reactive,data', outline(lucide('waves'))),
      icon('function', 'Function', 'Function', 'function,lambda,handler', outline(lucide('braces'))),
      icon('class', 'Class', 'Class', 'class,oop,blueprint', outline(lucide('layers'))),
      icon('module', 'Module', 'Module', 'module,esm,import', outline(lucide('package'))),
      icon('package-c', 'Package', 'Package', 'package,npm,dependency', outline(lucide('package'))),
      icon('dependency', 'Dependency', 'Dependency', 'dependency,graph,lockfile', outline(lucide('git-merge'))),
      icon('container', 'Container', 'Container', 'container,docker,isolated', outline(lucide('box'))),
      icon('orchestration', 'Orchestration', 'Orchestration', 'orchestration,k8s,cluster', outline(lucide('boxes'))),
      icon('namespace', 'Namespace', 'Namespace', 'namespace,isolation,scope', outline(lucide('brackets'))),
      icon('cluster', 'Cluster', 'Cluster', 'cluster,nodes,distributed', outline(lucide('network'))),
      icon('shard', 'Shard', 'Shard', 'shard,partition,database', outline(lucide('scissors'))),
      icon('replica', 'Replica', 'Replica', 'replica,copy,database', outline(lucide('copy'))),
      icon('partition', 'Partition', 'Partition', 'partition,split,data', outline(lucide('columns'))),
      icon('index-db', 'Index', 'Index', 'index,lookup,database', outline(lucide('list'))),
      icon('cursor', 'Cursor', 'Cursor', 'cursor,pagination,database', outline(lucide('pointer'))),
      icon('transaction', 'Transaction', 'Transaction', 'transaction,acid,database', outline(lucide('arrow-right-left'))),
      icon('migration', 'Migration', 'Migration', 'migration,schema,database', outline(lucide('arrow-right'))),
      icon('schema', 'Schema', 'Schema', 'schema,structure,database', outline(lucide('file-code'))),
      icon('seed', 'Seed', 'Seed', 'seed,fixture,data', outline(lucide('sprout'))),
      icon('fixture', 'Fixture', 'Fixture', 'fixture,test,data', outline(lucide('database'))),
      icon('mock', 'Mock', 'Mock', 'mock,test,fake', outline(lucide('venetian-mask'))),
      icon('stub', 'Stub', 'Stub', 'stub,test,fake', outline(lucide('minus'))),
      icon('spy', 'Spy', 'Spy', 'spy,test,observe', outline(lucide('eye'))),
      icon('assertion', 'Assertion', 'Assertion', 'assertion,test,expect', outline(lucide('check'))),
      icon('coverage', 'Coverage', 'Coverage', 'coverage,test,percent', outline(lucide('gauge'))),
      icon('lint', 'Lint', 'Lint', 'lint,eslint,quality', outline(lucide('check'))),
      icon('format', 'Format', 'Format', 'format,prettier,style', outline(lucide('sparkles'))),
      icon('transpile', 'Transpile', 'Transpile', 'transpile,babel,convert', outline(lucide('arrow-right-left'))),
      icon('bundle', 'Bundle', 'Bundle', 'bundle,webpack,vite', outline(lucide('package'))),
      icon('minify', 'Minify', 'Minify', 'minify,compress,ugly', outline(lucide('minimize-2'))),
      icon('treeshake', 'Tree Shaking', 'Tree Shaking', 'tree,shake,deadcode', outline(lucide('tree-pine'))),
      icon('codesplit', 'Code Split', 'Code Split', 'code,split,lazy', outline(lucide('scissors'))),
      icon('lazyload', 'Lazy Load', 'Lazy Load', 'lazy,load,on-demand', outline(lucide('timer'))),
      icon('prefetch', 'Prefetch', 'Prefetch', 'prefetch,hint,resource', outline(lucide('download'))),
      icon('preload', 'Preload', 'Preload', 'preload,critical,resource', outline(lucide('download'))),
      icon('cachebust', 'Cache Bust', 'Cache Bust', 'cache,bust,version', outline(lucide('refresh-cw'))),
      icon('etag', 'ETag', 'ETag', 'etag,cache,http', outline(lucide('tag'))),
      icon('cors-c', 'CORS', 'CORS', 'cors,origin,http', outline(lucide('globe'))),
      icon('csp-c', 'CSP', 'CSP', 'csp,content,security', outline(lucide('shield'))),
      icon('hsts-c', 'HSTS', 'HSTS', 'hsts,https,strict', outline(lucide('lock'))),
    ],
  },

]

// =====================================================================
// EMIT TypeScript module
// =====================================================================
function emitIconRow([slug, nameRu, nameEn, keywords, svg]) {
  return `    { slug: ${JSON.stringify(slug)}, nameRu: ${JSON.stringify(nameRu)}, nameEn: ${JSON.stringify(nameEn)}, keywords: ${JSON.stringify(keywords)}, svg: ${JSON.stringify(svg)} },`
}

function emitPack(pack) {
  const header = `  {
    slug: ${JSON.stringify(pack.slug)},
    nameRu: ${JSON.stringify(pack.nameRu)},
    nameEn: ${JSON.stringify(pack.nameEn)},
    descRu: ${JSON.stringify(pack.descRu)},
    descEn: ${JSON.stringify(pack.descEn)},
    category: ${JSON.stringify(pack.category)},
    style: ${JSON.stringify(pack.style)},
    tags: ${JSON.stringify(pack.tags)},
    isFree: ${pack.isFree},
    priceCredits: ${pack.priceCredits},
    icons: [`
  const icons = pack.icons.map(emitIconRow).join('\n')
  const footer = `    ],
  },`
  return header + '\n' + icons + '\n' + footer
}

const tsHeader = `/**
 * Shared seed data — packs + icons.
 *
 * ALL icons use fill="currentColor" or stroke="currentColor" — NEVER
 * hardcoded brand colors. The customizer in src/views/customize.tsx
 * lets users pick any color; renderSvg() in src/lib/svg.ts substitutes
 * the literal currentColor token with the chosen color.
 *
 * Brand logos: simple-icons npm package (https://simpleicons.org, CC0/MIT)
 * Concept icons: lucide-react (https://lucide.dev, ISC)
 *
 * Consumed by:
 *   - scripts/seed-turso.ts (CLI seeding)
 *   - src/app/api/admin/seed/route.ts (HTTP-triggered seeding on Vercel)
 *   - src/views/home.tsx (preview icons)
 *
 * Regenerate via: node scripts/build-seed.js
 */
export type IconDef = {
  slug: string
  nameRu: string
  nameEn: string
  keywords: string
  svg: string
}

export type PackDef = {
  slug: string
  nameRu: string
  nameEn: string
  descRu: string
  descEn: string
  category: string
  style: string
  tags: string
  isFree: boolean
  priceCredits: number
  icons: IconDef[]
}

export const PACKS: PackDef[] = [
`

const tsFooter = `]
`

const body = PACKS.map(emitPack).join('\n')
const output = tsHeader + body + '\n' + tsFooter

fs.writeFileSync('/home/z/my-project/src/lib/packs-data.ts', output)
const totalIcons = PACKS.reduce((s, p) => s + p.icons.length, 0)
console.log('Wrote /home/z/my-project/src/lib/packs-data.ts')
console.log('Packs:', PACKS.length, 'Icons:', totalIcons)
PACKS.forEach(p => console.log(`  ${p.slug}: ${p.icons.length} icons`))
