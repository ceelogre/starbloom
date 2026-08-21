import { createContext } from 'react'

export const COLOR_MODE_PREFERENCES = ['light', 'dark', 'system'] as const
export type ColorModePreference = (typeof COLOR_MODE_PREFERENCES)[number]

export type ResolvedColorMode = 'light' | 'dark'

export const DEFAULT_MODE_PREFERENCE: ColorModePreference = 'system'

/* Keep in sync with the bootstrap script in index.html, which reads this key
 * before React mounts to avoid a flash of the wrong mode. */
export const MODE_STORAGE_KEY = 'starbloom.color-mode'

export type ThemeContextValue = {
  modePreference: ColorModePreference
  setModePreference: (preference: ColorModePreference) => void
  resolvedMode: ResolvedColorMode
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function isColorModePreference(value: unknown): value is ColorModePreference {
  return COLOR_MODE_PREFERENCES.includes(value as ColorModePreference)
}
