import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  DEFAULT_MODE_PREFERENCE,
  MODE_STORAGE_KEY,
  ThemeContext,
  isColorModePreference,
  type ColorModePreference,
  type ResolvedColorMode,
} from './theme-context'

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)'

function readStoredPreference(): ColorModePreference {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return isColorModePreference(stored) ? stored : DEFAULT_MODE_PREFERENCE
  } catch {
    return DEFAULT_MODE_PREFERENCE
  }
}

function writeStoredPreference(preference: ColorModePreference) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, preference)
  } catch {
    /* Storage can be unavailable (private mode, blocked cookies) — the choice
     * still applies for this session, it just won't be remembered. */
  }
}

function subscribeToSystemMode(onChange: () => void) {
  const query = window.matchMedia(DARK_MODE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSystemMode(): ResolvedColorMode {
  return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light'
}

function getServerSnapshot(): ResolvedColorMode {
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [modePreference, setModePreference] =
    useState<ColorModePreference>(readStoredPreference)

  const systemMode = useSyncExternalStore<ResolvedColorMode>(
    subscribeToSystemMode,
    getSystemMode,
    getServerSnapshot,
  )
  const resolvedMode: ResolvedColorMode =
    modePreference === 'system' ? systemMode : modePreference

  useEffect(() => {
    document.documentElement.dataset.mode = resolvedMode
  }, [resolvedMode])

  useEffect(() => {
    writeStoredPreference(modePreference)
  }, [modePreference])

  /* Match the mobile browser chrome to the page background. Read back from the
   * cascade rather than duplicating hex values already defined in theme.css. */
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      return
    }

    const background = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim()

    if (background) {
      meta.content = background
    }
  }, [resolvedMode])

  const handleSetModePreference = useCallback(
    (next: ColorModePreference) => setModePreference(next),
    [],
  )

  const value = useMemo(
    () => ({
      modePreference,
      setModePreference: handleSetModePreference,
      resolvedMode,
    }),
    [modePreference, handleSetModePreference, resolvedMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
