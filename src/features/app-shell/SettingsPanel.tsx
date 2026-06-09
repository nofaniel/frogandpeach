import { useTheme } from '../../theme/ThemeProvider'

export type Density = 'comfortable' | 'compact' | 'spacious'

export const DENSITY_KEY = 'fp-density'
export const USER_THEME_KEY = 'fp-user-theme'

const densityOptions: Array<{ value: Density; label: string }> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
  { value: 'spacious', label: 'Spacious' },
]

export function readDensity(): Density {
  try {
    const stored = window.localStorage.getItem(DENSITY_KEY)
    if (stored === 'compact' || stored === 'spacious') return stored
  } catch { /* noop */ }
  return 'comfortable'
}

export function applyDensity(density: Density) {
  document.documentElement.setAttribute('data-density', density)
  try { window.localStorage.setItem(DENSITY_KEY, density) } catch { /* noop */ }
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { themes, themeId, setTheme } = useTheme()
  const currentDensity = readDensity()

  function handleThemeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    void setTheme(next)
    try { window.localStorage.setItem(USER_THEME_KEY, next) } catch { /* noop */ }
  }

  function handleDensityChange(density: Density) {
    applyDensity(density)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="panel modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <p className="kicker">Preferences</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </div>

        <label>Theme
          <select value={themeId} onChange={handleThemeChange}>
            {themes.length === 0 && <option value={themeId}>{themeId}</option>}
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
        </label>

        <fieldset className="density-fieldset">
          <legend>Display density</legend>
          <div className="density-options">
            {densityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={currentDensity === opt.value ? 'density-btn active' : 'density-btn'}
                onClick={() => handleDensityChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
