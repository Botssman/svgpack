'use client'
import { useMemo } from 'react'
import { CustomConfig, DEFAULT_CONFIG, renderSvg } from '@/lib/svg'

type Props = {
  innerSvg: string
  viewBox?: string
  cfg?: Partial<CustomConfig>
  size?: number
  className?: string
  /** If true, the icon will fill its parent container (100% width/height) instead of using a fixed pixel size */
  fill?: boolean
}

/** Renders an icon as an <img> with data URI to hide SVG source from DOM. */
export function IconView({ innerSvg, viewBox = '0 0 24 24', cfg, size, className, fill }: Props) {
  const finalCfg: CustomConfig = { ...DEFAULT_CONFIG, ...cfg }
  // When fill=true, we still need a viewBox size for renderSvg but CSS will override the visual size
  finalCfg.size = size || 24

  const dataUri = useMemo(() => {
    const svg = renderSvg(innerSvg, viewBox, finalCfg, /* omitWidthHeight */ fill)
    // Encode as base64 data URI — prevents casual SVG source extraction from DOM
    const base64 = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, 'utf-8').toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }, [innerSvg, viewBox, JSON.stringify(cfg), size, fill])

  if (fill) {
    // Fill mode: icon stretches to 100% of parent container
    return (
      <img
        src={dataUri}
        alt=""
        role="presentation"
        className={className}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        draggable={false}
      />
    )
  }

  // Fixed-size mode (backward compatible)
  return (
    <img
      src={dataUri}
      alt=""
      role="presentation"
      className={className}
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        maxWidth: size ? `${size}px` : undefined,
        maxHeight: size ? `${size}px` : undefined,
        objectFit: 'contain',
      }}
      draggable={false}
    />
  )
}
