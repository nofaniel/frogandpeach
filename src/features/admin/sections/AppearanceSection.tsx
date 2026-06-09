import type { Appearance } from '../../../shared/api-types'
import { useTheme } from '../../../theme/ThemeProvider'

export function AppearanceSection({ onAppearanceChange }: { onAppearanceChange: (appearance: Appearance) => void }) {
  const { themes, themeId } = useTheme()
  const selectedTheme = themes.find((theme) => theme.id === themeId)
  return (
    <article className="panel">
      <p className="kicker">Appearance</p>
      <h2>Theme</h2>
      <label>Active theme
        <select value={themeId} onChange={(event) => onAppearanceChange({ themeId: event.target.value })}>
          {themes.length === 0 && <option value={themeId}>{themeId}</option>}
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.name}</option>
          ))}
        </select>
      </label>
      {selectedTheme && (
        <p className="small-note">
          {selectedTheme.author !== 'Unknown' ? `By ${selectedTheme.author} · ` : ''}v{selectedTheme.version}
        </p>
      )}
      <p className="small-note">
        Themes control colour, type, density, and layout. Drop a new theme folder into <code>themes/</code> to add your own — see <a href="/docs/theming.md">docs/theming.md</a>.
      </p>
    </article>
  )
}
