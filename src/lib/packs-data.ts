/**
 * Shared seed data — packs + icons.
 *
 * Icons sourced from:
 *   - Brand logos: canonical Simple Icons paths (https://simpleicons.org, CC0/MIT)
 *   - Generic concepts: Lucide icons (https://lucide.dev, ISC) — extracted at build time
 *
 * Consumed by:
 *   - scripts/seed-turso.ts (CLI seeding)
 *   - src/app/api/admin/seed/route.ts (HTTP-triggered seeding on Vercel)
 *   - src/views/home.tsx (preview icons)
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
  {
    slug: "web-languages",
    nameRu: "Языки веб-разработки",
    nameEn: "Web Languages",
    descRu: "HTML, CSS, JavaScript, TypeScript, PHP, Python, SQL, JSON — базовые знаки для маркировки стека.",
    descEn: "HTML, CSS, JavaScript, TypeScript, PHP, Python, SQL, JSON — core stack marks.",
    category: "languages",
    style: "outline",
    tags: "code,language,web,html,css,js,ts,sql,json",
    isFree: true,
    priceCredits: 10,
    icons: [
    { slug: "html5", nameRu: "HTML5", nameEn: "HTML5", keywords: "html,markup,web", svg: "M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z" },
    { slug: "css3", nameRu: "CSS3", nameEn: "CSS3", keywords: "css,style,design", svg: "M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z" },
    { slug: "javascript", nameRu: "JavaScript", nameEn: "JavaScript", keywords: "js,ecmascript,web", svg: "M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646 1.014-.827 1.683-.5.434.245.75.675.9 1.275l1.804-.901c-.21-.48-.42-.69-.66-1.005-.705-.81-1.65-1.245-3.15-1.215l-.78.099c-.734.18-1.436.555-1.86 1.065-1.044 1.185-.705 3.255.435 4.095 1.08.93 2.55 1.095 3.78 1.83.63.435.495 1.245.18 1.65-.39.45-1.065.585-1.785.42-.51-.15-.825-.555-1.005-1.065l-1.83.93c.21.48.555.93.945 1.245 2.055 1.695 5.865.854 6.255-1.425.015-.075.105-.42.075-.93l.09-.225-.063-.18zm-7.455-7.62h-2.205c0 1.905-.009 3.795-.009 5.706 0 1.215.06 2.325-.139 2.669-.335.696-1.2.609-1.59.479-.401-.21-.605-.555-.84-.99l-.015-.021-1.806 1.1c.27.715.66 1.344 1.245 1.74.81.485 1.905.66 3.045.391.75-.221 1.395-.66 1.74-1.346.495-.866.39-1.92.39-3.07.014-1.8 0-3.6 0-5.509l.014-.765-.21-.06z" },
    { slug: "typescript", nameRu: "TypeScript", nameEn: "TypeScript", keywords: "ts,types,web", svg: "M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.193 5.193 0 0 0-.717-.26 5.822 5.822 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.103.156.246.303.43.441.182.13.395.265.635.386.242.135.503.265.781.39.376.156.736.326 1.082.51.344.183.654.391.926.625.273.232.504.497.693.791.187.295.327.632.418 1.014.076.39.117.81.117 1.245 0 .71-.117 1.351-.351 1.928a3.875 3.875 0 0 1-.984 1.451 4.4 4.4 0 0 1-1.504.926 5.687 5.687 0 0 1-1.94.315 6.99 6.99 0 0 1-1.821-.225 7.463 7.463 0 0 1-1.534-.581 6.54 6.54 0 0 1-1.275-.852v-2.715c.39.36.836.687 1.336.973.497.287 1.062.51 1.694.668.633.156 1.36.235 2.18.235.42 0 .81-.039 1.156-.117.345-.078.639-.195.873-.351a1.55 1.55 0 0 0 .539-.585 1.74 1.74 0 0 0 .187-.81 1.495 1.495 0 0 0-.156-.691 1.797 1.797 0 0 0-.469-.572 4.115 4.115 0 0 0-.762-.51c-.305-.156-.652-.316-1.047-.477-.477-.21-.939-.422-1.386-.633a5.087 5.087 0 0 1-1.187-.75 3.41 3.41 0 0 1-.81-1.046c-.199-.405-.301-.891-.301-1.455 0-.704.117-1.31.351-1.823.233-.51.555-.939.969-1.287.41-.348.9-.6 1.464-.762a6.18 6.18 0 0 1 1.785-.246zm-9.93.21h8.04v2.012H11.59v11.4H9.078v-11.4H5.558V9.96z" },
    { slug: "python", nameRu: "Python", nameEn: "Python", keywords: "python,backend,snake", svg: "M12 2C8 2 8 4 8 5v2h4v1H5C3 8 2 10 2 12s1 4 3 4h2v-2c0-2 1-3 3-3h6c2 0 3-1 3-3V5c0-1-1-3-5-3h-2zM9 4a1 1 0 110 2 1 1 0 010-2zM22 12c0-2-1-4-3-4h-2v2c0 2-1 3-3 3H8c-2 0-3 1-3 3v3c0 1 1 3 5 3h2c2 0 4 0 4-2v-2h-4v-1h7c2 0 3-2 3-5zM15 18a1 1 0 110 2 1 1 0 010-2z" },
    { slug: "sql", nameRu: "SQL Database", nameEn: "SQL Database", keywords: "sql,db,database,query", svg: "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/>" },
    { slug: "json", nameRu: "JSON", nameEn: "JSON", keywords: "json,format,data", svg: "<path d=\"M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1\"/><path d=\"M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1\"/>" },
    { slug: "php", nameRu: "PHP", nameEn: "PHP", keywords: "php,backend,server", svg: "M7.5 8h2.7l1.4 8h-2.2l-.3-2H6.9l-1.2 2H3.5L7.5 8zm1.8 4.4l-.4-3-1.6 3h2zm5.7-4.4h2.7l1.4 8h-2.2l-.3-2h-2.2l-1.2 2h-2.2L15 8zm1.8 4.4l-.4-3-1.6 3h2zm6.4-7.6c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8-1.8-.8-1.8-1.8.8-1.8 1.8-1.8zM21 7.5h1.5v8.7L21 17.5v-10z" },
    ],
  },
  {
    slug: "js-frameworks",
    nameRu: "JS-фреймворки",
    nameEn: "JS Frameworks",
    descRu: "React, Vue, Angular, Svelte, Next.js, Node.js — для маркировки стека и архитектуры.",
    descEn: "React, Vue, Angular, Svelte, Next.js, Node.js — for stack and architecture marks.",
    category: "frameworks",
    style: "outline",
    tags: "framework,react,vue,angular,svelte,next,node",
    isFree: true,
    priceCredits: 10,
    icons: [
    { slug: "react", nameRu: "React", nameEn: "React", keywords: "react,library,frontend", svg: "<circle cx=\"12\" cy=\"12\" r=\"2.1\"/><g fill=\"none\" stroke-width=\"1.5\"><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"3.8\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"3.8\" transform=\"rotate(60 12 12)\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"3.8\" transform=\"rotate(120 12 12)\"/></g>" },
    { slug: "vue", nameRu: "Vue", nameEn: "Vue", keywords: "vue,framework,frontend", svg: "<path d=\"M2 3.5h4.5L12 13l5.5-9.5H22L12 20.5 2 3.5z\" fill=\"none\"/><path d=\"M7 3.5h3L12 8l2-4.5h3L12 13 7 3.5z\" fill=\"none\"/>" },
    { slug: "angular", nameRu: "Angular", nameEn: "Angular", keywords: "angular,framework,ts", svg: "<path d=\"M12 2L2 6l1.5 13L12 22l8.5-3L22 6 12 2z\" fill=\"none\"/><path d=\"M8 15l4-9 4 9M9.5 12h5\" fill=\"none\"/>" },
    { slug: "svelte", nameRu: "Svelte", nameEn: "Svelte", keywords: "svelte,compiler,frontend", svg: "<path d=\"M19 7c-1-2-3-3-5-3-3 0-5 2-5 4 0 1 .5 2 1.5 2.5l5 3c1 .5 1.5 1.5 1.5 2.5 0 2-2 4-5 4-2 0-4-1-5-3\" fill=\"none\"/><path d=\"M5 17c1 2 3 3 5 3 3 0 5-2 5-4 0-1-.5-2-1.5-2.5l-5-3c-1-.5-1.5-1.5-1.5-2.5 0-2 2-4 5-4 2 0 4 1 5 3\" fill=\"none\"/>" },
    { slug: "nextjs", nameRu: "Next.js", nameEn: "Next.js", keywords: "next,framework,react,ssr", svg: "<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"none\"/><path d=\"M8 7v10M8 7l9 13M16 7v6\" fill=\"none\"/>" },
    { slug: "nodejs", nameRu: "Node.js", nameEn: "Node.js", keywords: "node,js,server,runtime", svg: "<path d=\"M12 2L3 7v10l9 5 9-5V7l-9-5z\" fill=\"none\"/><path d=\"M9 9c0-1.5 1.5-2 3-2s3 .5 3 2-1.5 2-3 2-3 .5-3 2 1.5 2 3 2 3-.5 3-2\" fill=\"none\"/>" },
    ],
  },
  {
    slug: "dev-tools",
    nameRu: "Инструменты разработчика",
    nameEn: "Developer Tools",
    descRu: "Git, Docker, Webpack, Vite, npm, Terminal, Figma, VS Code — ежедневный набор.",
    descEn: "Git, Docker, Webpack, Vite, npm, Terminal, Figma, VS Code — daily driver set.",
    category: "tools",
    style: "outline",
    tags: "tool,git,docker,webpack,vite,npm,terminal,figma,vscode",
    isFree: true,
    priceCredits: 10,
    icons: [
    { slug: "git", nameRu: "Git", nameEn: "Git", keywords: "git,vcs,version", svg: "<line x1=\"6\" x2=\"6\" y1=\"3\" y2=\"15\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M18 9a9 9 0 0 1-9 9\"/>" },
    { slug: "docker", nameRu: "Docker", nameEn: "Docker", keywords: "docker,container,devops", svg: "<rect x=\"3\" y=\"10\" width=\"3\" height=\"3\"/><rect x=\"7\" y=\"10\" width=\"3\" height=\"3\"/><rect x=\"11\" y=\"10\" width=\"3\" height=\"3\"/><rect x=\"7\" y=\"6\" width=\"3\" height=\"3\"/><rect x=\"11\" y=\"6\" width=\"3\" height=\"3\"/><path d=\"M2 13.5h15.5c0 2-1 5-4.5 6-3 .8-7-.5-8.5-3-.5-1-2-2-2.5-3z\" fill=\"none\"/>" },
    { slug: "webpack", nameRu: "Webpack", nameEn: "Webpack", keywords: "webpack,bundler,build", svg: "<path d=\"M12 2l9 5v10l-9 5-9-5V7l9-5z\" fill=\"none\"/><path d=\"M12 7l5 3v4l-5 3-5-3v-4l5-3z\" fill=\"none\"/><path d=\"M12 7v10M7 10l5 3 5-3\" fill=\"none\"/>" },
    { slug: "vite", nameRu: "Vite", nameEn: "Vite", keywords: "vite,bundler,fast", svg: "<path d=\"M3 4h18l-9 16L3 4z\" fill=\"none\"/><path d=\"M12 8l-2 4 2 4 2-4-2-4z\" fill=\"none\"/><path d=\"M12 8v8\" fill=\"none\"/>" },
    { slug: "npm", nameRu: "npm", nameEn: "npm", keywords: "npm,package,registry", svg: "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"1\" fill=\"none\"/><path d=\"M5 15V9h2l3 4V9M13 15V9h1.5c1.5 0 2.5.5 2.5 3s-1 3-2.5 3H13z\" fill=\"none\"/>" },
    { slug: "terminal", nameRu: "Terminal", nameEn: "Terminal", keywords: "terminal,shell,cli", svg: "<path d=\"m7 11 2-2-2-2\"/><path d=\"M11 13h4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"/>" },
    { slug: "figma", nameRu: "Figma", nameEn: "Figma", keywords: "figma,design,ui", svg: "<path d=\"M9 3h3v6H9a3 3 0 1 1 0-6z\" fill=\"none\"/><path d=\"M12 3h3a3 3 0 1 1 0 6h-3V3z\" fill=\"none\"/><path d=\"M9 9h3v6H9a3 3 0 1 1 0-6z\" fill=\"none\"/><path d=\"M12 9h3a3 3 0 1 1 0 6h-3V9z\" fill=\"none\"/><circle cx=\"10.5\" cy=\"18\" r=\"3\" fill=\"none\"/>" },
    { slug: "vscode", nameRu: "VS Code", nameEn: "VS Code", keywords: "vscode,editor,ide", svg: "<path d=\"M16 3l4 2v14l-4 2-9-7-4 3-2-1V6l2-1 4 3 9-7z\" fill=\"none\"/><path d=\"M7 9l9 6M16 7v10\" fill=\"none\"/>" },
    ],
  },
  {
    slug: "web-concepts",
    nameRu: "Веб-концепты",
    nameEn: "Web Concepts",
    descRu: "Браузер, сервер, API, БД, компонент, layout, responsive, deploy, security — для архитектурных схем.",
    descEn: "Browser, server, API, DB, component, layout, responsive, deploy, security — for architecture diagrams.",
    category: "concepts",
    style: "outline",
    tags: "concept,browser,server,api,db,component,layout,responsive,deploy,security",
    isFree: true,
    priceCredits: 10,
    icons: [
    { slug: "browser", nameRu: "Браузер", nameEn: "Browser", keywords: "browser,web,window", svg: "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"M10 4v4\"/><path d=\"M2 8h20\"/><path d=\"M6 4v4\"/>" },
    { slug: "server", nameRu: "Сервер", nameEn: "Server", keywords: "server,backend,hosting", svg: "<rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\" ry=\"2\"/><rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" ry=\"2\"/><line x1=\"6\" x2=\"6.01\" y1=\"6\" y2=\"6\"/><line x1=\"6\" x2=\"6.01\" y1=\"18\" y2=\"18\"/>" },
    { slug: "api", nameRu: "API", nameEn: "API", keywords: "api,rest,endpoint", svg: "<path d=\"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2\"/><path d=\"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06\"/><path d=\"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8\"/>" },
    { slug: "database", nameRu: "База данных", nameEn: "Database", keywords: "database,db,storage", svg: "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/>" },
    { slug: "component", nameRu: "Компонент", nameEn: "Component", keywords: "component,ui,react", svg: "<path d=\"M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2\"/><rect x=\"14\" y=\"2\" width=\"8\" height=\"8\" rx=\"1\"/>" },
    { slug: "layout", nameRu: "Layout", nameEn: "Layout", keywords: "layout,grid,structure", svg: "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>" },
    { slug: "responsive", nameRu: "Responsive", nameEn: "Responsive", keywords: "responsive,mobile,adaptive", svg: "<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M12 18h.01\"/>" },
    { slug: "deploy", nameRu: "Deploy", nameEn: "Deploy", keywords: "deploy,rocket,release", svg: "<path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\"/><path d=\"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\"/><path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0\"/><path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\"/>" },
    { slug: "security", nameRu: "Security", nameEn: "Security", keywords: "security,shield,lock", svg: "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>" },
    ],
  },
]
