import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

/**
 * Dictionary for translating English icon terms to Russian.
 * Covers common icon categories: UI, arrows, people, objects, nature, etc.
 * Used to auto-generate nameRu from filename parts.
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
  inbox: 'входящие', outbox: 'исходящие', reply: 'ответ', forward: 'переслать',

  // Objects
  home: 'дом', house: 'дом', building: 'здание', office: 'офис',
  store: 'магазин', shop: 'магазин', cart: 'корзина', basket: 'корзина',
  bag: 'сумка', box: 'коробка', package: 'посылка', gift: 'подарок',
  key: 'ключ', lock: 'замок', unlock: 'разблокировать', shield: 'щит',
  wallet: 'кошелёк', credit: 'кредит', card: 'карта', money: 'деньги',
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
  sun: 'солнце', moon: 'луна', cloud: 'облако', rain: 'дождь',
  snow: 'снег', wind: 'ветер', storm: 'шторм', lightning: 'молния',
  fire: 'огонь', water: 'вода', drop: 'капля', leaf: 'лист',
  tree: 'дерево', flower: 'цветок', mountain: 'гора', sea: 'море',
  earth: 'земля', globe: 'глобус', world: 'мир', map: 'карта',
  compass: 'компас', navigation: 'навигация', location: 'местоположение',
  pin: 'булавка', marker: 'маркер', route: 'маршрут',

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

/**
 * Translate a human-readable English name to Russian using the dictionary.
 * e.g. "Arrow Right" → "Стрелка Право", "Shopping Cart" → "Корзина"
 * Falls back to the English word if not found in dictionary.
 */
function translateToRu(words: string[]): string {
  return words
    .map(word => {
      const lower = word.toLowerCase()
      return EN_RU[lower] || word
    })
    .join(' ')
}

/**
 * POST /api/admin/upload-icons
 *
 * Accepts a ZIP archive with SVG files (flat or in subfolders).
 * Extracts every .svg file, reads its content, and returns structured
 * icon data (slug, nameRu, nameEn, keywords, svg, viewBox) so the
 * frontend can preview and then save them to a pack.
 *
 * Body: multipart/form-data with field "file" = the ZIP archive
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

    const icons: {
      slug: string
      nameRu: string
      nameEn: string
      keywords: string
      svg: string
      viewBox: string
    }[] = []

    // Collect all .svg files (including nested in folders)
    const svgFiles: { path: string; zipEntry: JSZip.JSZipObject }[] = []
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.svg')) {
        svgFiles.push({ path: relativePath, zipEntry })
      }
    })

    // Sort by path for deterministic order
    svgFiles.sort((a, b) => a.path.localeCompare(b.path))

    for (const { path, zipEntry } of svgFiles) {
      const svgContent = await zipEntry.async('string')

      // Extract viewBox from the <svg> tag, default to "0 0 24 24"
      let viewBox = '0 0 24 24'
      const vbMatch = svgContent.match(/viewBox\s*=\s*"([^"]+)"/)
      if (vbMatch) {
        viewBox = vbMatch[1]
      }

      // Extract inner SVG content (everything inside <svg>...</svg>)
      let innerSvg = svgContent
      const innerMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
      if (innerMatch) {
        innerSvg = innerMatch[1].trim()
      } else {
        // If no <svg> wrapper, use the whole content as inner
        innerSvg = svgContent.trim()
      }

      // Generate slug from filename (without extension and path)
      const fileName = path.split('/').pop() || 'icon'
      const rawName = fileName.replace(/\.svg$/i, '')

      // Split filename into words
      const words = rawName.split(/[-_\s]+/).filter(w => w.length > 0)

      // English name: Title Case
      const nameEn = words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      // Russian name: translate each word via dictionary
      const nameRu = translateToRu(
        words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      )

      // Generate slug: lowercase, dashes
      const slug = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Keywords: both English and Russian terms
      const enKeywords = words.map(w => w.toLowerCase()).filter(w => w.length > 1)
      const ruKeywords = words
        .map(w => EN_RU[w.toLowerCase()])
        .filter((w): w is string => !!w && w.length > 1)
      const allKeywords = [...new Set([...enKeywords, ...ruKeywords])].join(', ')

      icons.push({
        slug,
        nameRu,
        nameEn,
        keywords: allKeywords,
        svg: innerSvg,
        viewBox,
      })
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
