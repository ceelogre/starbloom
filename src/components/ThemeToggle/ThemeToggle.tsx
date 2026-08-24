import { useTheme } from '../../theme/useTheme'
import type { ColorModePreference } from '../../theme/theme-context'
import styles from './ThemeToggle.module.css'

const NEXT_PREFERENCE: Record<ColorModePreference, ColorModePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const LABELS: Record<ColorModePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeToggle() {
  const { modePreference, setModePreference, resolvedMode } = useTheme()
  const next = NEXT_PREFERENCE[modePreference]

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setModePreference(next)}
      aria-label={`Appearance: ${LABELS[modePreference]}. Switch to ${LABELS[next]}.`}
      title={`Appearance: ${LABELS[modePreference]}`}
    >
      <span className={styles.icon} aria-hidden="true">
        {modePreference === 'system' ? (
          <SystemIcon />
        ) : resolvedMode === 'dark' ? (
          <MoonIcon />
        ) : (
          <SunIcon />
        )}
      </span>
    </button>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M18.01 18.01l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M18.01 5.99l1.06-1.06" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 20h8M12 17v3" />
    </svg>
  )
}
