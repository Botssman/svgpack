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
  const px = size || 24
  finalCfg.size = px

  const dataUri = useMemo(() => {
    const svg = renderSvg(innerSvg, viewBox, finalCfg)
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
      style={{
        width: `${px}px`,
        height: `${px}px`,
        objectFit: 'contain',
      }}
      draggable={false}
    />
  )
}
