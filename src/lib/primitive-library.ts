/**
 * Primitive Library — a collection of hand-crafted SVG icon primitives
 * that can be used as building blocks for AI icon composition (Level 2)
 * or as fallback/reference examples.
 *
 * Each primitive:
 * - Uses viewBox="0 0 512 512"
 * - Uses `currentColor` for all colors
 * - Has no background, no text, no <svg> wrapper
 * - Has a category and keywords for search
 */

export interface SvgPrimitive {
  /** Unique identifier (kebab-case) */
  id: string
  /** Display name */
  name: string
  /** Russian name */
  nameRu: string
  /** Category for grouping */
  category: 'weather' | 'social' | 'navigation' | 'ui' | 'media' | 'communication' | 'commerce' | 'devices' | 'time' | 'arrows'
  /** Keywords for matching */
  keywords: string[]
  /** SVG content (inner elements only, no <svg> wrapper) */
  svg: string
  /** Fill mode this primitive is designed for */
  fillMode: 'outlined' | 'filled'
  /** Style this primitive matches best */
  style: 'minimal' | 'flat' | '3d' | 'gradient'
}

/**
 * Convert an uploaded SVG file to primitive format:
 * - Replace hardcoded colors with currentColor
 * - Normalize viewBox to 512x512
 * - Strip unnecessary attributes
 */
export function convertUploadedSvgToPrimitive(
  svgRaw: string,
  id: string,
  name: string,
  nameRu: string,
  category: SvgPrimitive['category'],
  fillMode: SvgPrimitive['fillMode'] = 'outlined',
  style: SvgPrimitive['style'] = 'minimal',
): SvgPrimitive | null {
  try {
    let svg = svgRaw

    // Extract inner content (strip <svg> wrapper)
    const svgMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)
    if (!svgMatch) return null

    let content = svgMatch[1].trim()

    // Get the original viewBox for coordinate scaling
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
    let originalViewBox = '0 0 100 100' // default
    if (viewBoxMatch) {
      originalViewBox = viewBoxMatch[1]
    }

    const [, , origW, origH] = originalViewBox.split(/[\s,]+/).map(Number)
    if (!origW || !origH) return null

    // Scale factor to 512x512
    const scaleX = 512 / origW
    const scaleY = 512 / origH

    // If viewBox is not 512x512, we need to scale the content
    // For simplicity, wrap in a <g> with transform — then strip the <g>
    if (Math.abs(origW - 512) > 1 || Math.abs(origH - 512) > 1) {
      content = `<g transform="scale(${scaleX}, ${scaleY})">${content}</g>`
    }

    // Replace hardcoded colors with currentColor
    content = content
      .replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"')
      .replace(/stroke="#[0-9a-fA-F]{3,8}"/g, 'stroke="currentColor"')
      .replace(/fill="black"/g, 'fill="currentColor"')
      .replace(/stroke="black"/g, 'stroke="currentColor"')
      .replace(/fill="white"/g, 'fill="currentColor"')
      .replace(/stroke="white"/g, 'stroke="currentColor"')

    // Strip unnecessary attributes
    content = content
      .replace(/\s+xmlns[^=]*="[^"]*"/g, '')
      .replace(/\s+xmlns:xlink="[^"]*"/g, '')
      .replace(/\s+id="[^"]*"/g, '')
      .replace(/\s+class="[^"]*"/g, '')
      .replace(/\s+style="enable-background[^"]*"/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\?xml[^?]*\?>/gi, '')

    // Flatten <g> tags (our scaling group + original groups)
    content = content
      .replace(/<g[^>]*>/gi, '')
      .replace(/<\/g>/gi, '')

    // Clean up whitespace
    content = content.replace(/\n\s*\n/g, '\n').trim()

    if (!content || content.length < 10) return null

    // Generate keywords from name
    const keywords = [
      ...name.toLowerCase().split(/[\s-_]+/),
      ...nameRu.toLowerCase().split(/[\s-_]+/),
      category,
    ].filter(k => k.length > 1)

    return {
      id,
      name,
      nameRu,
      category,
      keywords,
      svg: content,
      fillMode,
      style,
    }
  } catch (e) {
    console.error('[primitive-library] Failed to convert SVG:', e)
    return null
  }
}

// ─── Built-in primitives ──────────────────────────────────────────────
// These are high-quality icons designed for the primitive library.
// User-uploaded icons will be added here.

export const PRIMITIVES: SvgPrimitive[] = [
  // ─── Time category ────────────────────────────
  {
    id: 'calendar-outline',
    name: 'calendar',
    nameRu: 'Календарь',
    category: 'time',
    keywords: ['calendar', 'date', 'schedule', 'календарь', 'дата', 'расписание', 'time', 'планирование'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M148 56v60M364 56v60M80 196h352M80 148a40 40 0 0 1 40-40h272a40 40 0 0 1 40 40v280a40 40 0 0 1-40 40H120a40 40 0 0 1-40-40V148z" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="148" y="260" width="48" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="20"/>
<rect x="232" y="260" width="48" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="20"/>
<rect x="316" y="260" width="48" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="20"/>
<rect x="148" y="344" width="48" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="20"/>
<rect x="232" y="344" width="48" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="20"/>`,
  },
  {
    id: 'calendar-filled',
    name: 'calendar',
    nameRu: 'Календарь',
    category: 'time',
    keywords: ['calendar', 'date', 'schedule', 'календарь', 'дата', 'расписание', 'time'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M80 196h352v232a40 40 0 0 1-40 40H120a40 40 0 0 1-40-40V196z" fill="currentColor"/>
<path d="M80 148a40 40 0 0 1 40-40h272a40 40 0 0 1 40 40v48H80v-48z" fill="currentColor"/>
<rect x="148" y="56" width="28" height="60" rx="14" fill="currentColor"/>
<rect x="336" y="56" width="28" height="60" rx="14" fill="currentColor"/>
<rect x="152" y="264" width="40" height="40" rx="8" fill="rgba(255,255,255,0.3)"/>
<rect x="236" y="264" width="40" height="40" rx="8" fill="rgba(255,255,255,0.3)"/>
<rect x="320" y="264" width="40" height="40" rx="8" fill="rgba(255,255,255,0.3)"/>
<rect x="152" y="344" width="40" height="40" rx="8" fill="rgba(255,255,255,0.3)"/>
<rect x="236" y="344" width="40" height="40" rx="8" fill="rgba(255,255,255,0.3)"/>`,
  },
  {
    id: 'clock-outline',
    name: 'clock',
    nameRu: 'Часы',
    category: 'time',
    keywords: ['clock', 'time', 'часы', 'время', 'watch', 'timer'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<circle cx="256" cy="256" r="180" fill="none" stroke="currentColor" stroke-width="28"/>
<polyline points="256 148 256 256 340 300" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'clock-filled',
    name: 'clock',
    nameRu: 'Часы',
    category: 'time',
    keywords: ['clock', 'time', 'часы', 'время', 'watch', 'timer'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<circle cx="256" cy="256" r="180" fill="currentColor"/>
<polyline points="256 148 256 256 340 300" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`,
  },

  // ─── Weather category ────────────────────────────
  {
    id: 'sun-outline',
    name: 'sun',
    nameRu: 'Солнце',
    category: 'weather',
    keywords: ['sun', 'weather', 'солнце', 'погода', 'bright', 'day', 'день'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" stroke-width="28"/>
<path d="M256 56v60M256 396v60M56 256h60M396 256h60M115 115l42 42M355 355l42 42M115 397l42-42M355 115l42-42" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`,
  },
  {
    id: 'sun-filled',
    name: 'sun',
    nameRu: 'Солнце',
    category: 'weather',
    keywords: ['sun', 'weather', 'солнце', 'погода', 'bright', 'day'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<circle cx="256" cy="256" r="100" fill="currentColor"/>
<rect x="242" y="56" width="28" height="68" rx="14" fill="currentColor"/>
<rect x="242" y="388" width="28" height="68" rx="14" fill="currentColor"/>
<rect x="56" y="242" width="68" height="28" rx="14" fill="currentColor"/>
<rect x="388" y="242" width="68" height="28" rx="14" fill="currentColor"/>
<rect x="113" y="113" width="28" height="68" rx="14" fill="currentColor" transform="rotate(-45 127 147)"/>
<rect x="371" y="331" width="28" height="68" rx="14" fill="currentColor" transform="rotate(-45 385 365)"/>
<rect x="113" y="331" width="28" height="68" rx="14" fill="currentColor" transform="rotate(45 127 365)"/>
<rect x="371" y="113" width="28" height="68" rx="14" fill="currentColor" transform="rotate(45 385 147)"/>`,
  },
  {
    id: 'cloud-outline',
    name: 'cloud',
    nameRu: 'Облако',
    category: 'weather',
    keywords: ['cloud', 'weather', 'облако', 'погода', 'cloudy', 'overcast'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M140 356c-44 0-80-36-80-80 0-40 30-72 68-78 8-56 56-100 116-100 48 0 88 28 106 68 8-2 16-4 24-4 44 0 80 36 80 80s-36 80-80 80H140z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>`,
  },
  {
    id: 'cloud-filled',
    name: 'cloud',
    nameRu: 'Облако',
    category: 'weather',
    keywords: ['cloud', 'weather', 'облако', 'погода', 'cloudy', 'overcast'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M140 356c-44 0-80-36-80-80 0-40 30-72 68-78 8-56 56-100 116-100 48 0 88 28 106 68 8-2 16-4 24-4 44 0 80 36 80 80s-36 80-80 80H140z" fill="currentColor"/>`,
  },
  {
    id: 'rain-outline',
    name: 'rain',
    nameRu: 'Дождь',
    category: 'weather',
    keywords: ['rain', 'weather', 'дождь', 'погода', 'rainy', 'drizzle'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M140 300c-44 0-80-36-80-80 0-40 30-72 68-78 8-56 56-100 116-100 48 0 88 28 106 68 8-2 16-4 24-4 44 0 80 36 80 80s-36 80-80 80H140z" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>
<line x1="180" y1="340" x2="160" y2="400" stroke="currentColor" stroke-width="20" stroke-linecap="round"/>
<line x1="256" y1="340" x2="236" y2="400" stroke="currentColor" stroke-width="20" stroke-linecap="round"/>
<line x1="332" y1="340" x2="312" y2="400" stroke="currentColor" stroke-width="20" stroke-linecap="round"/>`,
  },

  // ─── Navigation / Arrows category ────────────────────────────
  {
    id: 'arrow-right-outline',
    name: 'arrow-right',
    nameRu: 'Стрелка вправо',
    category: 'arrows',
    keywords: ['arrow', 'right', 'next', 'forward', 'стрелка', 'вправо', 'далее', 'вперёд'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<line x1="80" y1="256" x2="432" y2="256" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>
<polyline points="300 124 432 256 300 388" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'arrow-left-outline',
    name: 'arrow-left',
    nameRu: 'Стрелка влево',
    category: 'arrows',
    keywords: ['arrow', 'left', 'back', 'стрелка', 'влево', 'назад'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<line x1="432" y1="256" x2="80" y2="256" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>
<polyline points="212 124 80 256 212 388" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'arrow-up-outline',
    name: 'arrow-up',
    nameRu: 'Стрелка вверх',
    category: 'arrows',
    keywords: ['arrow', 'up', 'upload', 'стрелка', 'вверх', 'загрузить'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<line x1="256" y1="432" x2="256" y2="80" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>
<polyline points="124 212 256 80 388 212" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'arrow-down-outline',
    name: 'arrow-down',
    nameRu: 'Стрелка вниз',
    category: 'arrows',
    keywords: ['arrow', 'down', 'download', 'стрелка', 'вниз', 'скачать'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<line x1="256" y1="80" x2="256" y2="432" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>
<polyline points="124 300 256 432 388 300" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`,
  },

  // ─── UI category ────────────────────────────
  {
    id: 'home-outline',
    name: 'home',
    nameRu: 'Дом',
    category: 'ui',
    keywords: ['home', 'house', 'main', 'дом', 'главная', 'housing'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M80 272v160a16 16 0 0 0 16 16h96v-112h128v112h96a16 16 0 0 0 16-16V272" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
<polyline points="56 264 256 80 456 264" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'home-filled',
    name: 'home',
    nameRu: 'Дом',
    category: 'ui',
    keywords: ['home', 'house', 'main', 'дом', 'главная', 'housing'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M80 272v160a16 16 0 0 0 16 16h96v-112h128v112h96a16 16 0 0 0 16-16V272L256 80z" fill="currentColor"/>`,
  },
  {
    id: 'search-outline',
    name: 'search',
    nameRu: 'Поиск',
    category: 'ui',
    keywords: ['search', 'find', 'magnifier', 'поиск', 'найти', 'лупа'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<circle cx="220" cy="220" r="140" fill="none" stroke="currentColor" stroke-width="28"/>
<line x1="320" y1="320" x2="440" y2="440" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`,
  },
  {
    id: 'search-filled',
    name: 'search',
    nameRu: 'Поиск',
    category: 'ui',
    keywords: ['search', 'find', 'magnifier', 'поиск', 'найти', 'лупа'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<circle cx="220" cy="220" r="140" fill="currentColor"/>
<rect x="310" y="310" width="28" height="160" rx="14" fill="currentColor" transform="rotate(-45 310 310)"/>`,
  },
  {
    id: 'settings-outline',
    name: 'settings',
    nameRu: 'Настройки',
    category: 'ui',
    keywords: ['settings', 'gear', 'config', 'настройки', 'шестерня', 'конфигурация'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<circle cx="256" cy="256" r="60" fill="none" stroke="currentColor" stroke-width="28"/>
<path d="M256 68v40M256 404v40M68 256h40M404 256h40M122 122l28 28M362 362l28 28M122 390l28-28M362 150l28-28" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`,
  },
  {
    id: 'heart-outline',
    name: 'heart',
    nameRu: 'Сердце',
    category: 'ui',
    keywords: ['heart', 'love', 'favorite', 'сердце', 'любовь', 'избранное'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M256 448l-30-27C118 323 48 258 48 181 48 118 98 68 161 68c35 0 68 16 95 42 28-26 61-42 96-42 62 0 112 50 112 113 0 77-70 142-178 240z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>`,
  },
  {
    id: 'heart-filled',
    name: 'heart',
    nameRu: 'Сердце',
    category: 'ui',
    keywords: ['heart', 'love', 'favorite', 'сердце', 'любовь', 'избранное'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M256 448l-30-27C118 323 48 258 48 181 48 118 98 68 161 68c35 0 68 16 95 42 28-26 61-42 96-42 62 0 112 50 112 113 0 77-70 142-178 240z" fill="currentColor"/>`,
  },
  {
    id: 'star-outline',
    name: 'star',
    nameRu: 'Звезда',
    category: 'ui',
    keywords: ['star', 'rating', 'favorite', 'звезда', 'рейтинг', 'избранное'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M256 68l60 148 160 14-120 104 36 156-136-80-136 80 36-156L36 230l160-14z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>`,
  },
  {
    id: 'star-filled',
    name: 'star',
    nameRu: 'Звезда',
    category: 'ui',
    keywords: ['star', 'rating', 'favorite', 'звезда', 'рейтинг', 'избранное'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M256 68l60 148 160 14-120 104 36 156-136-80-136 80 36-156L36 230l160-14z" fill="currentColor"/>`,
  },
  {
    id: 'user-outline',
    name: 'user',
    nameRu: 'Пользователь',
    category: 'ui',
    keywords: ['user', 'person', 'profile', 'пользователь', 'профиль', 'человек'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<circle cx="256" cy="170" r="80" fill="none" stroke="currentColor" stroke-width="28"/>
<path d="M100 440c0-86 70-156 156-156s156 70 156 156" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`,
  },
  {
    id: 'user-filled',
    name: 'user',
    nameRu: 'Пользователь',
    category: 'ui',
    keywords: ['user', 'person', 'profile', 'пользователь', 'профиль', 'человек'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<circle cx="256" cy="170" r="80" fill="currentColor"/>
<path d="M100 440c0-86 70-156 156-156s156 70 156 156z" fill="currentColor"/>`,
  },

  // ─── Media category ────────────────────────────
  {
    id: 'play-outline',
    name: 'play',
    nameRu: 'Воспроизвести',
    category: 'media',
    keywords: ['play', 'video', 'start', 'воспроизвести', 'видео', 'старт'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M160 100v312l240-156z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>`,
  },
  {
    id: 'play-filled',
    name: 'play',
    nameRu: 'Воспроизвести',
    category: 'media',
    keywords: ['play', 'video', 'start', 'воспроизвести', 'видео', 'старт'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M160 100v312l240-156z" fill="currentColor"/>`,
  },
  {
    id: 'pause-outline',
    name: 'pause',
    nameRu: 'Пауза',
    category: 'media',
    keywords: ['pause', 'stop', 'video', 'пауза', 'стоп', 'видео'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<rect x="140" y="100" width="60" height="312" rx="8" fill="none" stroke="currentColor" stroke-width="28"/>
<rect x="312" y="100" width="60" height="312" rx="8" fill="none" stroke="currentColor" stroke-width="28"/>`,
  },
  {
    id: 'music-outline',
    name: 'music',
    nameRu: 'Музыка',
    category: 'media',
    keywords: ['music', 'note', 'audio', 'song', 'музыка', 'нота', 'аудио'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<circle cx="180" cy="380" r="60" fill="none" stroke="currentColor" stroke-width="28"/>
<circle cx="360" cy="340" r="60" fill="none" stroke="currentColor" stroke-width="28"/>
<line x1="240" y1="380" x2="240" y2="100" stroke="currentColor" stroke-width="28"/>
<line x1="420" y1="340" x2="420" y2="60" stroke="currentColor" stroke-width="28"/>
<line x1="240" y1="100" x2="420" y2="60" stroke="currentColor" stroke-width="28"/>`,
  },

  // ─── Communication category ────────────────────────────
  {
    id: 'mail-outline',
    name: 'mail',
    nameRu: 'Почта',
    category: 'communication',
    keywords: ['mail', 'email', 'letter', 'почта', 'письмо', 'email'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<rect x="56" y="120" width="400" height="272" rx="32" fill="none" stroke="currentColor" stroke-width="28"/>
<polyline points="56,152 256,280 456,152" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>`,
  },
  {
    id: 'mail-filled',
    name: 'mail',
    nameRu: 'Почта',
    category: 'communication',
    keywords: ['mail', 'email', 'letter', 'почта', 'письмо', 'email'],
    fillMode: 'filled',
    style: 'flat',
    svg: `<rect x="56" y="120" width="400" height="272" rx="32" fill="currentColor"/>
<polyline points="56,152 256,280 456,152" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="24"/>`,
  },
  {
    id: 'bell-outline',
    name: 'bell',
    nameRu: 'Колокольчик',
    category: 'communication',
    keywords: ['bell', 'notification', 'alert', 'колокольчик', 'уведомление', 'оповещение'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M256 68c-66 0-120 54-120 120v100l-40 60h320l-40-60V188c0-66-54-120-120-120z" fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round"/>
<path d="M196 348a60 60 0 0 0 120 0" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round"/>`,
  },

  // ─── Commerce category ────────────────────────────
  {
    id: 'cart-outline',
    name: 'shopping-cart',
    nameRu: 'Корзина',
    category: 'commerce',
    keywords: ['cart', 'shopping', 'basket', 'корзина', 'покупки', 'магазин'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<path d="M56 100h60l48 260h220l48-180H156" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="188" cy="432" r="28" fill="none" stroke="currentColor" stroke-width="28"/>
<circle cx="340" cy="432" r="28" fill="none" stroke="currentColor" stroke-width="28"/>`,
  },
  {
    id: 'cart-filled',
    name: 'shopping-cart',
    nameRu: 'Корзина',
    category: 'commerce',
    keywords: ['cart', 'shopping', 'basket', 'корзина', 'покупки', 'магазин'],
    fillMode: 'filled',
    style: 'minimal',
    svg: `<path d="M56 100h60l48 260h220l48-180H156z" fill="currentColor"/>
<circle cx="188" cy="432" r="28" fill="currentColor"/>
<circle cx="340" cy="432" r="28" fill="currentColor"/>`,
  },

  // ─── Devices category ────────────────────────────
  {
    id: 'phone-outline',
    name: 'phone',
    nameRu: 'Телефон',
    category: 'devices',
    keywords: ['phone', 'mobile', 'cell', 'телефон', 'мобильный'],
    fillMode: 'outlined',
    style: 'minimal',
    svg: `<rect x="148" y="56" width="216" height="400" rx="32" fill="none" stroke="currentColor" stroke-width="28"/>
<circle cx="256" cy="406" r="20" fill="none" stroke="currentColor" stroke-width="20"/>`,
  },
  {
    id: 'phone-filled',
    name: 'phone',
    nameRu: 'Телефон',
    category: 'devices',
    keywords: ['phone', 'mobile', 'cell', 'телефон', 'мобильный'],
    fillMode: 'filled',
    style: 'flat',
    svg: `<rect x="148" y="56" width="216" height="400" rx="32" fill="currentColor"/>
<rect x="180" y="100" width="152" height="260" rx="8" fill="rgba(255,255,255,0.2)"/>
<circle cx="256" cy="406" r="20" fill="rgba(255,255,255,0.3)"/>`,
  },
  {
    id: 'camera-outline',
    name: 'camera',
    nameRu: 'Камера',
    category: 'devices',
    keywords: ['camera', 'photo', 'picture', 'камера', 'фото', 'фотография'],
    fillMode: 'outlined',
    style: 'flat',
    svg: `<rect x="56" y="160" width="400" height="280" rx="40" fill="none" stroke="currentColor" stroke-width="24"/>
<circle cx="256" cy="300" r="80" fill="none" stroke="currentColor" stroke-width="24"/>
<path d="M192 160l24-48h80l24 48" fill="none" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/>`,
  },
  {
    id: 'camera-filled',
    name: 'camera',
    nameRu: 'Камера',
    category: 'devices',
    keywords: ['camera', 'photo', 'picture', 'камера', 'фото', 'фотография'],
    fillMode: 'filled',
    style: 'flat',
    svg: `<rect x="56" y="160" width="400" height="280" rx="40" fill="currentColor"/>
<circle cx="256" cy="300" r="80" fill="rgba(255,255,255,0.2)"/>
<circle cx="256" cy="300" r="52" fill="rgba(255,255,255,0.3)"/>
<path d="M192 160l24-48h80l24 48" fill="currentColor"/>`,
  },
]

/**
 * Search primitives by keyword, name, or category
 */
export function searchPrimitives(query: string, fillMode?: string, style?: string): SvgPrimitive[] {
  const q = query.toLowerCase().trim()
  if (!q) return PRIMITIVES

  return PRIMITIVES.filter(p => {
    // Filter by fillMode if specified
    if (fillMode && p.fillMode !== fillMode) return false
    // Filter by style if specified
    if (style && p.style !== style && p.style !== 'minimal') return false

    // Match by keywords, name, or nameRu
    return (
      p.keywords.some(k => k.includes(q) || q.includes(k)) ||
      p.name.toLowerCase().includes(q) ||
      p.nameRu.toLowerCase().includes(q) ||
      p.category.includes(q)
    )
  })
}

/**
 * Get a primitive by ID
 */
export function getPrimitive(id: string): SvgPrimitive | undefined {
  return PRIMITIVES.find(p => p.id === id)
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  return [...new Set(PRIMITIVES.map(p => p.category))]
}

/**
 * Get primitives by category
 */
export function getPrimitivesByCategory(category: string): SvgPrimitive[] {
  return PRIMITIVES.filter(p => p.category === category)
}
