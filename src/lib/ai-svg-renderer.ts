import { IconConfig, IconShape } from './icon-store'

/** Strip alpha channel from hex color — SVG attributes like flood-color require #rrggbb */
function toSixDigitHex(color: string): string {
  if (!color) return '#000000'
  const c = color.trim()
  if (/^#[0-9a-fA-F]{8}$/.test(c)) return c.slice(0, 7)
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c
  if (/^#[0-9a-fA-F]{3}$/.test(c)) return '#' + c[1]+c[1] + c[2]+c[2] + c[3]+c[3]
  return c
}

let uidCounter = 0
function uid(): string {
  uidCounter += 1
  // Deterministic counter-only ID — no random, no Date.now
  // This ensures server and client produce identical SVG strings,
  // preventing React hydration mismatches in dangerouslySetInnerHTML.
  return `icon-${uidCounter}`
}

function getShapeClipPath(shape: IconShape, id: string): string {
  switch (shape) {
    case 'square':
      return `<rect x="0" y="0" width="512" height="512" />`
    case 'rounded':
      return `<rect x="0" y="0" width="512" height="512" rx="80" ry="80" />`
    case 'circle':
      return `<circle cx="256" cy="256" r="256" />`
    case 'squircle':
      return `<rect x="0" y="0" width="512" height="512" rx="128" ry="128" />`
    default:
      return `<rect x="0" y="0" width="512" height="512" rx="80" ry="80" />`
  }
}

function getShapePath(shape: IconShape): string {
  switch (shape) {
    case 'square':
      return 'M0,0 L512,0 L512,512 L0,512 Z'
    case 'rounded':
      return 'M80,0 L432,0 Q512,0 512,80 L512,432 Q512,512 432,512 L80,512 Q0,512 0,432 L0,80 Q0,0 80,0 Z'
    case 'circle':
      return 'M256,0 A256,256 0 0,1 256,512 A256,256 0 0,1 256,0 Z'
    case 'squircle':
      return 'M128,0 L384,0 Q512,0 512,128 L512,384 Q512,512 384,512 L128,512 Q0,512 0,384 L0,128 Q0,0 128,0 Z'
    default:
      return 'M80,0 L432,0 Q512,0 512,80 L512,432 Q512,512 432,512 L80,512 Q0,512 0,432 L0,80 Q0,0 80,0 Z'
  }
}

export function renderIconSVG(config: IconConfig, forExport = false, exportSize = 512, title?: string): string {
  const id = uid()

  const sizeAttrs = forExport
    ? `width="${exportSize}" height="${exportSize}"`
    : `width="100%" height="100%"`

  // Title element (Russian name for accessibility and catalog)
  const titleElement = title ? `<title>${escapeXml(title)}</title>` : ''

  // Background fill: gradient or solid or transparent
  let fillAttr = `fill="${toSixDigitHex(config.backgroundColor)}"`
  let gradientDef = ''

  if (config.backgroundTransparent) {
    fillAttr = `fill="none"`
  } else if (config.gradientEnabled) {
    const gradId = `${id}-grad`
    fillAttr = `fill="url(#${gradId})"`
    const x1 = Math.round(50 - 50 * Math.cos((config.gradientDirection * Math.PI) / 180))
    const y1 = Math.round(50 - 50 * Math.sin((config.gradientDirection * Math.PI) / 180))
    const x2 = Math.round(50 + 50 * Math.cos((config.gradientDirection * Math.PI) / 180))
    const y2 = Math.round(50 + 50 * Math.sin((config.gradientDirection * Math.PI) / 180))
    gradientDef = `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${toSixDigitHex(config.gradientFrom)}" /><stop offset="100%" stop-color="${toSixDigitHex(config.gradientTo)}" /></linearGradient>`
  }

  // Shadow filter
  let filterAttr = ''
  let filterDef = ''
  if (config.shadowEnabled) {
    const filterId = `${id}-shadow`
    filterAttr = `filter="url(#${filterId})"`
    filterDef = `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${config.shadowOffsetX}" dy="${config.shadowOffsetY}" stdDeviation="${config.shadowBlur}" flood-color="${toSixDigitHex(config.shadowColor)}" flood-opacity="0.5" /></filter>`
  }

  // Stroke
  const strokeAttr = config.strokeEnabled
    ? `stroke="${toSixDigitHex(config.strokeColor)}" stroke-width="${config.strokeWidth}"`
    : ''

  // ClipPath for shape
  const clipId = `${id}-clip`
  const clipDef = `<clipPath id="${clipId}">${getShapeClipPath(config.shape, id)}</clipPath>`

  // Text element
  let textElement = ''
  if (config.textEnabled && config.textContent.trim()) {
    textElement = `<text x="256" y="256" text-anchor="middle" dominant-baseline="central" fill="${toSixDigitHex(config.textColor)}" font-size="${config.textFontSize}" font-family="system-ui, -apple-system, sans-serif" font-weight="bold">${escapeXml(config.textContent)}</text>`
  }

  // AI SVG content — replace currentColor with the user's icon color
  // Also strip alpha from 8-digit hex colors (#rrggbbaa → #rrggbb) for SVG compat
  let aiContent = ''
  if (config.useAiImage && config.aiImageContent) {
    // Render AI-generated image as <image> element inside SVG
    const imgDataUrl = config.aiImageContent.startsWith('data:')
      ? config.aiImageContent   // Already a data URL — use as-is
      : `data:image/png;base64,${config.aiImageContent}`  // Raw base64 — add prefix
    // Scale the image to fit within the 60-452 safe zone (392px area)
    aiContent = `<image href="${imgDataUrl}" x="60" y="60" width="392" height="392" preserveAspectRatio="xMidYMid meet" />`
  } else if (config.aiSvgContent.trim()) {
    aiContent = config.aiSvgContent
      .replace(/currentColor/g, toSixDigitHex(config.iconColor || '#ffffff'))
      .replace(/(="#[0-9a-fA-F]{6})([0-9a-fA-F]{2})(")/g, '$1$3')  // Strip 8-digit hex alpha in attribute values
  }

  // When background is transparent and no stroke/shadow, skip the wrapper shape entirely — only render content
  // This produces a clean transparent SVG with no background rect at all
  if (config.backgroundTransparent && !config.strokeEnabled && !config.shadowEnabled) {
    // For AI image mode with transparent bg, still embed image but with no background
    const defs = gradientDef ? `<defs>${gradientDef}</defs>` : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" ${sizeAttrs}>${titleElement}${defs}${textElement}${aiContent}</svg>`
  }

  // Combined defs
  const defs = `<defs>${clipDef}${gradientDef}${filterDef}</defs>`

  // Background shape
  const bgShape = `<path d="${getShapePath(config.shape)}" ${fillAttr} ${strokeAttr} ${filterAttr} />`

  // Content group clipped by shape
  const contentGroup = `<g clip-path="url(#${clipId})">${textElement}${aiContent}</g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" ${sizeAttrs}>${titleElement}${defs}${bgShape}${contentGroup}</svg>`
}

export function renderAiIconSVG(config: IconConfig, forExport = false, exportSize = 512): string {
  return renderIconSVG(config, forExport, exportSize)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

export async function svgToPng(svgString: string, size: number, transparent = true): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const dataUrl = svgToDataUrl(svgString)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      // Clear canvas to transparent (no white fill) when transparent=true
      if (transparent) {
        ctx.clearRect(0, 0, size, size)
      }
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not create blob'))
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('Image load error'))
    img.src = dataUrl
  })
}
