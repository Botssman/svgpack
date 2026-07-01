'use client'

import React, { useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { useIconStore, defaultIconConfig, IconShape, IconStyle, FillMode, GenMode } from '@/lib/icon-store'
import { renderIconSVG, svgToPng } from '@/lib/ai-svg-renderer'
import { useToast } from '@/hooks/use-toast'
import JSZip from 'jszip'

// ─── Slugify helper ──────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[а-яё]/g, c => ({ 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Inline SVG Icons (replacing lucide-react) ─────────────────────
function IconDownload({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
function IconPencil({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
    </svg>
  )
}
function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  )
}
function IconSparkles({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  )
}
function IconLoader({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
function IconPackage({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" />
    </svg>
  )
}
function IconImage({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}
function IconWand({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h0" /><path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" />
    </svg>
  )
}
function IconCopy({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}
function IconXCircle({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  )
}
function IconSettings({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconChevronDown({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
function IconChevronUp({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

// ─── Hydration-safe client detection ────────────────────────────────
const emptySubscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

// ─── Client-side Pollinations.ai ──────────────────────────────────
function buildPollinationsUrl(prompt: string, style: string, fillMode: string, seed?: number): string {
  const isFilled = fillMode === 'filled'
  const styleDesc = style === '3d' ? '3D isometric' : style === 'flat' ? 'flat design' : style === 'gradient' ? 'gradient' : 'minimalist'
  const fillDesc = isFilled ? 'solid filled' : 'outlined stroke'
  const imagePrompt = `A single professional UI icon of "${prompt}", ${styleDesc}, ${fillDesc} style, centered, clean, transparent background, high quality, no text, no watermark`
  const encoded = encodeURIComponent(imagePrompt)
  const s = seed ?? Math.floor(Math.random() * 999999)
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${s}`
}

async function fetchPollinationsImage(prompt: string, style: string, fillMode: string, signal?: AbortSignal): Promise<string> {
  const url = buildPollinationsUrl(prompt, style, fillMode)
  console.log('[Pollinations] Fetching:', url.substring(0, 120) + '...')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  if (signal) {
    signal.addEventListener('abort', () => { clearTimeout(timeoutId); controller.abort() }, { once: true })
  }

  try {
    const res = await fetch(url, {
      mode: 'cors',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`Pollinations returned ${res.status}`)

    console.log('[Pollinations] Response OK, type:', res.headers.get('content-type'))

    const blob = await res.blob()
    console.log('[Pollinations] Blob:', blob.type, blob.size, 'bytes')

    if (blob.size < 1000) throw new Error('Image too small, possibly an error response')

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('[Pollinations] Data URL created, length:', result.length)
        resolve(result)
      }
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(blob)
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── Color sanitization ───────────────────────────────────────────
function sanitizeHexColor(color: string): string {
  if (!color) return '#000000'
  const trimmed = color.trim()
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) return trimmed.slice(0, 7)
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) return '#' + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3]
  return '#000000'
}

// ─── Icon list parser ─────────────────────────────────────────────
function parseIconList(text: string): { name: string; prompt: string }[] {
  const icons: { name: string; prompt: string }[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  for (const line of lines) {
    let cleaned = line
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/^[-•*]\s*/, '')
      .trim()

    if (!cleaned) continue
    if (/^[IVXLCDM]+\.\s/.test(line) && !line.includes(':')) continue
    if (/^[A-ZА-Я\s]+$/.test(line) && !line.includes(':')) continue

    const matchFull = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*:\s*(.+)$/)
    const matchSimple = cleaned.match(/^(.+?)\s*[:—–-]\s*(.+)$/)

    if (matchFull) {
      const engName = matchFull[1].trim()
      const description = matchFull[3].trim()
      if (engName.length > 40 || engName.split(/\s+/).length > 4) continue
      const name = toKebabCase(engName)
      if (name && description) icons.push({ name, prompt: `${engName} icon: ${description}` })
    } else if (matchSimple) {
      const engName = matchSimple[1].trim()
      const description = matchSimple[2].trim()
      if (engName.length > 40 || engName.split(/\s+/).length > 4) continue
      const name = toKebabCase(engName)
      if (name && description) icons.push({ name, prompt: `${engName} icon: ${description}` })
    }
  }
  return icons
}

function toKebabCase(str: string): string {
  return str.replace(/[^a-zA-Z0-9А-Яа-я\s]/g, '').trim().split(/\s+/).filter(w => w.length > 0).join('-').toLowerCase().slice(0, 50)
}

// ─── Color Input ──────────────────────────────────────────────────
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="block text-xs font-medium text-slate-700 min-w-[70px]">{label}</label>
      <div className="relative flex items-center gap-2 flex-1">
        <input
          type="color"
          value={sanitizeHexColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-slate-200 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-7 text-xs font-mono"
          maxLength={7}
        />
      </div>
    </div>
  )
}

// ─── Native Slider ────────────────────────────────────────────────
function NativeSlider({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 h-1.5 appearance-none bg-slate-200 rounded-full outline-none accent-slate-900 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer"
    />
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-slate-900' : 'bg-slate-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ─── Wrapper Settings ─────────────────────────────────────────────
function WrapperSettings() {
  const { config, setConfig } = useIconStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className="p-4 pb-2 cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2"><IconSettings className="w-4 h-4" /> Настройки обёртки</span>
          {open ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
        </h3>
      </div>
      {open && (
        <div className="p-4 pt-2 space-y-3">
          {/* Shape */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Форма</label>
            <select
              value={config.shape}
              onChange={(e) => setConfig({ shape: e.target.value as IconShape })}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-8"
            >
              <option value="square">Квадрат</option>
              <option value="rounded">Скруглённый</option>
              <option value="circle">Круг</option>
              <option value="squircle">Скверкл</option>
            </select>
          </div>

          {/* Background */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Фон</label>
              <ToggleSwitch checked={config.backgroundTransparent} onChange={(v) => setConfig({ backgroundTransparent: v })} />
            </div>
            {!config.backgroundTransparent && (
              <ColorInput label="Цвет" value={config.backgroundColor} onChange={(v) => setConfig({ backgroundColor: v })} />
            )}
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Текст</label>
              <ToggleSwitch checked={config.textEnabled} onChange={(v) => setConfig({ textEnabled: v })} />
            </div>
            {config.textEnabled && (
              <div className="space-y-2 pl-1">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Текст</label>
                  <input
                    type="text"
                    value={config.textContent}
                    onChange={(e) => setConfig({ textContent: e.target.value })}
                    className="w-full px-3 py-1 rounded-md border border-slate-200 text-sm h-7 text-xs"
                    maxLength={10}
                  />
                </div>
                <ColorInput label="Цвет" value={config.textColor} onChange={(v) => setConfig({ textColor: v })} />
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Размер</label>
                  <NativeSlider value={config.textFontSize} onChange={(v) => setConfig({ textFontSize: v })} min={50} max={400} step={10} />
                  <span className="text-xs text-slate-500 w-8 text-right">{config.textFontSize}</span>
                </div>
              </div>
            )}
          </div>

          {/* Icon color */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Цвет иконки</label>
            <ColorInput label="Цвет" value={config.iconColor} onChange={(v) => setConfig({ iconColor: v })} />
          </div>

          {/* Gradient */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Градиент</label>
              <ToggleSwitch checked={config.gradientEnabled} onChange={(v) => setConfig({ gradientEnabled: v })} />
            </div>
            {config.gradientEnabled && (
              <div className="space-y-2 pl-1">
                <ColorInput label="От" value={config.gradientFrom} onChange={(v) => setConfig({ gradientFrom: v })} />
                <ColorInput label="До" value={config.gradientTo} onChange={(v) => setConfig({ gradientTo: v })} />
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Угол</label>
                  <NativeSlider value={config.gradientDirection} onChange={(v) => setConfig({ gradientDirection: v })} min={0} max={360} step={1} />
                  <span className="text-xs text-slate-500 w-8 text-right">{config.gradientDirection}°</span>
                </div>
              </div>
            )}
          </div>

          {/* Shadow */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Тень</label>
              <ToggleSwitch checked={config.shadowEnabled} onChange={(v) => setConfig({ shadowEnabled: v })} />
            </div>
            {config.shadowEnabled && (
              <div className="space-y-2 pl-1">
                <ColorInput label="Цвет" value={config.shadowColor} onChange={(v) => setConfig({ shadowColor: v })} />
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Размытие</label>
                  <NativeSlider value={config.shadowBlur} onChange={(v) => setConfig({ shadowBlur: v })} min={0} max={60} step={1} />
                  <span className="text-xs text-slate-500 w-8 text-right">{config.shadowBlur}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Смещение Y</label>
                  <NativeSlider value={config.shadowOffsetY} onChange={(v) => setConfig({ shadowOffsetY: v })} min={-30} max={30} step={1} />
                  <span className="text-xs text-slate-500 w-8 text-right">{config.shadowOffsetY}</span>
                </div>
              </div>
            )}
          </div>

          {/* Stroke */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Обводка</label>
              <ToggleSwitch checked={config.strokeEnabled} onChange={(v) => setConfig({ strokeEnabled: v })} />
            </div>
            {config.strokeEnabled && (
              <div className="space-y-2 pl-1">
                <ColorInput label="Цвет" value={config.strokeColor} onChange={(v) => setConfig({ strokeColor: v })} />
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Толщина</label>
                  <NativeSlider value={config.strokeWidth} onChange={(v) => setConfig({ strokeWidth: v })} min={1} max={20} step={1} />
                  <span className="text-xs text-slate-500 w-8 text-right">{config.strokeWidth}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Prompt Section ────────────────────────────────────────────
function AIPromptSection() {
  const { config, setConfig, saveIcon } = useIconStore()
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<IconStyle>('minimal')
  const [fillMode, setFillMode] = useState<FillMode>('outlined')
  const [genMode, setGenMode] = useState<GenMode>('aiImage')
  const [loading, setLoading] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchCurrent, setBatchCurrent] = useState(0)
  const [batchLog, setBatchLog] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const handleStop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
  }, [])

  const handleGenerateSingle = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: 'Введите описание иконки', variant: 'destructive' })
      return
    }
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    console.log('[Generate] Starting AI image generation for:', prompt.trim())
    try {
      const dataUrl = await fetchPollinationsImage(prompt.trim(), style, fillMode, ac.signal)
      console.log('[Generate] Got data URL, length:', dataUrl.length)
      setConfig({ aiImageContent: dataUrl, useAiImage: true, aiSvgContent: '' })
      toast({ title: 'Иконка сгенерирована!' })
    } catch (err) {
      console.error('[Generate] Error:', err)
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast({ title: 'Генерация остановлена' })
      } else {
        const msg = err instanceof Error ? err.message : 'Ошибка генерации'
        toast({ title: msg, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [prompt, style, fillMode, genMode, setConfig, toast])

  const handleGenerateBatch = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: 'Введите описание иконок', variant: 'destructive' })
      return
    }
    const ac = new AbortController()
    abortRef.current = ac
    setBatchMode(true)
    setBatchCurrent(0)
    setBatchTotal(0)
    setBatchLog([])

    const delay = (ms: number) => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms)
      ac.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    })

    try {
      setBatchLog((prev) => [...prev, 'Парсинг списка иконок...'])
      const icons = parseIconList(prompt.trim())
      if (icons.length === 0) {
        toast({ title: 'Не удалось найти иконки в тексте', variant: 'destructive' })
        setBatchMode(false)
        return
      }
      setBatchTotal(icons.length)
      setBatchLog((prev) => [...prev, `Найдено ${icons.length} иконок, начинаю генерацию...`])

      let successCount = 0
      let consecutiveErrors = 0

      for (let i = 0; i < icons.length; i++) {
        if (ac.signal.aborted) break
        setBatchCurrent(i + 1)
        setBatchLog((prev) => [...prev, `[${i + 1}/${icons.length}] ${icons[i].name}...`])
        if (i > 0) await delay(3000 + Math.random() * 3000)
        if (ac.signal.aborted) break

        let iconGenerated = false
        const maxRetries = 3
        for (let retry = 0; retry < maxRetries && !iconGenerated; retry++) {
          if (ac.signal.aborted) break
          try {
            setBatchLog((prev) => [...prev, `  ... ${icons[i].name} - генерация...`])
            const dataUrl = await fetchPollinationsImage(icons[i].prompt, style, fillMode, ac.signal)
            setConfig({ aiImageContent: dataUrl, useAiImage: true, aiSvgContent: '' })
            useIconStore.getState().saveIcon(icons[i].name, icons[i].nameRu || icons[i].name)
            successCount++
            consecutiveErrors = 0
            iconGenerated = true
            setBatchLog((prev) => [...prev, `  + ${icons[i].name}`])
          } catch (err) {
            if (ac.signal.aborted) break
            consecutiveErrors++
            if (retry < maxRetries - 1) {
              const waitMs = (retry + 1) * 5000
              setBatchLog((prev) => [...prev, `  ... ${icons[i].name} - сбой, повтор через ${waitMs / 1000}с...`])
              await delay(waitMs)
            } else {
              setBatchLog((prev) => [...prev, `  x ${icons[i].name} - сбой после ${maxRetries} попыток`])
            }
          }
          if (consecutiveErrors >= 3 && !ac.signal.aborted) {
            setBatchLog((prev) => [...prev, '  || Пауза 20с (слишком много ошибок)...'])
            await delay(20000)
            consecutiveErrors = 0
          }
        }
      }

      if (ac.signal.aborted) {
        setBatchLog((prev) => [...prev, `Остановлено. ${successCount}/${icons.length} иконок сохранено.`])
        toast({ title: `Остановлено: ${successCount}/${icons.length} иконок` })
      } else {
        setBatchLog((prev) => [...prev, `Готово! ${successCount}/${icons.length} иконок сохранено в галерею`])
        toast({ title: `${successCount}/${icons.length} иконок сгенерировано!` })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setBatchLog((prev) => [...prev, 'Генерация остановлена.'])
        toast({ title: 'Генерация остановлена' })
      } else {
        toast({ title: 'Ошибка пакетной генерации', variant: 'destructive' })
      }
    } finally {
      setBatchMode(false)
      abortRef.current = null
    }
  }, [prompt, style, fillMode, genMode, setConfig, saveIcon, toast])

  // Pack generation
  const handleGeneratePack = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: 'Введите тему пакета', variant: 'destructive' })
      return
    }
    const ac = new AbortController()
    abortRef.current = ac
    setBatchMode(true)
    setBatchCurrent(0)
    setBatchTotal(0)
    setBatchLog([])

    try {
      setBatchLog((prev) => [...prev, 'Загрузка списка иконок...'])
      const packRes = await fetch('/api/admin/generate-pack-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: prompt.trim() }),
        signal: ac.signal,
      })
      if (!packRes.ok) throw new Error('Не удалось получить список иконок')
      const packData = await packRes.json()
      const icons = packData.icons || packData
      if (!Array.isArray(icons) || icons.length === 0) throw new Error('Пустой список иконок')

      setBatchTotal(icons.length)
      setBatchLog((prev) => [...prev, `Найдено ${icons.length} иконок, начинаю генерацию...`])

      let successCount = 0
      for (let i = 0; i < icons.length; i++) {
        if (ac.signal.aborted) break
        setBatchCurrent(i + 1)
        setBatchLog((prev) => [...prev, `[${i + 1}/${icons.length}] ${icons[i].name || icons[i]}...`])
        if (i > 0) await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000))
        if (ac.signal.aborted) break
        try {
          const iconPrompt = typeof icons[i] === 'string' ? icons[i] : icons[i].prompt || icons[i].name
          const dataUrl = await fetchPollinationsImage(iconPrompt, style, fillMode, ac.signal)
          setConfig({ aiImageContent: dataUrl, useAiImage: true, aiSvgContent: '' })
          const name = typeof icons[i] === 'string' ? icons[i] : icons[i].name || `icon-${i + 1}`
          useIconStore.getState().saveIcon(name, name)
          successCount++
          setBatchLog((prev) => [...prev, `  + ${name}`])
        } catch (err) {
          if (ac.signal.aborted) break
          setBatchLog((prev) => [...prev, `  x ${typeof icons[i] === 'string' ? icons[i] : icons[i].name} - ошибка`])
        }
      }
      if (ac.signal.aborted) {
        toast({ title: `Остановлено: ${successCount}/${icons.length}` })
      } else {
        setBatchLog((prev) => [...prev, `Готово! ${successCount}/${icons.length} иконок`])
        toast({ title: `${successCount}/${icons.length} иконок сгенерировано!` })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast({ title: 'Генерация остановлена' })
      } else {
        const msg = err instanceof Error ? err.message : 'Ошибка генерации пакета'
        toast({ title: msg, variant: 'destructive' })
      }
    } finally {
      setBatchMode(false)
      abortRef.current = null
    }
  }, [prompt, style, fillMode, genMode, setConfig, saveIcon, toast])

  const isGenerating = loading || batchMode

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 pb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <IconSparkles className="w-4 h-4" />
          AI Генератор Иконок
        </h3>
      </div>
      <div className="p-4 pt-0 space-y-3">
        {/* Generation mode selector */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">Режим генерации</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs flex items-center justify-center transition-colors ${
                genMode === 'aiImage'
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setGenMode('aiImage')}
              disabled={isGenerating}
            >
              <IconImage className="w-3.5 h-3.5 mr-1.5" />
              AI Изображение
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs flex items-center justify-center transition-colors ${
                genMode === 'aiSvg'
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setGenMode('aiSvg')}
              disabled={isGenerating}
            >
              <IconWand className="w-3.5 h-3.5 mr-1.5" />
              AI SVG
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {genMode === 'aiImage'
              ? 'Генерация через Pollinations.ai — бесплатная, реальная картинка'
              : 'Генерация SVG-кода через LLM (недоступно)'}
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={"Опишите иконку (лучше по-английски):\n\ncat\nhome button\nplay icon\nsettings gear"}
          className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm min-h-[120px] resize-y"
          maxLength={30000}
        />

        {/* Icon name (Russian) — used as <title> in SVG and for catalog */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500">Название иконки (по-русски)</label>
          <input
            type="text"
            value={config.iconNameRu}
            onChange={(e) => setConfig({ iconNameRu: e.target.value })}
            placeholder="Например: Кот, Дом, Настройки"
            className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-8 text-xs"
            maxLength={50}
          />
        </div>

        {/* Style selector */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">Стиль</label>
          <div className="grid grid-cols-2 gap-2">
            {(['minimal', '3d', 'flat', 'gradient'] as IconStyle[]).map((s) => (
              <button
                key={s}
                className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs transition-colors ${
                  style === s
                    ? 'bg-slate-900 text-white hover:bg-slate-700'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setStyle(s)}
                disabled={isGenerating}
              >
                {s === 'minimal' && 'Минимал'}
                {s === '3d' && '3D'}
                {s === 'flat' && 'Плоский'}
                {s === 'gradient' && 'Градиент'}
              </button>
            ))}
          </div>
        </div>

        {/* Fill mode selector */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">Тип иконки</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs transition-colors ${
                fillMode === 'outlined'
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setFillMode('outlined')}
              disabled={isGenerating}
            >
              Обводка
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs transition-colors ${
                fillMode === 'filled'
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setFillMode('filled')}
              disabled={isGenerating}
            >
              Заливка
            </button>
          </div>
        </div>

        {/* Text on icon toggle */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">Текст на иконке</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs transition-colors ${
                !config.textEnabled
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setConfig({ textEnabled: false })}
              disabled={isGenerating}
            >
              Без текста
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium h-8 text-xs transition-colors ${
                config.textEnabled
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setConfig({ textEnabled: true })}
              disabled={isGenerating}
            >
              С текстом
            </button>
          </div>
          {config.textEnabled && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={config.textContent}
                onChange={(e) => setConfig({ textContent: e.target.value })}
                placeholder="Текст (1-3 символа)"
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-8 text-xs"
                maxLength={10}
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => setConfig({ textColor: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-200 shrink-0"
                />
                <span className="text-xs text-slate-500">Цвет текста</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateSingle}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <><IconLoader className="w-4 h-4 mr-2" />Генерация...</>
            ) : (
              <><IconWand className="w-4 h-4 mr-2" />Одну</>
            )}
          </button>
          <button
            onClick={handleGenerateBatch}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {batchMode ? (
              <><IconLoader className="w-4 h-4 mr-2" />{batchCurrent}/{batchTotal}</>
            ) : (
              <><IconPackage className="w-4 h-4 mr-2" />Список</>
            )}
          </button>
        </div>

        {/* Batch progress */}
        {batchMode && (
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${batchTotal > 0 ? (batchCurrent / batchTotal) * 100 : 0}%` }}
              />
            </div>
            <div className="max-h-[120px] overflow-y-auto">
              <div className="text-xs font-mono text-slate-500">
                {batchLog.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <button
            onClick={handleStop}
            className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 flex items-center justify-center"
          >
            <IconXCircle className="w-4 h-4 mr-2" />Стоп
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Icon Preview ─────────────────────────────────────────────────
function IconPreview() {
  const { config } = useIconStore()
  const [exportSize, setExportSize] = useState(128)
  const [exporting, setExporting] = useState(false)
  const isClient = useIsClient()
  const { toast } = useToast()

  const hasAiImage = isClient && config.useAiImage && config.aiImageContent
  const svgString = (!hasAiImage && isClient) ? renderIconSVG(config) : ''

  const [aiImgUrl, setAiImgUrl] = useState<string | null>(null)
  React.useEffect(() => {
    if (hasAiImage && config.aiImageContent) {
      setAiImgUrl(config.aiImageContent)
    } else {
      setAiImgUrl(null)
    }
  }, [hasAiImage, config.aiImageContent])

  const iconName = config.iconNameRu || 'icon'
  const iconSlug = slugify(iconName) || 'icon'

  const handleExportSVG = useCallback(() => {
    const exportSvg = renderIconSVG(config, true, exportSize, iconName)
    const blob = new Blob([exportSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${iconSlug}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'SVG сохранён!' })
  }, [config, exportSize, iconName, iconSlug, toast])

  const handleExportPNG = useCallback(async () => {
    setExporting(true)
    try {
      const exportSvg = renderIconSVG(config, true, exportSize, iconName)
      const blob = await svgToPng(exportSvg, exportSize, config.backgroundTransparent)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${iconSlug}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'PNG сохранён!' })
    } catch {
      toast({ title: 'Ошибка экспорта PNG', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }, [config, exportSize, iconName, iconSlug, toast])

  const shapeClipPath = config.shape === 'circle'
    ? 'circle(50% at 50% 50%)'
    : config.shape === 'square' ? 'none'
    : config.shape === 'squircle' ? 'inset(0 round 25%)'
    : 'inset(0 round 15.6%)'

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 pb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <IconImage className="w-4 h-4" />
          Предпросмотр
        </h3>
      </div>
      <div className="p-4 pt-0 space-y-4">
        <div className="flex justify-center">
          <div
            className="w-[180px] h-[180px] rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
            style={{
              backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }}
          >
            {hasAiImage && aiImgUrl ? (
              <div className="w-full h-full relative" style={(!config.backgroundTransparent || config.strokeEnabled) ? { clipPath: shapeClipPath } : undefined}>
                {!config.backgroundTransparent && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: config.gradientEnabled ? `linear-gradient(${config.gradientDirection}deg, ${config.gradientFrom}, ${config.gradientTo})`
                        : config.backgroundColor,
                    }}
                  />
                )}
                <img src={aiImgUrl} alt="AI generated icon" className="absolute inset-0 w-full h-full object-contain p-[11%]" />
                {config.strokeEnabled && (
                  <div className="absolute inset-0" style={{ clipPath: shapeClipPath, border: `${config.strokeWidth}px solid ${config.strokeColor}`, boxSizing: 'border-box' }} />
                )}
              </div>
            ) : (
              <div className="w-full h-full" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: svgString }} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">Размер экспорта</label>
          <div className="flex flex-wrap gap-1.5">
            {[16, 32, 64, 128, 256, 512].map((size) => (
              <button
                key={size}
                className={`px-2.5 py-1 rounded-md text-xs h-7 font-medium transition-colors ${
                  exportSize === size
                    ? 'bg-slate-900 text-white hover:bg-slate-700'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setExportSize(size)}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportSVG}
            className="flex-1 px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 h-9 text-xs flex items-center justify-center"
          >
            <IconDownload className="w-3.5 h-3.5 mr-1.5" /> SVG
          </button>
          <button
            onClick={handleExportPNG}
            disabled={exporting}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 h-9 text-xs flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <IconLoader className="w-3.5 h-3.5 mr-1.5" /> : <IconDownload className="w-3.5 h-3.5 mr-1.5" />}
            PNG
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Icon Pack Section ────────────────────────────────────────────
function IconPackSection() {
  const { savedIcons } = useIconStore()
  const [packTheme, setPackTheme] = useState('')
  const [iconCount, setIconCount] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, log: '' })
  const abortRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const handleStop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
  }, [])

  const handleGeneratePack = useCallback(async () => {
    if (!packTheme.trim()) {
      toast({ title: 'Введите тему пакета', variant: 'destructive' })
      return
    }
    const ac = new AbortController()
    abortRef.current = ac
    setGenerating(true)
    setProgress({ current: 0, total: 0, log: 'Загрузка списка иконок...' })

    try {
      // Get icon list from AI
      const packRes = await fetch('/api/admin/generate-pack-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: packTheme.trim(), count: iconCount }),
        signal: ac.signal,
      })
      if (!packRes.ok) throw new Error('Не удалось получить список иконок')
      const packData = await packRes.json()
      const icons = packData.icons || packData
      if (!Array.isArray(icons) || icons.length === 0) throw new Error('Пустой список иконок')

      setProgress({ current: 0, total: icons.length, log: `Найдено ${icons.length} иконок, начинаю генерацию...` })

      let successCount = 0
      const delay = (ms: number) => new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms)
        ac.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
      })

      for (let i = 0; i < icons.length; i++) {
        if (ac.signal.aborted) break
        setProgress(p => ({ ...p, current: i + 1, log: `[${i + 1}/${icons.length}] ${icons[i]?.name || icons[i]}...` }))
        if (i > 0) await delay(3000 + Math.random() * 3000)
        if (ac.signal.aborted) break

        try {
          const iconPrompt = typeof icons[i] === 'string' ? icons[i] : icons[i].prompt || icons[i].name
          const iconStyle = 'minimal'
          const fillMode = 'outlined'
          const dataUrl = await fetchPollinationsImage(iconPrompt, iconStyle, fillMode, ac.signal)
          const name = typeof icons[i] === 'string' ? icons[i] : icons[i].name || `icon-${i + 1}`
          const nameRu = typeof icons[i] === 'string' ? icons[i] : icons[i].nameRu || icons[i].name || `icon-${i + 1}`
          useIconStore.getState().setConfig({ aiImageContent: dataUrl, useAiImage: true, aiSvgContent: '', backgroundTransparent: true })
          useIconStore.getState().saveIcon(slugify(name), nameRu)
          successCount++
        } catch (err) {
          if (ac.signal.aborted) break
          setProgress(p => ({ ...p, log: `[${i + 1}/${icons.length}] ошибка, пропускаю...` }))
        }
      }

      if (ac.signal.aborted) {
        toast({ title: `Остановлено: ${successCount}/${icons.length}` })
      } else {
        setProgress(p => ({ ...p, log: `Готово! ${successCount}/${icons.length} иконок` }))
        toast({ title: `${successCount}/${icons.length} иконок сгенерировано!` })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast({ title: 'Генерация остановлена' })
      } else {
        const msg = err instanceof Error ? err.message : 'Ошибка генерации пакета'
        toast({ title: msg, variant: 'destructive' })
      }
    } finally {
      setGenerating(false)
      abortRef.current = null
    }
  }, [packTheme, iconCount, toast])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
        <IconPackage className="w-4 h-4" />
        Пак иконок
      </h3>
      <div className="space-y-3">
        <input
          type="text"
          value={packTheme}
          onChange={(e) => setPackTheme(e.target.value)}
          placeholder="Тема пакета (например: weather, social media, food)"
          className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-8 text-xs"
          disabled={generating}
        />
        <div className="flex items-center gap-2">
          <label className="block text-xs font-medium text-slate-500 min-w-[70px]">Кол-во</label>
          <NativeSlider value={iconCount} onChange={setIconCount} min={3} max={30} step={1} />
          <span className="text-xs text-slate-500 w-6 text-right">{iconCount}</span>
        </div>

        {generating ? (
          <div className="space-y-2">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 font-mono">{progress.log}</p>
            <button
              onClick={handleStop}
              className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 flex items-center justify-center"
            >
              <IconXCircle className="w-3.5 h-3.5 mr-1.5" />Стоп
            </button>
          </div>
        ) : (
          <button
            onClick={handleGeneratePack}
            className="w-full px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 h-8 text-xs flex items-center justify-center"
          >
            <IconSparkles className="w-3.5 h-3.5 mr-1.5" />
            Сгенерировать пак ({iconCount} иконок)
          </button>
        )}

        {savedIcons.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            В галерее: {savedIcons.length} иконок — используйте «Скачать пак» выше
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Icon Gallery ─────────────────────────────────────────────────
function IconGallery() {
  const { savedIcons, saveIcon, deleteIcon, clearAllIcons, loadIcon } = useIconStore()
  const [saveName, setSaveName] = useState('')
  const [saveNameRu, setSaveNameRu] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [packs, setPacks] = useState<{ id: string; nameRu: string; nameEn: string; slug: string }[]>([])
  const [selectedPackId, setSelectedPackId] = useState('')
  const [showUploadFor, setShowUploadFor] = useState<string | null>(null)
  const [exportingPack, setExportingPack] = useState(false)
  const isClient = useIsClient()
  const { toast } = useToast()

  // Fetch packs for upload dropdown
  React.useEffect(() => {
    fetch('/api/admin/packs?limit=100')
      .then(r => r.json())
      .then(data => setPacks(data.packs || []))
      .catch(() => {})
  }, [])

  const handleSave = useCallback(() => {
    if (!saveName.trim()) { toast({ title: 'Введите имя', variant: 'destructive' }); return }
    saveIcon(saveName.trim(), saveNameRu.trim() || undefined)
    setSaveName('')
    setSaveNameRu('')
    toast({ title: 'Иконка сохранена!' })
  }, [saveName, saveNameRu, saveIcon, toast])

  const handleEdit = useCallback((id: string) => {
    loadIcon(id)
    toast({ title: 'Конфигурация загружена' })
  }, [loadIcon, toast])

  const handleDelete = useCallback((id: string) => {
    deleteIcon(id)
    toast({ title: 'Иконка удалена' })
  }, [deleteIcon, toast])

  const handleClearAll = useCallback(() => {
    clearAllIcons()
    setShowClearConfirm(false)
    toast({ title: 'Галерея очищена' })
  }, [clearAllIcons, toast])

  const handleUploadToCatalog = useCallback(async (icon: typeof savedIcons[0]) => {
    if (!selectedPackId) {
      toast({ title: 'Выберите пак для загрузки', variant: 'destructive' })
      return
    }
    setUploadingId(icon.id)
    try {
      const iconSlug = slugify(icon.nameRu || icon.name) || slugify(icon.name) || 'icon'
      const nameRu = icon.nameRu || icon.name
      const nameEn = icon.name
      // Render SVG for export (512px, with Russian title)
      const svgContent = renderIconSVG(icon.config, true, 512, nameRu)
      // For catalog, we need clean inner SVG without wrapper — extract inner content
      // But upload API accepts full SVG, so send it as-is with viewBox 0 0 512 512
      const res = await fetch('/api/admin/icons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: selectedPackId,
          slug: iconSlug,
          nameRu,
          nameEn,
          keywords: iconSlug.replace(/-/g, ' '),
          svg: svgContent,
          viewBox: '0 0 512 512',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      toast({ title: `Иконка «${nameRu}» добавлена в каталог!` })
      setShowUploadFor(null)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Ошибка загрузки', variant: 'destructive' })
    } finally {
      setUploadingId(null)
    }
  }, [selectedPackId, toast])

  const handleGalleryExportSVG = useCallback((icon: typeof savedIcons[0]) => {
    const titleName = icon.nameRu || icon.name
    const iconSlug = slugify(titleName) || slugify(icon.name) || 'icon'
    const exportSvg = renderIconSVG(icon.config, true, 512, titleName)
    const blob = new Blob([exportSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${iconSlug}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportPackZip = useCallback(async () => {
    if (savedIcons.length === 0) {
      toast({ title: 'Нет иконок для экспорта', variant: 'destructive' })
      return
    }
    setExportingPack(true)
    try {
      const zip = new JSZip()
      const svgFolder = zip.folder('svg')
      const pngFolder = zip.folder('png')

      for (const icon of savedIcons) {
        const titleName = icon.nameRu || icon.name
        const iconSlug = slugify(titleName) || slugify(icon.name) || 'icon'
        const exportSvg = renderIconSVG(icon.config, true, 512, titleName)

        // Add SVG file
        svgFolder?.file(`${iconSlug}.svg`, exportSvg)

        // Generate PNG from SVG (transparent if config says so)
        try {
          const pngBlob = await svgToPng(exportSvg, 512, icon.config.backgroundTransparent)
          pngFolder?.file(`${iconSlug}.png`, pngBlob)
        } catch {
          // Skip PNG if conversion fails for this icon
          console.warn(`Failed to generate PNG for ${iconSlug}`)
        }
      }

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const packName = slugify(savedIcons[0]?.nameRu || savedIcons[0]?.name || 'icon-pack') || 'icon-pack'
      a.download = `${packName}-pack.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: `Пак из ${savedIcons.length} иконок скачан!` })
    } catch (err) {
      console.error('Pack export error:', err)
      toast({ title: 'Ошибка экспорта пака', variant: 'destructive' })
    } finally {
      setExportingPack(false)
    }
  }, [savedIcons, toast])

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 pb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <IconCopy className="w-4 h-4" />
          Галерея
        </h3>
      </div>
      <div className="p-4 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Имя (slug, en)"
            className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-8 text-xs"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <input
            type="text"
            value={saveNameRu}
            onChange={(e) => setSaveNameRu(e.target.value)}
            placeholder="Название (русское)"
            className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm h-8 text-xs"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 h-8 text-xs flex items-center justify-center"
        >
          <IconPlus className="w-3.5 h-3.5 mr-1" />Сохранить в галерею
        </button>

        {/* Export pack as ZIP */}
        {savedIcons.length > 0 && (
          <button
            onClick={handleExportPackZip}
            disabled={exportingPack}
            className="w-full px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 h-8 text-xs flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingPack ? (
              <><IconLoader className="w-3.5 h-3.5 mr-1.5" />Упаковка...</>
            ) : (
              <><IconPackage className="w-3.5 h-3.5 mr-1.5" />Скачать пак ({savedIcons.length} SVG + PNG)</>
            )}
          </button>
        )}

        {/* Pack selector for uploading to catalog */}
        {savedIcons.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-500">Загрузить в пак (каталог)</label>
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white h-8 text-xs"
            >
              <option value="">Выберите пак...</option>
              {packs.map((p) => (
                <option key={p.id} value={p.id}>{p.nameRu || p.nameEn || p.slug}</option>
              ))}
            </select>
          </div>
        )}

        {savedIcons.length > 0 && !showClearConfirm && (
          <div className="flex justify-end">
            <button
              className="h-7 text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors flex items-center"
              onClick={() => setShowClearConfirm(true)}
            >
              <IconXCircle className="w-3.5 h-3.5 mr-1" />Очистить всё
            </button>
          </div>
        )}

        {showClearConfirm && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-rose-50 border border-rose-200">
            <span className="text-xs text-rose-600 font-medium">Удалить все {savedIcons.length} иконок?</span>
            <div className="flex gap-1.5 shrink-0">
              <button
                className="px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 h-7"
                onClick={handleClearAll}
              >
                Да
              </button>
              <button
                className="px-3 py-1 rounded-md border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 h-7"
                onClick={() => setShowClearConfirm(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {savedIcons.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Нет сохранённых иконок</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {savedIcons.map((icon) => {
                const iconHasAiImage = isClient && icon.config.useAiImage && icon.config.aiImageContent
                return (
                  <div key={icon.id} className="group relative rounded-lg border border-slate-200 bg-slate-50/50 p-2 hover:bg-slate-50 transition-colors">
                    {iconHasAiImage ? (
                      <div className="w-full aspect-square flex items-center justify-center overflow-hidden">
                        <img src={icon.config.aiImageContent} alt={icon.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: isClient ? renderIconSVG(icon.config) : '' }} />
                    )}
                    <p className="text-xs text-center text-slate-500 mt-1 truncate">{icon.nameRu || icon.name}</p>
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="h-5 w-5 p-0 flex items-center justify-center rounded hover:bg-green-100 text-green-700 transition-colors"
                        onClick={() => handleUploadToCatalog(icon)}
                        disabled={uploadingId === icon.id}
                        title="В каталог"
                      >
                        <IconPackage className="w-3 h-3" />
                      </button>
                      <button
                        className="h-5 w-5 p-0 flex items-center justify-center rounded hover:bg-slate-200 transition-colors"
                        onClick={() => handleEdit(icon.id)}
                        title="Загрузить конфиг"
                      >
                        <IconPencil className="w-3 h-3" />
                      </button>
                      <button
                        className="h-5 w-5 p-0 flex items-center justify-center rounded hover:bg-slate-200 transition-colors"
                        onClick={() => handleGalleryExportSVG(icon)}
                        title="Скачать SVG"
                      >
                        <IconDownload className="w-3 h-3" />
                      </button>
                      <button
                        className="h-5 w-5 p-0 flex items-center justify-center rounded hover:bg-rose-100 text-rose-600 transition-colors"
                        onClick={() => handleDelete(icon.id)}
                        title="Удалить"
                      >
                        <IconTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export function IconGenerator() {
  const { config, resetConfig } = useIconStore()
  const isClient = useIsClient()
  const iconName = config.iconNameRu || ''
  const svgCode = isClient ? renderIconSVG(config, true, 512, iconName || undefined) : ''

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <IconWand className="w-5 h-5 text-slate-900" />
          AI Генератор Иконок
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Генерация иконок через Pollinations.ai — бесплатно, без API ключа
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-4">
          <AIPromptSection />
          <WrapperSettings />
          <div className="flex gap-2">
            <button
              onClick={resetConfig}
              className="flex-1 px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 h-9 text-xs"
            >
              Сбросить настройки
            </button>
          </div>
          <IconPackSection />
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IconPreview />
            <IconGallery />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">SVG Код</h3>
                <button
                  className="h-7 text-xs text-slate-700 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors flex items-center"
                  onClick={() => navigator.clipboard.writeText(renderIconSVG(config, true, 512, iconName || undefined))}
                >
                  <IconCopy className="w-3 h-3 mr-1" />Копировать
                </button>
              </div>
            </div>
            <div className="p-4 pt-0">
              <pre className="text-xs font-mono bg-slate-50 rounded-md p-3 overflow-auto max-h-[200px] whitespace-pre-wrap break-all">{svgCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
