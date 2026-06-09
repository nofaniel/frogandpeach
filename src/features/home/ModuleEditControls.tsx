import type { Module } from '../../shared/api-types'

export function ModuleEditControls({
  module,
  visibleModules,
  visibleIndex,
  onPatchModule,
  onBatchPatchModules,
}: {
  module: Module
  visibleModules: Module[]
  visibleIndex: number
  onPatchModule: (module: Module, patch: Partial<Module> & { deleteData?: boolean }) => void
  onBatchPatchModules: (patches: Array<{ id: string; position: number }>) => void
}) {
  function moveUp() {
    if (visibleIndex <= 0) return
    const from = visibleIndex
    const to = visibleIndex - 1
    const fromModule = visibleModules[from]
    const toModule = visibleModules[to]
    onBatchPatchModules([
      { id: fromModule.id, position: toModule.position },
      { id: toModule.id, position: fromModule.position },
    ])
  }

  function moveDown() {
    if (visibleIndex >= visibleModules.length - 1) return
    const from = visibleIndex
    const to = visibleIndex + 1
    const fromModule = visibleModules[from]
    const toModule = visibleModules[to]
    onBatchPatchModules([
      { id: fromModule.id, position: toModule.position },
      { id: toModule.id, position: fromModule.position },
    ])
  }

  return (
    <div className="module-edit-controls">
      <div className="edit-reorder">
        <button
          type="button"
          className="icon-button"
          disabled={visibleIndex <= 0}
          onClick={moveUp}
          aria-label="Move module up"
        >▲</button>
        <button
          type="button"
          className="icon-button"
          disabled={visibleIndex >= visibleModules.length - 1}
          onClick={moveDown}
          aria-label="Move module down"
        >▼</button>
      </div>
      <div className="edit-options">
        <label className="compact-field">
          Size
          <select
            value={module.size}
            onChange={(e) => onPatchModule(module, { size: e.target.value as Module['size'] })}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="wide">Wide</option>
            <option value="full">Full</option>
          </select>
        </label>
        {module.homeWidget && (
          <button
            type="button"
            className="ghost"
            onClick={() => onPatchModule(module, {
              options: {
                ...module.options,
                homeWidget: {
                  enabled: !(module.options.homeWidget?.enabled ?? module.homeWidget!.defaultEnabled),
                  mode: module.options.homeWidget?.mode && module.homeWidget!.modes.some((m) => m.id === module.options.homeWidget?.mode)
                    ? module.options.homeWidget!.mode
                    : module.homeWidget!.defaultMode,
                },
              },
            })}
          >
            {(module.options.homeWidget?.enabled ?? module.homeWidget!.defaultEnabled) ? 'Hide from home' : 'Show on home'}
          </button>
        )}
        <button
          type="button"
          className="ghost"
          onClick={() => onPatchModule(module, { enabled: !module.enabled })}
        >
          {module.enabled ? 'Disable module' : 'Enable module'}
        </button>
      </div>
      <div className="edit-display-options">
        {module.id === 'weather' && module.installed && (
          <>
            <label className="compact-field">
              Icons
              <select
                value={module.options.iconStyle === 'icons' ? 'icons' : 'emoji'}
                onChange={(e) => onPatchModule(module, { options: { ...module.options, iconStyle: e.target.value as Module['options']['iconStyle'] } })}
              >
                <option value="emoji">Emoji</option>
                <option value="icons">Line icons</option>
              </select>
            </label>
            <label className="compact-field">
              Forecast
              <select
                value={module.options.showExtendedForecast ? 'on' : 'off'}
                onChange={(e) => onPatchModule(module, { options: { ...module.options, showExtendedForecast: e.target.value === 'on' } })}
              >
                <option value="off">Hidden</option>
                <option value="on">Show</option>
              </select>
            </label>
          </>
        )}
        {module.homeWidget && module.homeWidget.modes.length > 1 && (
          <label className="compact-field">
            Mode
            <select
              value={module.options.homeWidget?.mode && module.homeWidget.modes.some((m) => m.id === module.options.homeWidget?.mode)
                ? module.options.homeWidget!.mode
                : module.homeWidget.defaultMode}
              onChange={(e) => onPatchModule(module, {
                options: {
                  ...module.options,
                  homeWidget: {
                    enabled: module.options.homeWidget?.enabled ?? module.homeWidget!.defaultEnabled,
                    mode: e.target.value,
                  },
                },
              })}
            >
              {module.homeWidget.modes.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}
