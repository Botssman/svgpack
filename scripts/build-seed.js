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
 */
function lucide(name) {
  const file = path.join(
    '/home/z/my-project/node_modules/lucide-react/dist/esm/icons',
    name + '.js',
  )
  const src = fs.readFileSync(file, 'utf8')
  const m = src.match(/const __iconNode = (\[[\s\S]+?\]);/)
  if (!m) throw new Error('could not find __iconNode in ' + name)
  // eslint-disable-next-line no-eval
  const node = eval(m[1])
  return node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `<${tag}${a ? ' ' + a : ''}/>`
    })
    .join('')
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
      icon('csharp', 'C#', 'C#', 'csharp,dotnet,microsoft', brand('sharp')),
      icon('dotnet', '.NET', '.NET', 'dotnet,microsoft,framework', brand('dotnet')),
      icon('cpp', 'C++', 'C++', 'cpp,cplusplus,systems', brand('cplusplus')),
      icon('c', 'C', 'C', 'c,systems,language', brand('c')),
      icon('dart', 'Dart', 'Dart', 'dart,flutter,mobile', brand('dart')),
      icon('scala', 'Scala', 'Scala', 'scala,jvm,functional', brand('scala')),
      icon('elixir', 'Elixir', 'Elixir', 'elixir,erlang,beam', brand('elixir')),
      icon('haskell', 'Haskell', 'Haskell', 'haskell,functional,pure', brand('haskell')),
      icon('lua', 'Lua', 'Lua', 'lua,scripting,game', brand('lua')),
      icon('perl', 'Perl', 'Perl', 'perl,scripting,sysadmin', brand('perl')),
      icon('r', 'R', 'R', 'r,stats,datascience', brand('r')),
      icon('sql', 'SQL Database', 'SQL Database', 'sql,db,database,query', outline(lucide('database'))),
      icon('json', 'JSON', 'JSON', 'json,format,data', outline(lucide('braces'))),
      icon('yaml', 'YAML', 'YAML', 'yaml,config,data', brand('yaml')),
      icon('xml', 'XML', 'XML', 'xml,markup,data', outline(lucide('file-code'))),
      icon('markdown', 'Markdown', 'Markdown', 'md,markdown,docs', brand('markdown')),
      icon('graphql', 'GraphQL', 'GraphQL', 'graphql,api,query', brand('graphql')),
      icon('sass', 'Sass', 'Sass', 'sass,scss,style', brand('sass')),
      icon('less', 'Less', 'Less', 'less,style,css', brand('less')),
    ],
  },

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
      icon('koa', 'Koa', 'Koa', 'koa,node,server', brand('koa')),
      icon('nodejs', 'Node.js', 'Node.js', 'node,js,server,runtime', brand('nodedotjs')),
      icon('deno', 'Deno', 'Deno', 'deno,runtime,ts', brand('deno')),
      icon('bun', 'Bun', 'Bun', 'bun,runtime,js', brand('bun')),
    ],
  },

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
      icon('podman', 'Podman', 'Podman', 'podman,container,daemonless', brand('podman')),
      icon('webpack', 'Webpack', 'Webpack', 'webpack,bundler,build', brand('webpack')),
      icon('vite', 'Vite', 'Vite', 'vite,bundler,fast', brand('vite')),
      icon('rollup', 'Rollup', 'Rollup', 'rollup,bundler,esm', brand('rollupdotjs')),
      icon('esbuild', 'esbuild', 'esbuild', 'esbuild,bundler,fast', brand('esbuild')),
      icon('turbo', 'Turbopack', 'Turbopack', 'turbo,bundler,next', brand('turborepo')),
      icon('babel', 'Babel', 'Babel', 'babel,transpiler,js', brand('babel')),
      icon('swc', 'SWC', 'SWC', 'swc,compiler,rust', brand('swc')),
      icon('postcss', 'PostCSS', 'PostCSS', 'postcss,css,transform', brand('postcss')),
      icon('tailwind', 'Tailwind CSS', 'Tailwind CSS', 'tailwind,css,utility', brand('tailwindcss')),
      icon('eslint', 'ESLint', 'ESLint', 'eslint,linter,js', brand('eslint')),
      icon('prettier', 'Prettier', 'Prettier', 'prettier,formatter,code', brand('prettier')),
      icon('jest', 'Jest', 'Jest', 'jest,test,js', brand('jest')),
      icon('vitest', 'Vitest', 'Vitest', 'vitest,test,vite', brand('vitest')),
      icon('cypress', 'Cypress', 'Cypress', 'cypress,e2e,test', brand('cypress')),
      icon('playwright', 'Playwright', 'Playwright', 'playwright,e2e,test', outline(lucide('flask-conical'))),
      icon('storybook', 'Storybook', 'Storybook', 'storybook,ui,components', brand('storybook')),
      icon('npm', 'npm', 'npm', 'npm,package,registry', brand('npm')),
      icon('yarn', 'Yarn', 'Yarn', 'yarn,package,node', brand('yarn')),
      icon('pnpm', 'pnpm', 'pnpm', 'pnpm,package,fast', brand('pnpm')),
      icon('terminal', 'Terminal', 'Terminal', 'terminal,shell,cli', outline(lucide('square-terminal'))),
      icon('figma', 'Figma', 'Figma', 'figma,design,ui', brand('figma')),
      icon('sketch', 'Sketch', 'Sketch', 'sketch,design,ui', brand('sketch')),
      icon('adobexd', 'Adobe XD', 'Adobe XD', 'xd,design,adobe', outline(lucide('pen-tool'))),
      icon('vscode', 'VS Code', 'VS Code', 'vscode,editor,ide', brand('vscodium')),
      icon('neovim', 'Neovim', 'Neovim', 'neovim,editor,vim', brand('neovim')),
      icon('webstorm', 'WebStorm', 'WebStorm', 'webstorm,ide,jetbrains', brand('webstorm')),
      icon('postman', 'Postman', 'Postman', 'postman,api,test', brand('postman')),
    ],
  },

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
      icon('graphql', 'GraphQL', 'GraphQL', 'graphql,api,query', brand('graphql')),
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
