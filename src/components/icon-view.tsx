'use client'
import { CustomConfig, DEFAULT_CONFIG, renderSvg } from '@/lib/svg'

type Props = {
  innerSvg: string
  viewBox?: string
  cfg?: Partial<CustomConfig>
  size?: number
  className?: string
}

/** Renders an icon (svg body from DB) with given customization, displayed inline. */
export function IconView({ innerSvg, viewBox = '0 0 24 24', cfg, size, className }: Props) {
  const finalCfg: CustomConfig = { ...DEFAULT_CONFIG, ...cfg }
  if (size) finalCfg.size = size
  const svg = renderSvg(innerSvg, viewBox, finalCfg)
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        maxWidth: size ? `${size}px` : undefined,
        maxHeight: size ? `${size}px` : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
