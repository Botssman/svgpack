/**
 * SVG-рендерер: применяет конфиг кастомизации к svg-телу иконки.
 */

export type CustomConfig = {
  color: string
  color2: string
  strokeWidth: number
  size: number
  background: 'none' | 'circle' | 'square'
  bgColor: string
  rotation: number
  mode: 'mono' | 'duotone'
}

export const DEFAULT_CONFIG: CustomConfig = {
  color: '#0F172A',
  color2: '#38BDF8',
  strokeWidth: 1.75,
  size: 24,
  background: 'none',
  bgColor: '#F1F5F9',
  rotation: 0,
  mode: 'mono',
}

/**
 * Рендерит финальный SVG с применением конфига.
 * innerSvg — содержимое <svg>...</svg> (paths, circles и т.д.) из БД.
 * viewBox — обычно "0 0 24 24".
 */
export function renderSvg(innerSvg: string, viewBox: string, cfg: CustomConfig): string {
  const size = cfg.size

  // 1. Применяем цвет: заменяем stroke="currentColor" на конкретный
  // и для duotone-режима чередуем paths между color и color2
  let body = innerSvg

  if (cfg.mode === 'duotone') {
    // Разбиваем по элементам и чередуем цвета
    const parts = body.split(/(<[^>]+\/>)/g).filter(Boolean)
    let idx = 0
    body = parts
      .map((p) => {
        if (p.startsWith('<')) {
          const color = idx % 2 === 0 ? cfg.color : cfg.color2
          idx++
          if (p.includes('fill=')) {
            return p.replace(/fill="[^"]*"/g, `fill="${color}"`)
          }
          if (p.includes('stroke=')) {
            return p.replace(/stroke="[^"]*"/g, `stroke="${color}"`)
          }
          // Добавляем stroke по умолчанию для путей без атрибутов
          if (p.startsWith('<path') || p.startsWith('<circle') || p.startsWith('<rect') || p.startsWith('<ellipse')) {
            return p.replace(/<(\w+)/, `<$1 fill="none" stroke="${color}"`)
          }
          return p
        }
        return p
      })
      .join('')
  } else {
    // Моно-режим: все currentColor → cfg.color
    body = body.replace(/currentColor/g, cfg.color)
    // Если в путях нет stroke, добавляем
    body = body.replace(/<path(?![^>]*stroke=)/g, `<path stroke="${cfg.color}"`)
    body = body.replace(/<circle(?![^>]*stroke=)/g, `<circle stroke="${cfg.color}"`)
    body = body.replace(/<rect(?![^>]*stroke=)/g, `<rect stroke="${cfg.color}"`)
    body = body.replace(/<ellipse(?![^>]*stroke=)/g, `<ellipse stroke="${cfg.color}"`)
  }

  // 2. Принудительно выставляем stroke-width, fill="none" для outline-стиля (если не указано иное)
  body = body.replace(/stroke-width="[^"]*"/g, `stroke-width="${cfg.strokeWidth}"`)
  // если stroke-width вообще нет — добавим к каждому path/circle/rect
  if (!/stroke-width=/.test(body)) {
    body = body.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*stroke-width=)/g, `<$1 stroke-width="${cfg.strokeWidth}"`)
  }
  // fill="none" по умолчанию для outline (если нет явного fill)
  body = body.replace(/<path(?![^>]*fill=)/g, `<path fill="none"`)

  // 3. Оборачиваем в <svg> с возможным фоном
  const rotation = cfg.rotation
  const needsG = rotation !== 0
  const bgShape =
    cfg.background === 'circle'
      ? `<circle cx="12" cy="12" r="11" fill="${cfg.bgColor}" />`
      : cfg.background === 'square'
      ? `<rect x="0.5" y="0.5" width="23" height="23" rx="3" fill="${cfg.bgColor}" />`
      : ''

  const inner = `${bgShape}${needsG ? `<g transform="rotate(${rotation} 12 12)">` : ''}${body}${needsG ? '</g>' : ''}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="${cfg.color}" stroke-width="${cfg.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}

/**
 * Простейший ZIP-генератор без сжатия (store mode).
 * Реализация минимума спецификации PKZIP, чтобы не тащить зависимость.
 */
export function makeZip(files: { name: string; content: string }[]): string {
  const encoder = new TextEncoder()
  const fileRecords: Uint8Array[] = []
  const centralRecords: Uint8Array[] = []
  let offset = 0

  for (const f of files) {
    const nameBytes = encoder.encode(f.name)
    const dataBytes = encoder.encode(f.content)
    const crc = crc32(dataBytes)

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length)
    const dv = new DataView(local.buffer)
    dv.setUint32(0, 0x04034b50, true) // signature
    dv.setUint16(4, 20, true) // version needed
    dv.setUint16(6, 0, true) // flags
    dv.setUint16(8, 0, true) // compression: store
    dv.setUint16(10, 0, true) // mod time
    dv.setUint16(12, 0, true) // mod date
    dv.setUint32(14, crc, true) // crc32
    dv.setUint32(18, dataBytes.length, true) // compressed size
    dv.setUint32(22, dataBytes.length, true) // uncompressed size
    dv.setUint16(26, nameBytes.length, true) // filename length
    dv.setUint16(28, 0, true) // extra field length
    local.set(nameBytes, 30)
    local.set(dataBytes, 30 + nameBytes.length)

    fileRecords.push(local)

    // Central directory header
    const central = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(central.buffer)
    cdv.setUint32(0, 0x02014b50, true) // signature
    cdv.setUint16(4, 20, true) // version made by
    cdv.setUint16(6, 20, true) // version needed
    cdv.setUint16(8, 0, true) // flags
    cdv.setUint16(10, 0, true) // compression
    cdv.setUint16(12, 0, true) // mod time
    cdv.setUint16(14, 0, true) // mod date
    cdv.setUint32(16, crc, true)
    cdv.setUint32(20, dataBytes.length, true)
    cdv.setUint32(24, dataBytes.length, true)
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint16(30, 0, true) // extra
    cdv.setUint16(32, 0, true) // comment
    cdv.setUint16(34, 0, true) // disk number
    cdv.setUint16(36, 0, true) // internal attrs
    cdv.setUint32(38, 0, true) // external attrs
    cdv.setUint32(42, offset, true) // offset of local header
    central.set(nameBytes, 46)

    centralRecords.push(central)
    offset += local.length
  }

  // End of central directory record
  const centralSize = centralRecords.reduce((s, r) => s + r.length, 0)
  const centralOffset = offset
  const end = new Uint8Array(22)
  const edv = new DataView(end.buffer)
  edv.setUint32(0, 0x06054b50, true)
  edv.setUint16(4, 0, true)
  edv.setUint16(6, 0, true)
  edv.setUint16(8, files.length, true)
  edv.setUint16(10, files.length, true)
  edv.setUint32(12, centralSize, true)
  edv.setUint32(16, centralOffset, true)
  edv.setUint16(20, 0, true)

  // Combine
  const totalLength = fileRecords.reduce((s, r) => s + r.length, 0) + centralSize + end.length
  const result = new Uint8Array(totalLength)
  let pos = 0
  for (const r of fileRecords) { result.set(r, pos); pos += r.length }
  for (const r of centralRecords) { result.set(r, pos); pos += r.length }
  result.set(end, pos)

  // Convert to base64
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < result.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(result.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

// CRC32 implementation
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
