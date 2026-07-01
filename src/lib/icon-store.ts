'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type IconShape = 'square' | 'rounded' | 'circle' | 'squircle'
export type IconStyle = 'minimal' | '3d' | 'flat' | 'gradient'
export type FillMode = 'outlined' | 'filled'
export type GenMode = 'aiImage' | 'aiSvg'
export type DemoMode = 'off' | 'on'

/** Strip alpha from 8-digit hex colors — SVG and <input type="color"> only accept #rrggbb */
function sanitizeConfigColors(cfg: Partial<IconConfig>): Partial<IconConfig> {
  const colorKeys: (keyof IconConfig)[] = [
    'backgroundColor', 'gradientFrom', 'gradientTo',
    'textColor', 'shadowColor', 'strokeColor', 'iconColor',
  ]
  const result = { ...cfg }
  for (const key of colorKeys) {
    const val = result[key]
    if (typeof val === 'string' && /^#[0-9a-fA-F]{8}$/.test(val)) {
      ;(result as Record<string, unknown>)[key] = val.slice(0, 7)
    }
  }
  return result
}

export interface IconConfig {
  shape: IconShape
  backgroundColor: string
  backgroundTransparent: boolean
  gradientEnabled: boolean
  gradientFrom: string
  gradientTo: string
  gradientDirection: number
  textEnabled: boolean
  textContent: string
  textColor: string
  textFontSize: number
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  strokeEnabled: boolean
  strokeColor: string
  strokeWidth: number
  fillMode: FillMode
  iconColor: string
  aiSvgContent: string
  aiImageContent: string  // base64 PNG from AI image generation
  useAiImage: boolean      // if true, render aiImageContent instead of aiSvgContent
  iconNameRu: string       // Russian name for the icon (used as <title> and for catalog)
}

export interface SavedIcon {
  id: string
  name: string
  nameRu: string  // Russian name for catalog
  config: IconConfig
  createdAt: number
}

export interface PackProgress {
  active: boolean
  total: number
  current: number
  theme: string
}

export const defaultIconConfig: IconConfig = {
  shape: 'rounded',
  backgroundColor: '#6366f1',
  backgroundTransparent: false,
  gradientEnabled: false,
  gradientFrom: '#6366f1',
  gradientTo: '#a855f7',
  gradientDirection: 135,
  textEnabled: false,
  textContent: 'A',
  textColor: '#ffffff',
  textFontSize: 200,
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowBlur: 20,
  shadowOffsetX: 0,
  shadowOffsetY: 10,
  strokeEnabled: false,
  strokeColor: '#000000',
  strokeWidth: 4,
  fillMode: 'outlined',
  iconColor: '#ffffff',
  aiSvgContent: '',
  aiImageContent: '',
  useAiImage: false,
  iconNameRu: '',
}

interface IconStore {
  config: IconConfig
  savedIcons: SavedIcon[]
  packProgress: PackProgress
  demoMode: DemoMode

  setConfig: (config: Partial<IconConfig>) => void
  resetConfig: () => void
  saveIcon: (name: string, nameRu?: string) => void
  deleteIcon: (id: string) => void
  clearAllIcons: () => void
  loadIcon: (id: string) => void
  setPackProgress: (progress: Partial<PackProgress>) => void
  resetPackProgress: () => void
  setDemoMode: (mode: DemoMode) => void
}

export const useIconStore = create<IconStore>()(
  persist(
    (set, get) => ({
      config: { ...defaultIconConfig },
      savedIcons: [],
      packProgress: { active: false, total: 0, current: 0, theme: '' },
      demoMode: 'off',

      setConfig: (partial) =>
        set((state) => ({
          config: { ...state.config, ...sanitizeConfigColors(partial) },
        })),

      resetConfig: () => set({ config: { ...defaultIconConfig } }),

      saveIcon: (name: string, nameRu?: string) =>
        set((state) => ({
          savedIcons: [
            {
              id: crypto.randomUUID(),
              name,
              nameRu: nameRu || name,
              config: { ...state.config },
              createdAt: Date.now(),
            },
            ...state.savedIcons,
          ],
        })),

      deleteIcon: (id) =>
        set((state) => ({
          savedIcons: state.savedIcons.filter((icon) => icon.id !== id),
        })),

      clearAllIcons: () => set({ savedIcons: [] }),

      loadIcon: (id) => {
        const icon = get().savedIcons.find((i) => i.id === id)
        if (icon) {
          set({ config: { ...defaultIconConfig, ...sanitizeConfigColors(icon.config) } })
        }
      },

      setPackProgress: (partial) =>
        set((state) => ({
          packProgress: { ...state.packProgress, ...partial },
        })),

      resetPackProgress: () =>
        set({
          packProgress: { active: false, total: 0, current: 0, theme: '' },
        }),

      setDemoMode: (mode) => set({ demoMode: mode }),
    }),
    {
      name: 'icon-generator-storage',
      partialize: (state) => ({
        savedIcons: state.savedIcons,
        config: state.config,
      }),
      // Migrate: strip 8-digit hex colors from saved icons (#rrggbbaa → #rrggbb)
      migrate: (persisted: unknown) => {
        const data = persisted as { savedIcons?: { config: IconConfig }[]; config?: IconConfig } | null
        if (!data) return data
        const colorKeys: (keyof IconConfig)[] = [
          'backgroundColor', 'gradientFrom', 'gradientTo',
          'textColor', 'shadowColor', 'strokeColor', 'iconColor',
        ]
        // Fix saved icons
        if (data.savedIcons) {
          for (const icon of data.savedIcons) {
            if (icon.config) {
              for (const key of colorKeys) {
                const val = icon.config[key]
                if (typeof val === 'string' && /^#[0-9a-fA-F]{8}$/.test(val)) {
                  ;(icon.config as Record<string, unknown>)[key] = val.slice(0, 7)
                }
              }
            }
          }
        }
        // Fix current config
        if (data.config) {
          for (const key of colorKeys) {
            const val = data.config[key]
            if (typeof val === 'string' && /^#[0-9a-fA-F]{8}$/.test(val)) {
              ;(data.config as Record<string, unknown>)[key] = val.slice(0, 7)
            }
          }
        }
        return data
      },
      version: 1,
    }
  )
)
