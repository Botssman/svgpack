/**
 * Seed: 24 предзаготовленных SVG-иконок в 4 паков.
 * Все иконки — outline-стиль, viewBox 0 0 24 24, stroke currentColor.
 * В БД хранится только содержимое <svg>...</svg> (paths), без outer wrapper.
 */
import { db } from '../src/lib/db'

type IconDef = {
  slug: string
  nameRu: string
  nameEn: string
  keywords: string
  svg: string
}

type PackDef = {
  slug: string
  nameRu: string
  nameEn: string
  descRu: string
  descEn: string
  category: 'languages' | 'frameworks' | 'tools' | 'concepts'
  style: 'outline' | 'filled' | 'duotone'
  tags: string
  isFree: boolean
  priceCredits: number
  icons: IconDef[]
}

const PACKS: PackDef[] = [
  {
    slug: 'web-languages',
    nameRu: 'Языки веб-разработки',
    nameEn: 'Web Languages',
    descRu: 'HTML, CSS, JavaScript, TypeScript, PHP, Python, SQL, JSON — базовые знаки для маркировки стека.',
    descEn: 'HTML, CSS, JavaScript, TypeScript, PHP, Python, SQL, JSON — core stack marks.',
    category: 'languages',
    style: 'outline',
    tags: 'code,language,web,html,css,js,ts,sql,json',
    isFree: true,
    priceCredits: 10,
    icons: [
      { slug: 'html5', nameRu: 'HTML5', nameEn: 'HTML5', keywords: 'html,markup,web',
        svg: '<path d="M4 4l1.5 16L12 22l6.5-2L20 4z"/><path d="M7 8h10l-.5 5H8.5L8.5 17 12 18l3.5-1 .3-3"/><path d="M8 6h8"/>' },
      { slug: 'css3', nameRu: 'CSS3', nameEn: 'CSS3', keywords: 'css,style,design',
        svg: '<path d="M4 4l1.5 16L12 22l6.5-2L20 4z"/><path d="M7 8h10l-.3 3H8.5L8.7 14h6.6l-.3 3-3 1-3-1-.2-2"/>' },
      { slug: 'javascript', nameRu: 'JavaScript', nameEn: 'JavaScript', keywords: 'js,ecmascript,web',
        svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17c0 1-.5 1.5-2 1.5"/><path d="M14 17c0 1 .8 1.5 2 1.5s2-.7 2-1.8c0-2-4-1.5-4-3.5 0-.8.6-1.3 1.7-1.3"/><path d="M11.5 13v5.5"/>' },
      { slug: 'typescript', nameRu: 'TypeScript', nameEn: 'TypeScript', keywords: 'ts,types,web',
        svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 11h6"/><path d="M12 11v6"/><path d="M16 16.2c0 .9.7 1.4 1.8 1.4 1 0 1.7-.5 1.7-1.4 0-2-3.5-1.2-3.5-3 0-.7.6-1.2 1.6-1.2.8 0 1.4.3 1.7.9"/>' },
      { slug: 'python', nameRu: 'Python', nameEn: 'Python', keywords: 'python,backend,snake',
        svg: '<path d="M12 3c-3 0-4 1.5-4 3v2h4v1H6c-1.5 0-3 1-3 4s1.5 4 3 4h2v-2c0-1.5 1-3 3-3h4c1.5 0 3-1 3-3V6c0-1.5-1-3-4-3z"/><circle cx="9" cy="6" r="0.5" fill="currentColor"/><path d="M12 21c3 0 4-1.5 4-3v-2h-4v-1h6c1.5 0 3-1 3-4s-1.5-4-3-4h-2v2c0 1.5-1 3-3 3H8c-1.5 0-3 1-3 3v3c0 1.5 1 3 4 3z"/><circle cx="15" cy="18" r="0.5" fill="currentColor"/>' },
      { slug: 'sql', nameRu: 'SQL Database', nameEn: 'SQL Database', keywords: 'sql,db,database,query',
        svg: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>' },
      { slug: 'json', nameRu: 'JSON', nameEn: 'JSON', keywords: 'json,format,data',
        svg: '<path d="M8 4c-2 0-3 1-3 3v3c0 1.5-1 2-2 2 1 0 2 .5 2 2v3c0 2 1 3 3 3"/><path d="M16 4c2 0 3 1 3 3v3c0 1.5 1 2 2 2-1 0-2 .5-2 2v3c0 2-1 3-3 3"/>' },
      { slug: 'php', nameRu: 'PHP', nameEn: 'PHP', keywords: 'php,backend,server',
        svg: '<ellipse cx="12" cy="12" rx="9" ry="5"/><path d="M7 14l1-6h2c1 0 1.7.7 1.5 2-.2 1.3-1.2 2-2.3 2H8.5"/><path d="M13 14l.7-4h1.5c.8 0 1.3.6 1.2 1.4-.1.8-.8 1.4-1.6 1.4h-1.2"/><circle cx="11" cy="11" r="0.4" fill="currentColor"/>' },
    ],
  },
  {
    slug: 'js-frameworks',
    nameRu: 'JS-фреймворки',
    nameEn: 'JS Frameworks',
    descRu: 'React, Vue, Angular, Svelte, Next.js, Node.js — для маркировки стека и архитектуры.',
    descEn: 'React, Vue, Angular, Svelte, Next.js, Node.js — for stack and architecture marks.',
    category: 'frameworks',
    style: 'outline',
    tags: 'framework,react,vue,angular,svelte,next,node',
    isFree: true,
    priceCredits: 10,
    icons: [
      { slug: 'react', nameRu: 'React', nameEn: 'React', keywords: 'react,library,frontend',
        svg: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>' },
      { slug: 'vue', nameRu: 'Vue', nameEn: 'Vue', keywords: 'vue,framework,frontend',
        svg: '<path d="M3 4l9 16L21 4z"/><path d="M7 6l5 9 5-9"/><path d="M9.5 6L12 10.5 14.5 6" fill="none"/>' },
      { slug: 'angular', nameRu: 'Angular', nameEn: 'Angular', keywords: 'angular,framework,ts',
        svg: '<path d="M12 2l9 4-2 12-7 4-7-4L3 6z"/><path d="M8 15l4-9 4 9"/><path d="M9.5 12h5"/>' },
      { slug: 'svelte', nameRu: 'Svelte', nameEn: 'Svelte', keywords: 'svelte,compiler,frontend',
        svg: '<path d="M9 4h6c2 0 4 1.5 4 4s-2 4-4 4H9c-2 0-4 1.5-4 4s2 4 4 4h6"/><path d="M15 4c2 0 4 1.5 4 4s-2 4-4 4"/>' },
      { slug: 'nextjs', nameRu: 'Next.js', nameEn: 'Next.js', keywords: 'next,framework,react,ssr',
        svg: '<circle cx="12" cy="12" r="9"/><path d="M8 8v8"/><path d="M8 8l8 11"/><path d="M16 8v6"/>' },
      { slug: 'nodejs', nameRu: 'Node.js', nameEn: 'Node.js', keywords: 'node,js,server,runtime',
        svg: '<path d="M12 2L4 7v10l8 5 8-5V7z"/><path d="M9 9c0-1.5 1.5-2 3-2s3 .5 3 2-1.5 2-3 2-3 .5-3 2 1.5 2 3 2 3-.5 3-2"/>' },
    ],
  },
  {
    slug: 'dev-tools',
    nameRu: 'Инструменты разработчика',
    nameEn: 'Developer Tools',
    descRu: 'Git, Docker, Webpack, Vite, npm, Terminal, Figma, VS Code — ежедневный набор.',
    descEn: 'Git, Docker, Webpack, Vite, npm, Terminal, Figma, VS Code — daily driver set.',
    category: 'tools',
    style: 'outline',
    tags: 'tool,git,docker,webpack,vite,npm,terminal,figma,vscode',
    isFree: true,
    priceCredits: 10,
    icons: [
      { slug: 'git', nameRu: 'Git', nameEn: 'Git', keywords: 'git,vcs,version',
        svg: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7"/><path d="M18 11.5c0 4-6 2-6 6.5"/>' },
      { slug: 'docker', nameRu: 'Docker', nameEn: 'Docker', keywords: 'docker,container,devops',
        svg: '<rect x="3" y="10" width="4" height="4"/><rect x="8" y="10" width="4" height="4"/><rect x="13" y="10" width="4" height="4"/><rect x="8" y="5" width="4" height="4"/><path d="M3 14c2 4 8 5 12 4 3-.7 5-3 5-5"/>' },
      { slug: 'webpack', nameRu: 'Webpack', nameEn: 'Webpack', keywords: 'webpack,bundler,build',
        svg: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5"/><path d="M12 12v10"/><path d="M12 12L3 7"/>' },
      { slug: 'vite', nameRu: 'Vite', nameEn: 'Vite', keywords: 'vite,bundler,fast',
        svg: '<path d="M3 5l9 14L21 5z"/><path d="M7 5l5 8 5-8"/>' },
      { slug: 'npm', nameRu: 'npm', nameEn: 'npm', keywords: 'npm,package,registry',
        svg: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M5 14v-4h2l2 3v-3"/><path d="M13 10v4"/><path d="M16 10v4h1.5c1 0 1.5-.5 1.5-2s-.5-2-1.5-2z"/>' },
      { slug: 'terminal', nameRu: 'Terminal', nameEn: 'Terminal', keywords: 'terminal,shell,cli',
        svg: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/>' },
      { slug: 'figma', nameRu: 'Figma', nameEn: 'Figma', keywords: 'figma,design,ui',
        svg: '<path d="M9 3h3v6H9c-1.5 0-3-1.5-3-3s1.5-3 3-3z"/><path d="M12 3h3c1.5 0 3 1.5 3 3s-1.5 3-3 3h-3z"/><path d="M9 9h3v6H9c-1.5 0-3-1.5-3-3s1.5-3 3-3z"/><path d="M12 9h3c1.5 0 3 1.5 3 3s-1.5 3-3 3h-3z"/><circle cx="10.5" cy="18" r="3"/>' },
      { slug: 'vscode', nameRu: 'VS Code', nameEn: 'VS Code', keywords: 'vscode,editor,ide',
        svg: '<path d="M16 3l5 2v14l-5 2"/><path d="M3 5l5 2"/><path d="M3 19l5-2"/><path d="M8 7l8 5-8 5z"/><path d="M16 7v10"/>' },
    ],
  },
  {
    slug: 'web-concepts',
    nameRu: 'Веб-концепты',
    nameEn: 'Web Concepts',
    descRu: 'Браузер, сервер, API, БД, компонент, layout, responsive, deploy, security — для архитектурных схем.',
    descEn: 'Browser, server, API, DB, component, layout, responsive, deploy, security — for architecture diagrams.',
    category: 'concepts',
    style: 'outline',
    tags: 'concept,browser,server,api,db,component,layout,responsive,deploy,security',
    isFree: true,
    priceCredits: 10,
    icons: [
      { slug: 'browser', nameRu: 'Браузер', nameEn: 'Browser', keywords: 'browser,web,window',
        svg: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="6" cy="6.5" r="0.5" fill="currentColor"/><circle cx="8" cy="6.5" r="0.5" fill="currentColor"/><circle cx="10" cy="6.5" r="0.5" fill="currentColor"/>' },
      { slug: 'server', nameRu: 'Сервер', nameEn: 'Server', keywords: 'server,backend,hosting',
        svg: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="0.7" fill="currentColor"/><circle cx="7" cy="17" r="0.7" fill="currentColor"/><path d="M11 7h6"/><path d="M11 17h6"/>' },
      { slug: 'api', nameRu: 'API', nameEn: 'API', keywords: 'api,rest,endpoint',
        svg: '<rect x="3" y="7" width="6" height="10" rx="1"/><rect x="15" y="7" width="6" height="10" rx="1"/><path d="M9 10h6"/><path d="M9 14h6"/><circle cx="6" cy="11" r="0.5" fill="currentColor"/><circle cx="18" cy="11" r="0.5" fill="currentColor"/>' },
      { slug: 'database', nameRu: 'База данных', nameEn: 'Database', keywords: 'database,db,storage',
        svg: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>' },
      { slug: 'component', nameRu: 'Компонент', nameEn: 'Component', keywords: 'component,ui,react',
        svg: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>' },
      { slug: 'layout', nameRu: 'Layout', nameEn: 'Layout', keywords: 'layout,grid,structure',
        svg: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18"/><path d="M9 9v12"/><path d="M15 12h6"/>' },
      { slug: 'responsive', nameRu: 'Responsive', nameEn: 'Responsive', keywords: 'responsive,mobile,adaptive',
        svg: '<rect x="2" y="4" width="14" height="10" rx="1"/><rect x="14" y="9" width="8" height="11" rx="1"/><path d="M5 17h6"/>' },
      { slug: 'deploy', nameRu: 'Deploy', nameEn: 'Deploy', keywords: 'deploy,rocket,release',
        svg: '<path d="M5 15l4-10 4 4-2 6z"/><path d="M9 5l8 4-3 5"/><path d="M14 14l3 5"/><path d="M5 15l4 4"/>' },
      { slug: 'security', nameRu: 'Security', nameEn: 'Security', keywords: 'security,shield,lock',
        svg: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>' },
    ],
  },
]

async function seed() {
  console.log('Seeding...')
  const admin = await db.user.upsert({
    where: { email: 'admin@iconhub.test' },
    update: { role: 'admin', credits: 1000 },
    create: { email: 'admin@iconhub.test', name: 'Admin', role: 'admin', credits: 1000 },
  })
  await db.user.upsert({
    where: { email: 'demo@iconhub.test' },
    update: {},
    create: { email: 'demo@iconhub.test', name: 'Demo User', role: 'user', credits: 30 },
  })

  await db.customPackIcon.deleteMany()
  await db.customIcon.deleteMany()
  await db.customPack.deleteMany()
  await db.icon.deleteMany()
  await db.pack.deleteMany()

  for (const pack of PACKS) {
    await db.pack.create({
      data: {
        slug: pack.slug,
        nameRu: pack.nameRu,
        nameEn: pack.nameEn,
        descRu: pack.descRu,
        descEn: pack.descEn,
        category: pack.category,
        style: pack.style,
        tags: pack.tags,
        isFree: pack.isFree,
        priceCredits: pack.priceCredits,
        icons: {
          create: pack.icons.map((ic) => ({
            slug: ic.slug,
            nameRu: ic.nameRu,
            nameEn: ic.nameEn,
            keywords: ic.keywords,
            svg: ic.svg,
            viewBox: '0 0 24 24',
          })),
        },
      },
    })
    console.log(`  ✓ Pack "${pack.slug}" with ${pack.icons.length} icons`)
  }
  console.log(`Admin: ${admin.email}`)
  console.log('Done.')
}

seed()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
