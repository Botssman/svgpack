'use client'
import { useMemo } from 'react'
import { CustomConfig, DEFAULT_CONFIG, renderSvg } from '@/lib/svg'

type Props = {
  innerSvg: string
  viewBox?: string
  cfg?: Partial<CustomConfig>
  size?: number
  className?: string
}

/** Renders an icon as an <img> with data URI to hide SVG source from DOM. */
export function IconView({ innerSvg, viewBox = '0 0 24 24', cfg, size, className }: Props) {
  const finalCfg: CustomConfig = { ...DEFAULT_CONFIG, ...cfg }
  if (size) finalCfg.size = size

  const dataUri = useMemo(() => {
    const svg = renderSvg(innerSvg, viewBox, finalCfg)
    // Encode as base64 data URI — prevents casual SVG source extraction from DOM
    const base64 = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, 'utf-8').toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }, [innerSvg, viewBox, JSON.stringify(cfg), size])

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
