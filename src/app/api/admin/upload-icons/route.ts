import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

/**
 * Dictionary for translating English icon terms to Russian.
 * Used as fallback when no explicit Russian name is provided.
 */
const EN_RU: Record<string, string> = {
  // UI / General
  icon: 'иконка', button: 'кнопка', menu: 'меню', tab: 'вкладка', modal: 'модальное окно',
  dialog: 'диалог', tooltip: 'подсказка', badge: 'значок', card: 'карточка',
  panel: 'панель', sidebar: 'боковая панель', header: 'шапка', footer: 'подвал',
  navbar: 'навигация', breadcrumb: 'хлебные крошки', pagination: 'пагинация',
  dropdown: 'выпадающий список', checkbox: 'чекбокс', radio: 'радио',
  toggle: 'переключатель', slider: 'слайдер', input: 'поле ввода',
  textarea: 'текстовое поле', select: 'выбор', label: 'метка',
  form: 'форма', table: 'таблица', list: 'список', grid: 'сетка',
  search: 'поиск', filter: 'фильтр', sort: 'сортировка', refresh: 'обновить',

  // Arrows & Navigation
  arrow: 'стрелка', left: 'лево', right: 'право', up: 'верх', down: 'низ',
  top: 'верх', bottom: 'низ', back: 'назад', forward: 'вперёд',
  next: 'далее', previous: 'предыдущий', prev: 'предыдущий',
  chevron: 'шеврон', angle: 'угол', corner: 'угол',

  // Actions
  add: 'добавить', remove: 'удалить', delete: 'удалить', edit: 'редактировать',
  save: 'сохранить', cancel: 'отмена', close: 'закрыть', open: 'открыть',
  create: 'создать', update: 'обновить', send: 'отправить', submit: 'отправить',
  upload: 'загрузить', download: 'скачать', export: 'экспорт', import: 'импорт',
  copy: 'копировать', paste: 'вставить', cut: 'вырезать', undo: 'отменить',
  redo: 'повторить', reset: 'сбросить', clear: 'очистить', confirm: 'подтвердить',
  accept: 'принять', reject: 'отклонить', approve: 'одобрить', deny: 'отказать',
  play: 'воспроизвести', pause: 'пауза', stop: 'стоп', record: 'запись',
  share: 'поделиться', bookmark: 'закладка', favorite: 'избранное',
  print: 'печать', scan: 'сканировать', zoom: 'масштаб',

  // People
  user: 'пользователь', person: 'человек', people: 'люди', group: 'группа',
  team: 'команда', man: 'мужчина', woman: 'женщина', boy: 'мальчик',
  girl: 'девочка', baby: 'ребёнок', admin: 'администратор',
  teacher: 'учитель', student: 'студент', doctor: 'врач',

  // Communication
  mail: 'почта', email: 'почта', message: 'сообщение', chat: 'чат',
  phone: 'телефон', call: 'звонок', video: 'видео', camera: 'камера',
  microphone: 'микрофон', speaker: 'динамик', volume: 'громкость',
  bell: 'колокольчик', notification: 'уведомление', alert: 'оповещение',
  inbox: 'входящие', outbox: 'исходящие', reply: 'ответ',

  // Objects
  home: 'дом', house: 'дом', building: 'здание', office: 'офис',
  store: 'магазин', shop: 'магазин', cart: 'корзина', basket: 'корзина',
  bag: 'сумка', box: 'коробка', package: 'посылка', gift: 'подарок',
  key: 'ключ', lock: 'замок', unlock: 'разблокировать', shield: 'щит',
  wallet: 'кошелёк', credit: 'кредит', money: 'деньги',
  coin: 'монета', dollar: 'доллар', euro: 'евро', ruble: 'рубль',
  clock: 'часы', time: 'время', calendar: 'календарь', date: 'дата',
  alarm: 'будильник', timer: 'таймер', stopwatch: 'секундомер',
  book: 'книга', document: 'документ', file: 'файл', folder: 'папка',
  page: 'страница', paper: 'бумага', note: 'заметка', clipboard: 'буфер',
  pen: 'ручка', pencil: 'карандаш', marker: 'маркер', brush: 'кисть',
  paint: 'краска', palette: 'палитра', color: 'цвет',

  // Devices
  computer: 'компьютер', laptop: 'ноутбук', desktop: 'рабочий стол',
  monitor: 'монитор', screen: 'экран', display: 'дисплей',
  keyboard: 'клавиатура', mouse: 'мышь', printer: 'принтер',
  tablet: 'планшет', mobile: 'мобильный', smartphone: 'смартфон',
  watch: 'часы', headphones: 'наушники', headset: 'гарнитура',
  server: 'сервер', database: 'база данных', cloud: 'облако',
  wifi: 'вайфай', bluetooth: 'блютуз', usb: 'юсб',

  // Status & Feedback
  check: 'галочка', checkmark: 'галочка', success: 'успех', error: 'ошибка',
  warning: 'предупреждение', info: 'информация', danger: 'опасность',
  question: 'вопрос', help: 'помощь', support: 'поддержка',
  loading: 'загрузка', spinner: 'спиннер', progress: 'прогресс',
  complete: 'завершено', pending: 'ожидание', active: 'активный',
  disabled: 'отключено', hidden: 'скрытый', visible: 'видимый',
  online: 'онлайн', offline: 'оффлайн',

  // Shapes & Symbols
  circle: 'круг', square: 'квадрат', triangle: 'треугольник',
  star: 'звезда', heart: 'сердце', diamond: 'ромб', hexagon: 'шестиугольник',
  cross: 'крест', plus: 'плюс', minus: 'минус', multiply: 'умножить',
  equal: 'равно', percent: 'процент', hash: 'решётка', at: 'собака',
  dot: 'точка', line: 'линия', dash: 'тире', wave: 'волна',

  // Nature & Weather
  sun: 'солнце', moon: 'луна', rain: 'дождь',
  snow: 'снег', wind: 'ветер', storm: 'шторм', lightning: 'молния',
  fire: 'огонь', water: 'вода', drop: 'капля', leaf: 'лист',
  tree: 'дерево', flower: 'цветок', mountain: 'гора', sea: 'море',
  earth: 'земля', globe: 'глобус', world: 'мир', map: 'карта',
  compass: 'компас', navigation: 'навигация', location: 'местоположение',
  pin: 'булавка', route: 'маршрут',

  // Transport
  car: 'машина', bus: 'автобус', train: 'поезд', plane: 'самолёт',
  bike: 'велосипед', bicycle: 'велосипед', ship: 'корабль', boat: 'лодка',
  rocket: 'ракета', truck: 'грузовик', taxi: 'такси', helicopter: 'вертолёт',

  // Food & Drink
  food: 'еда', drink: 'напиток', coffee: 'кофе', tea: 'чай',
  beer: 'пиво', wine: 'вино', cake: 'торт', pizza: 'пицца',

  // Education & Science
  school: 'школа', university: 'университет', science: 'наука',
  atom: 'атом', formula: 'формула', equation: 'уравнение',
  experiment: 'эксперимент', lab: 'лаборатория', microscope: 'микроскоп',
  graduation: 'выпускной', diploma: 'диплом', certificate: 'сертификат',
  award: 'награда', trophy: 'кубок', medal: 'медаль', crown: 'корона',
  lightbulb: 'лампочка', bulb: 'лампочка', idea: 'идея',

  // Security
  password: 'пароль', login: 'вход', logout: 'выход', signin: 'вход',
  signup: 'регистрация', register: 'регистрация', profile: 'профиль',
  settings: 'настройки', config: 'конфигурация', privacy: 'конфиденциальность',
  terms: 'условия', license: 'лицензия',

  // Media
  image: 'изображение', photo: 'фото', picture: 'картинка',
  gallery: 'галерея', music: 'музыка', song: 'песня', film: 'фильм',
  movie: 'фильм', tv: 'тв', podcast: 'подкаст',

  // Social
  like: 'нравится', love: 'любовь', dislike: 'не нравится',
  comment: 'комментарий', follow: 'подписаться', unfollow: 'отписаться',
  connection: 'связь', network: 'сеть', link: 'ссылка',
  external: 'внешний', internal: 'внутренний',

  // Misc
  eye: 'глаз', show: 'показать', hide: 'скрыть', view: 'просмотр',
  full: 'полный', empty: 'пустой', fill: 'заливка', stroke: 'обводка',
  bold: 'жирный', italic: 'курсив', underline: 'подчёркнутый',
  align: 'выравнивание', center: 'центр', middle: 'середина',
  horizontal: 'горизонтальный', vertical: 'вертикальный',
  width: 'ширина', height: 'высота', size: 'размер',
  max: 'максимум', min: 'минимум', total: 'итого', sum: 'сумма',
  new: 'новый', old: 'старый', free: 'бесплатно', premium: 'премиум',
  pro: 'про', business: 'бизнес', personal: 'личный',
  public: 'публичный', private: 'личный',
  light: 'светлый', dark: 'тёмный', theme: 'тема',
  mode: 'режим', language: 'язык', flag: 'флаг',
  code: 'код', terminal: 'терминал', bug: 'баг',
  target: 'цель', goal: 'цель', milestone: 'этап',
  megaphone: 'мегафон', announcement: 'объявление',
  envelope: 'конверт', checklist: 'чеклист', task: 'задача',
  project: 'проект', workflow: 'процесс', pipeline: 'конвейер',
  analytics: 'аналитика', statistics: 'статистика', chart: 'график',
  graph: 'график', dashboard: 'дашборд', report: 'отчёт',
  energy: 'энергия', power: 'мощность', battery: 'батарея',
  plug: 'вилка', outlet: 'розетка', flash: 'вспышка',
  magnifier: 'лупа', lens: 'линза',
  thumbs: 'палец', finger: 'палец', hand: 'рука',
  foot: 'нога', walk: 'ходьба', run: 'бег', jump: 'прыжок',
  sit: 'сидеть', stand: 'стоять', swim: 'плавать',
  happy: 'счастливый', sad: 'грустный', angry: 'злой', smile: 'улыбка',
  face: 'лицо', emoji: 'эмодзи',
}

function translateToRu(words: string[]): string {
  return words.map(word => EN_RU[word.toLowerCase()] || word).join(' ')
}

/**
 * Supported metadata JSON formats inside the ZIP archive:
 *
 * 1. Simple map:  { "icon-slug": "Русское название" }
 * 2. Full map:    { "icon-slug": { "nameRu": "...", "nameEn": "...", "keywords": "..." } }
 *
 * The file can be named: icons.json, meta.json, или _icons.json
 */
type MetaValue = string | { nameRu?: string; nameEn?: string; keywords?: string }
type MetaMap = Record<string, MetaValue>

function parseMetaJson(raw: string): MetaMap {
  const parsed = JSON.parse(raw)
  if (typeof parsed !== 'object' || !parsed) return {}
  return parsed as MetaMap
}

function getMetaField(val: MetaValue | undefined, field: 'nameRu' | 'nameEn' | 'keywords'): string | undefined {
  if (!val) return undefined
  if (typeof val === 'string') return field === 'nameRu' ? val : undefined
  return val[field]
}

/**
 * POST /api/admin/upload-icons
 *
 * Accepts a ZIP archive with SVG files (flat or in subfolders).
 * Russian names are resolved in this priority:
 *   1. icons.json / meta.json in the archive (most control)
 *   2. Filename convention: "arrow-right--стрелка-вправо.svg" (double dash)
 *   3. <title> tag inside the SVG
 *   4. Auto-translation from dictionary (fallback)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip files are supported' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    // ── 1. Look for metadata JSON file ──────────────────────────────
    let meta: MetaMap = {}
    const metaNames = ['icons.json', 'meta.json', '_icons.json']
    for (const name of metaNames) {
      // Check root and any subfolder
      zip.forEach((path, entry) => {
        if (!entry.dir && path.endsWith(name)) {
          metaNames.push(path) // will be found below
        }
      })
    }
    for (const name of [...new Set(metaNames)]) {
      const entry = zip.file(name)
      if (entry) {
        try {
          const raw = await entry.async('string')
          meta = parseMetaJson(raw)
          console.log(`[upload-icons] Found metadata file: ${name} (${Object.keys(meta).length} entries)`)
          break
        } catch {
          console.warn(`[upload-icons] Failed to parse ${name}, skipping`)
        }
      }
    }

    // ── 2. Collect SVG files ────────────────────────────────────────
    const svgFiles: { path: string; zipEntry: JSZip.JSZipObject }[] = []
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.svg')) {
        svgFiles.push({ path: relativePath, zipEntry })
      }
    })
    svgFiles.sort((a, b) => a.path.localeCompare(b.path))

    const icons: {
      slug: string
      nameRu: string
      nameEn: string
      keywords: string
      svg: string
      viewBox: string
    }[] = []

    for (const { path, zipEntry } of svgFiles) {
      const svgContent = await zipEntry.async('string')

      // Extract viewBox — handle both single and double quotes
      let viewBox = '0 0 24 24'
      const vbMatch = svgContent.match(/viewBox\s*=\s*["']([^"']+)["']/)
      if (vbMatch) {
        viewBox = vbMatch[1]
      } else {
        // Fallback: try width/height attributes
        const wMatch = svgContent.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
        const hMatch = svgContent.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["'?]/)
        if (wMatch && hMatch) {
          viewBox = `0 0 ${wMatch[1]} ${hMatch[1]}`
        }
      }

      // Extract inner SVG
      let innerSvg = svgContent
      const innerMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
      if (innerMatch) {
        innerSvg = innerMatch[1].trim()
      } else {
        innerSvg = svgContent.trim()
      }

      // Auto-detect viewBox from coordinates if it looks wrong
      // e.g. viewBox="0 0 24 24" but paths use coordinates in 0-100 range
      const vbParts = viewBox.split(/[\s,]+/).map(Number)
      if (vbParts.length === 4 && !isNaN(vbParts[2]) && !isNaN(vbParts[3])) {
        const maxCoord = vbParts[2] // expected max coordinate
        // Extract all numeric values from path data to find actual coordinate range
        const coordMatches = innerSvg.match(/[\d.]+/g)
        if (coordMatches) {
          const nums = coordMatches.map(Number).filter(n => !isNaN(n) && n > 1)
          if (nums.length > 0) {
            const actualMax = Math.max(...nums)
            // If max coordinate is significantly larger than viewBox, auto-fix
            if (actualMax > maxCoord * 1.5) {
              const scale = Math.ceil(actualMax / 10) * 10 // round up to nearest 10
              viewBox = `0 0 ${scale} ${scale}`
            }
          }
        }
      }

      // ── Parse filename ──────────────────────────────────────────
      const fileName = path.split('/').pop() || 'icon'
      const rawName = fileName.replace(/\.svg$/i, '')

      // Check for double-dash convention: "arrow-right--стрелка-вправо"
      let slugPart = rawName
      let ruFromFilename: string | undefined
      if (rawName.includes('--')) {
        const parts = rawName.split('--')
        slugPart = parts[0]
        ruFromFilename = parts.slice(1).join('--').trim()
      }

      // Check <title> tag inside SVG
      let ruFromTitle: string | undefined
      const titleMatch = svgContent.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) {
        const titleText = titleMatch[1].trim()
        // Only use as Russian name if it contains Cyrillic
        if (/[а-яёА-ЯЁ]/.test(titleText)) {
          ruFromTitle = titleText
        }
      }

      // Remove <title> tags from inner SVG (they often contain Russian text
      // that shouldn't be in the final SVG markup stored in the database)
      innerSvg = innerSvg.replace(/<title[^>]*>[\s\S]*?<\/title>\s*/gi, '')

      // Generate slug
      const slug = slugPart
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Split slug into words for English name
      const words = slugPart.split(/[-_\s]+/).filter(w => w.length > 0)
      const nameEn = getMetaField(meta[slug], 'nameEn') || words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')

      // Russian name — priority: meta.json → filename → <title> → dictionary
      const nameRu =
        getMetaField(meta[slug], 'nameRu') ||
        ruFromFilename ||
        ruFromTitle ||
        translateToRu(words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))

      // Keywords — priority: meta.json → combined EN+RU from filename
      const metaKeywords = getMetaField(meta[slug], 'keywords')
      let keywords: string
      if (metaKeywords) {
        keywords = metaKeywords
      } else {
        const enKw = words.map(w => w.toLowerCase()).filter(w => w.length > 1)
        const ruKw = words.map(w => EN_RU[w.toLowerCase()]).filter((w): w is string => !!w && w.length > 1)
        keywords = [...new Set([...enKw, ...ruKw])].join(', ')
      }

      icons.push({ slug, nameRu, nameEn, keywords, svg: innerSvg, viewBox })
    }

    return NextResponse.json({
      ok: true,
      totalFiles: svgFiles.length,
      icons,
    })
  } catch (e: any) {
    console.error('[/api/admin/upload-icons] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Failed to process ZIP archive' },
      { status: 500 },
    )
  }
}
