'use client'
import { useMemo } from 'react'
import { CustomConfig, DEFAULT_CONFIG, renderSvg } from '@/lib/svg'

type Props = {
  innerSvg: string
  viewBox?: string
  cfg?: Partial<CustomConfig>
  /** Size in rem — e.g. 6 means 6rem */
  size?: number
  className?: string
}

/** Renders an icon as an <img> with data URI to hide SVG source from DOM. */
export function IconView({ innerSvg, viewBox = '0 0 24 24', cfg, size, className }: Props) {
  const finalCfg: CustomConfig = { ...DEFAULT_CONFIG, ...cfg }
  const rem = size || 1.5
  // SVG internal size — use rem*16 as pixel fallback for the SVG viewBox rendering
  finalCfg.size = Math.round(rem * 16)

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
        width: `${rem}rem`,
        height: `${rem}rem`,
        objectFit: 'contain',
      }}
      draggable={false}
    />
  )
}
