import { Monitor, Moon, Sun } from 'lucide-react'
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
          <Monitor strokeWidth={2} />
        ) : resolvedMode === 'dark' ? (
          <Moon strokeWidth={2} />
        ) : (
          <Sun strokeWidth={2} />
        )}
      </span>
    </button>
  )
}
