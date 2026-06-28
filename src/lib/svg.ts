/**
 * SVG-рендерер: применяет конфиг кастомизации к svg-телу иконки.
 */

export type StrokeStyle = 'solid' | 'dashed' | 'dotted'
export type LineCap = 'round' | 'square' | 'butt'
export type LineJoin = 'round' | 'miter' | 'bevel'
export type BgShape = 'none' | 'circle' | 'square' | 'hexagon' | 'diamond'
export type ShadowType = 'none' | 'shadow' | 'glow'
export type AnimType = 'none' | 'spin' | 'pulse' | 'bounce' | 'shake' | 'wobble' | 'swing' | 'fade' | 'float' | 'blink' | 'slide'
export type EasingType = 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
export type ExportFormat = 'svg' | 'png' | 'react' | 'vue'

export type CustomConfig = {
  color: string
  color2: string
  strokeWidth: number
  size: number
  background: BgShape
  bgColor: string
  rotation: number
  mode: 'mono' | 'duotone'
  // Gradient support
  colorGradient: boolean
  colorGradientStops: { offset: number; color: string }[]
  gradientAngle: number
  bgGradient: boolean
  bgGradientStops: { offset: number; color: string }[]
  bgGradientAngle: number
  // Stroke style
  strokeStyle: StrokeStyle
  lineCap: LineCap
  lineJoin: LineJoin
  dashArray: string   // computed from strokeStyle + strokeWidth
  // Opacity
  opacity: number     // 0..1
  // Shadow / Glow
  shadowType: ShadowType
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  // Animation
  animation: AnimType
  animDuration: number   // seconds
  animEasing: EasingType
  animDelay: number      // seconds
  animIterations: number // 0 = infinite
  // Export
  exportFormat: ExportFormat
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
  colorGradient: false,
  colorGradientStops: [{ offset: 0, color: '#0F172A' }, { offset: 100, color: '#38BDF8' }],
  gradientAngle: 135,
  bgGradient: false,
  bgGradientStops: [{ offset: 0, color: '#F1F5F9' }, { offset: 100, color: '#CBD5E1' }],
  bgGradientAngle: 135,
  // Stroke style
  strokeStyle: 'solid',
  lineCap: 'round',
  lineJoin: 'round',
  dashArray: '',
  // Opacity
  opacity: 1,
  // Shadow / Glow
  shadowType: 'none',
  shadowColor: '#000000',
  shadowBlur: 3,
  shadowOffsetX: 1,
  shadowOffsetY: 1,
  // Animation
  animation: 'none',
  animDuration: 2,
  animEasing: 'ease',
  animDelay: 0,
  animIterations: 0, // infinite
  // Export
  exportFormat: 'svg',
}

/**
 * Compute dash-array from stroke style and width.
 */
function computeDashArray(style: StrokeStyle, strokeWidth: number): string {
  if (style === 'dashed') return `${strokeWidth * 4} ${strokeWidth * 2}`
  if (style === 'dotted') return `${strokeWidth} ${strokeWidth * 2}`
  return ''
}

/**
 * Generate CSS animation string for the given config.
 */
function animationCSS(cfg: CustomConfig, id: string): string {
  if (cfg.animation === 'none') return ''
  const dur = cfg.animDuration
  const easing = cfg.animEasing === 'ease-in-out' ? 'ease-in-out' : cfg.animEasing
  const delay = cfg.animDelay
  const iter = cfg.animIterations === 0 ? 'infinite' : String(cfg.animIterations)
  const name = `anim-${id}`
  let keyframes = ''
  let transform = ''
  switch (cfg.animation) {
    case 'spin':
      keyframes = `@keyframes ${name}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'pulse':
      keyframes = `@keyframes ${name}{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'bounce':
      keyframes = `@keyframes ${name}{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'shake':
      keyframes = `@keyframes ${name}{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'wobble':
      keyframes = `@keyframes ${name}{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'swing':
      keyframes = `@keyframes ${name}{0%,100%{transform:rotate(0)}50%{transform:rotate(10deg)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter} alternate`
      break
    case 'fade':
      keyframes = `@keyframes ${name}{0%,100%{opacity:1}50%{opacity:0.2}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'float':
      keyframes = `@keyframes ${name}{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
    case 'blink':
      keyframes = `@keyframes ${name}{0%,100%{opacity:1}50%{opacity:0}}`
      transform = `animation:${name} ${dur}s step-end ${delay}s ${iter}`
      break
    case 'slide':
      keyframes = `@keyframes ${name}{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}`
      transform = `animation:${name} ${dur}s ${easing} ${delay}s ${iter}`
      break
  }
  return `<style>${keyframes}</style>`
}

/**
 * Render a hexagon background shape centered at (12,12) with radius ~11.
 */
function hexagonBg(fill: string): string {
  const r = 11
  const cx = 12, cy = 12
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
  return `<polygon points="${pts}" fill="${fill}" />`
}

/**
 * Render a diamond background shape centered at (12,12).
 */
function diamondBg(fill: string): string {
  return `<polygon points="12,0.5 23.5,12 12,23.5 0.5,12" fill="${fill}" />`
}

/**
 * Рендерит финальный SVG с применением конфига.
 * innerSvg — содержимое <svg>...</svg> (paths, circles и т.д.) из БД.
 * viewBox — обычно "0 0 24 24".
 */
export function renderSvg(innerSvg: string, viewBox: string, cfg: CustomConfig): string {
  const size = cfg.size
  const animId = Math.random().toString(36).slice(2, 8)

  // 1. Применяем цвет: заменяем stroke="currentColor" на конкретный
  // и для duotone-режима чередуем paths между color и color2
  let body = innerSvg

  // Generate gradient defs if needed
  const gradientId = `grad-${animId}`
  const bgGradientId = `bg-grad-${animId}`
  let defs = ''

  if (cfg.colorGradient && cfg.colorGradientStops.length >= 2) {
    const angle = cfg.gradientAngle ?? 135
    const rad = (angle * Math.PI) / 180
    const x1 = Math.round(50 - Math.cos(rad) * 50)
    const y1 = Math.round(50 - Math.sin(rad) * 50)
    const x2 = Math.round(50 + Math.cos(rad) * 50)
    const y2 = Math.round(50 + Math.sin(rad) * 50)
    const stops = cfg.colorGradientStops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')
    defs += `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`
  }

  const effectiveColor = cfg.colorGradient ? `url(#${gradientId})` : cfg.color
  const effectiveColor2 = cfg.colorGradient ? cfg.color2 : cfg.color2

  if (cfg.mode === 'duotone') {
    // Разбиваем по элементам и чередуем цвета
    const parts = body.split(/(<[^>]+\/>)/g).filter(Boolean)
    let idx = 0
    body = parts
      .map((p) => {
        if (p.startsWith('<')) {
          const color = idx % 2 === 0 ? effectiveColor : effectiveColor2
          idx++
          if (p.includes('fill=')) {
            return p.replace(/fill="[^"]*"/g, `fill="${color}"`)
          }
          if (p.includes('stroke=')) {
            return p.replace(/stroke="[^"]*"/g, `stroke="${color}"`)
          }
          if (p.startsWith('<path') || p.startsWith('<circle') || p.startsWith('<rect') || p.startsWith('<ellipse')) {
            return p.replace(/<(\w+)/, `<$1 fill="none" stroke="${color}"`)
          }
          return p
        }
        return p
      })
      .join('')
  } else {
    // Моно-режим: все currentColor → effectiveColor
    if (cfg.colorGradient) {
      body = body.replace(/currentColor/g, effectiveColor)
      body = body.replace(/<path(?![^>]*stroke=)/g, `<path stroke="${effectiveColor}"`)
      body = body.replace(/<circle(?![^>]*stroke=)/g, `<circle stroke="${effectiveColor}"`)
      body = body.replace(/<rect(?![^>]*stroke=)/g, `<rect stroke="${effectiveColor}"`)
      body = body.replace(/<ellipse(?![^>]*stroke=)/g, `<ellipse stroke="${effectiveColor}"`)
    } else {
      body = body.replace(/currentColor/g, cfg.color)
      body = body.replace(/<path(?![^>]*stroke=)/g, `<path stroke="${cfg.color}"`)
      body = body.replace(/<circle(?![^>]*stroke=)/g, `<circle stroke="${cfg.color}"`)
      body = body.replace(/<rect(?![^>]*stroke=)/g, `<rect stroke="${cfg.color}"`)
      body = body.replace(/<ellipse(?![^>]*stroke=)/g, `<ellipse stroke="${cfg.color}"`)
    }
  }

  // 2. Принудительно выставляем stroke-width, fill="none" для outline-стиля
  body = body.replace(/stroke-width="[^"]*"/g, `stroke-width="${cfg.strokeWidth}"`)
  if (!/stroke-width=/.test(body)) {
    body = body.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*stroke-width=)/g, `<$1 stroke-width="${cfg.strokeWidth}"`)
  }
  body = body.replace(/<path(?![^>]*fill=)/g, `<path fill="none"`)

  // 3. Apply dash-array
  const dashArray = cfg.dashArray || computeDashArray(cfg.strokeStyle, cfg.strokeWidth)
  if (dashArray) {
    body = body.replace(/stroke-dasharray="[^"]*"/g, '')
    body = body.replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*stroke-dasharray=)/g, `<$1 stroke-dasharray="${dashArray}"`)
  }

  // 4. Apply line-cap and line-join
  body = body.replace(/stroke-linecap="[^"]*"/g, `stroke-linecap="${cfg.lineCap}"`)
  body = body.replace(/stroke-linejoin="[^"]*"/g, `stroke-linejoin="${cfg.lineJoin}"`)
  if (!/stroke-linecap=/.test(body)) {
    body = body.replace(/<(path|circle|rect|ellipse|line|polyline)/g, `<$1 stroke-linecap="${cfg.lineCap}"`)
  }
  if (!/stroke-linejoin=/.test(body)) {
    body = body.replace(/<(path|circle|rect|ellipse|line|polyline)/g, `<$1 stroke-linejoin="${cfg.lineJoin}"`)
  }

  // 5. Оборачиваем в <svg> с возможным фоном
  const rotation = cfg.rotation
  const needsG = rotation !== 0

  // Background — solid or gradient, various shapes
  let bgShape = ''
  if (cfg.background === 'circle') {
    if (cfg.bgGradient && cfg.bgGradientStops.length >= 2) {
      const angle = cfg.bgGradientAngle ?? 135
      const rad = (angle * Math.PI) / 180
      const x1 = Math.round(50 - Math.cos(rad) * 50)
      const y1 = Math.round(50 - Math.sin(rad) * 50)
      const x2 = Math.round(50 + Math.cos(rad) * 50)
      const y2 = Math.round(50 + Math.sin(rad) * 50)
      const stops = cfg.bgGradientStops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')
      defs += `<linearGradient id="${bgGradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`
      bgShape = `<circle cx="12" cy="12" r="11" fill="url(#${bgGradientId})" />`
    } else {
      bgShape = `<circle cx="12" cy="12" r="11" fill="${cfg.bgColor}" />`
    }
  } else if (cfg.background === 'square') {
    if (cfg.bgGradient && cfg.bgGradientStops.length >= 2) {
      const angle = cfg.bgGradientAngle ?? 135
      const rad = (angle * Math.PI) / 180
      const x1 = Math.round(50 - Math.cos(rad) * 50)
      const y1 = Math.round(50 - Math.sin(rad) * 50)
      const x2 = Math.round(50 + Math.cos(rad) * 50)
      const y2 = Math.round(50 + Math.sin(rad) * 50)
      const stops = cfg.bgGradientStops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')
      defs += `<linearGradient id="${bgGradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`
      bgShape = `<rect x="0.5" y="0.5" width="23" height="23" rx="3" fill="url(#${bgGradientId})" />`
    } else {
      bgShape = `<rect x="0.5" y="0.5" width="23" height="23" rx="3" fill="${cfg.bgColor}" />`
    }
  } else if (cfg.background === 'hexagon') {
    if (cfg.bgGradient && cfg.bgGradientStops.length >= 2) {
      const angle = cfg.bgGradientAngle ?? 135
      const rad = (angle * Math.PI) / 180
      const x1 = Math.round(50 - Math.cos(rad) * 50)
      const y1 = Math.round(50 - Math.sin(rad) * 50)
      const x2 = Math.round(50 + Math.cos(rad) * 50)
      const y2 = Math.round(50 + Math.sin(rad) * 50)
      const stops = cfg.bgGradientStops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')
      defs += `<linearGradient id="${bgGradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`
      bgShape = hexagonBg(`url(#${bgGradientId})`)
    } else {
      bgShape = hexagonBg(cfg.bgColor)
    }
  } else if (cfg.background === 'diamond') {
    if (cfg.bgGradient && cfg.bgGradientStops.length >= 2) {
      const angle = cfg.bgGradientAngle ?? 135
      const rad = (angle * Math.PI) / 180
      const x1 = Math.round(50 - Math.cos(rad) * 50)
      const y1 = Math.round(50 - Math.sin(rad) * 50)
      const x2 = Math.round(50 + Math.cos(rad) * 50)
      const y2 = Math.round(50 + Math.sin(rad) * 50)
      const stops = cfg.bgGradientStops.map(s => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('')
      defs += `<linearGradient id="${bgGradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`
      bgShape = diamondBg(`url(#${bgGradientId})`)
    } else {
      bgShape = diamondBg(cfg.bgColor)
    }
  }

  // 6. Shadow / Glow filter
  let filterDef = ''
  let filterAttr = ''
  if (cfg.shadowType === 'shadow') {
    const fid = `shadow-${animId}`
    filterDef = `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${cfg.shadowOffsetX}" dy="${cfg.shadowOffsetY}" stdDeviation="${cfg.shadowBlur}" flood-color="${cfg.shadowColor}" flood-opacity="0.4"/></filter>`
    filterAttr = ` filter="url(#${fid})"`
  } else if (cfg.shadowType === 'glow') {
    const fid = `glow-${animId}`
    filterDef = `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="${cfg.shadowBlur}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    filterAttr = ` filter="url(#${fid})"`
  }

  const defsTag = defs || filterDef ? `<defs>${defs}${filterDef}</defs>` : ''

  // 7. Opacity
  const opacityAttr = cfg.opacity < 1 ? ` opacity="${cfg.opacity}"` : ''

  // 8. Animation
  const animStyle = animationCSS(cfg, animId)
  const animClass = cfg.animation !== 'none' ? ` class="anim-${animId}"` : ''

  const inner = `${defsTag}${bgShape}${needsG ? `<g transform="rotate(${rotation} 12 12)">` : ''}${body}${needsG ? '</g>' : ''}`

  const strokeAttr = cfg.colorGradient ? `stroke="url(#${gradientId})"` : `stroke="${cfg.color}"`
  const lineCapAttr = `stroke-linecap="${cfg.lineCap}"`
  const lineJoinAttr = `stroke-linejoin="${cfg.lineJoin}"`
  const dashAttr = dashArray ? ` stroke-dasharray="${dashArray}"` : ''

  return `${animStyle}<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" fill="none" ${strokeAttr} stroke-width="${cfg.strokeWidth}" ${lineCapAttr} ${lineJoinAttr}${dashAttr}${opacityAttr}${filterAttr}${animClass}>${inner}</svg>`
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
