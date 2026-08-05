import { COLOR_MODE_PREFERENCES, type ColorModePreference } from '../../theme/theme-context'
import { useTheme } from '../../theme/useTheme'
import styles from './AppearanceToggle.module.css'

const MODE_LABELS: Record<ColorModePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

function ModeIcon({ mode }: { mode: ColorModePreference }) {
  if (mode === 'light') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 2.6v2.2M12 19.2v2.2M4.4 12H2.2M21.8 12h-2.2M6.6 6.6 5 5M19 19l-1.6-1.6M6.6 17.4 5 19M19 5l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (mode === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <rect
        x="3"
        y="5"
        width="18"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M2 20h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function AppearanceToggle() {
  const { modePreference, setModePreference } = useTheme()

  return (
    <div className={styles.group} role="radiogroup" aria-label="Appearance">
      {COLOR_MODE_PREFERENCES.map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={modePreference === mode}
          aria-label={MODE_LABELS[mode]}
          title={MODE_LABELS[mode]}
          className={[styles.option, modePreference === mode ? styles.optionSelected : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setModePreference(mode)}
        >
          <ModeIcon mode={mode} />
        </button>
      ))}
    </div>
  )
}
