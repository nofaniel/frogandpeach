import { useState } from 'react'
import { useTheme } from '../../theme/ThemeProvider'

export type Density = 'comfortable' | 'compact' | 'spacious'

export const DENSITY_KEY = 'fp-density'
export const USER_THEME_KEY = 'fp-user-theme'
export const COLOR_MODE_KEY = 'fp-color-mode'

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

export type ColorMode = 'light' | 'dark'

export function readColorMode(): ColorMode {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_KEY)
    if (stored === 'dark') return 'dark'
  } catch { /* noop */ }
  return 'light'
}

export function applyColorMode(mode: ColorMode) {
  if (mode === 'light') {
    document.documentElement.removeAttribute('data-color-mode')
    try { window.localStorage.removeItem(COLOR_MODE_KEY) } catch { /* noop */ }
  } else {
    document.documentElement.setAttribute('data-color-mode', 'dark')
    try { window.localStorage.setItem(COLOR_MODE_KEY, 'dark') } catch { /* noop */ }
  }
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { themes, themeId, setTheme } = useTheme()
  const currentDensity = readDensity()
  const [colorMode, setColorMode] = useState<ColorMode>(readColorMode)

  function handleThemeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    void setTheme(next)
    try { window.localStorage.setItem(USER_THEME_KEY, next) } catch { /* noop */ }
  }

  function handleDensityChange(density: Density) {
    applyDensity(density)
  }

  function handleColorModeChange(mode: ColorMode) {
    setColorMode(mode)
    applyColorMode(mode)
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

        <fieldset className="color-mode-fieldset">
          <legend>Color mode</legend>
          <div className="color-mode-options">
            <button
              type="button"
              className={colorMode === 'light' ? 'color-mode-btn active' : 'color-mode-btn'}
              onClick={() => handleColorModeChange('light')}
            >
              <span aria-hidden="true">☀</span> Light
            </button>
            <button
              type="button"
              className={colorMode === 'dark' ? 'color-mode-btn active' : 'color-mode-btn'}
              onClick={() => handleColorModeChange('dark')}
            >
              <span aria-hidden="true">🌙</span> Dark
            </button>
          </div>
        </fieldset>

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