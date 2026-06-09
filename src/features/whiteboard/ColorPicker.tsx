export const PRESET_COLORS = [
  { id: 'black', hex: '#111111' },
  { id: 'red', hex: '#dc2626' },
  { id: 'blue', hex: '#2563eb' },
  { id: 'yellow', hex: '#f59e0b' },
  { id: 'green', hex: '#16a34a' },
  { id: 'orange', hex: '#ea580c' },
  { id: 'pink', hex: '#db2777' },
] as const

export function ColorPickerPopover({
  color,
  onChange,
  visible,
  onClose,
}: {
  color: string
  onChange: (hex: string) => void
  visible: boolean
  onClose: () => void
}) {
  if (!visible) return null

  return (
    <div className="wb-color-popover" role="dialog" aria-label="Pick a colour">
      <div className="wb-color-grid">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`wb-color-swatch${color === preset.hex ? ' active' : ''}`}
            style={{ backgroundColor: preset.hex }}
            onClick={() => {
              onChange(preset.hex)
              onClose()
            }}
            title={preset.id}
            aria-label={preset.id}
          />
        ))}
      </div>
    </div>
  )
}
