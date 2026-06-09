import { useEffect, useState } from 'react'
import type { Module } from '../../../shared/api-types'

export function ModulesSection({
  modules,
  onPatchModule,
  onBatchPatchModules,
}: {
  modules: Module[]
  onPatchModule: (module: Module, patch: Partial<Module> & { deleteData?: boolean }) => void
  onBatchPatchModules: (patches: Array<{ id: string; position: number }>) => void
}) {
  const [pendingUninstall, setPendingUninstall] = useState<Module | null>(null)
  const [tideApiKeyDraft, setTideApiKeyDraft] = useState('')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dropOverIndex, setDropOverIndex] = useState<number | null>(null)

  const tidesModule = modules.find((module) => module.id === 'tides')
  const tideSource = String(tidesModule?.options?.source ?? 'model')

  useEffect(() => {
    const key = String(tidesModule?.options?.apiKey ?? '')
    setTideApiKeyDraft(key)
  }, [tidesModule?.options])

  function moveModule(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const reordered = [...modules]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const patches = reordered.map((module, index) => ({ id: module.id, position: (index + 1) * 10 }))
    onBatchPatchModules(patches)
  }

  return (
    <article className="panel span-2">
      {pendingUninstall && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="panel modal-panel">
            <p className="kicker">Module uninstall</p>
            <h2>{pendingUninstall.title}</h2>
            <p>Choose whether to keep this module's data for later reinstall, or delete its stored rows now.</p>
            <div className="button-row">
              <button type="button" className="ghost" onClick={() => { onPatchModule(pendingUninstall, { installed: false, enabled: false }); setPendingUninstall(null) }}>Preserve data</button>
              <button type="button" className="danger" onClick={() => { onPatchModule(pendingUninstall, { installed: false, enabled: false, deleteData: true }); setPendingUninstall(null) }}>Delete data</button>
              <button type="button" className="ghost" onClick={() => setPendingUninstall(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
      <p className="kicker">Modules</p>
      <h2>Built-in registry</h2>
      <div className="module-list">
        {modules.map((module, index) => (
          <div
            key={module.id}
            className={`module-row module-config-row ${module.enabled ? 'enabled' : ''} ${module.installed ? '' : 'uninstalled'} ${draggingIndex === index ? 'dragging' : ''} ${dropOverIndex === index ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropOverIndex(index) }}
            onDragLeave={() => setDropOverIndex(null)}
            onDrop={(e) => { e.preventDefault(); const fromIndex = Number(e.dataTransfer.getData('text/plain')); setDropOverIndex(null); setDraggingIndex(null); moveModule(fromIndex, index) }}
          >
            <div className="module-summary">
              <div className="module-title-row">
                <span
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(index))
                    e.dataTransfer.effectAllowed = 'move'
                    const row = e.currentTarget.closest('.module-config-row') as HTMLElement
                    if (row) e.dataTransfer.setDragImage(row, 0, 0)
                    setDraggingIndex(index)
                  }}
                  onDragEnd={() => { setDraggingIndex(null); setDropOverIndex(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); moveModule(index, index - 1) }
                    if (e.key === 'ArrowDown') { e.preventDefault(); moveModule(index, index + 1) }
                  }}
                  aria-label="Drag to reorder, or use arrow keys"
                  role="button"
                  tabIndex={0}
                >⋮⋮</span>
                <strong>{module.title}</strong>
              </div>
              <span>{module.description}</span>
              <div className="module-meta">
                <small>{module.category}</small>
                <small>{module.installed ? 'Installed' : 'Not installed'}</small>
                <small>{module.enabled ? 'Visible' : 'Hidden'}</small>
                <small>{module.options.navigationBar?.enabled ? 'Nav visible' : 'Nav hidden'}</small>
              </div>
            </div>
            <div className="module-controls">
              <div className="module-actions">
                <button type="button" className="ghost" onClick={() => (module.installed ? setPendingUninstall(module) : onPatchModule(module, { installed: true, enabled: true }))}>{module.installed ? 'Uninstall' : 'Install'}</button>
                {module.installed && <button type="button" className="ghost" onClick={() => onPatchModule(module, { enabled: !module.enabled })}>{module.enabled ? 'Disable' : 'Enable'}</button>}
                {module.installed && (
                  <button type="button" className="ghost" onClick={() => onPatchModule(module, { options: { ...module.options, navigationBar: { enabled: !(module.options.navigationBar?.enabled ?? false), mode: module.options.navigationBar?.mode ?? 'default' } } })}>
                    {module.options.navigationBar?.enabled ? 'Nav off' : 'Nav on'}
                  </button>
                )}
                {module.homeWidget && module.installed && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onPatchModule(module, {
                      options: {
                        ...module.options,
                        homeWidget: {
                          enabled: !(module.options.homeWidget?.enabled ?? module.homeWidget!.defaultEnabled),
                          mode: module.options.homeWidget?.mode && module.homeWidget!.modes.some((mode) => mode.id === module.options.homeWidget?.mode)
                            ? module.options.homeWidget!.mode
                            : module.homeWidget!.defaultMode,
                        },
                      },
                    })}
                  >
                    {(module.options.homeWidget?.enabled ?? module.homeWidget!.defaultEnabled) ? 'Widget off' : 'Widget on'}
                  </button>
                )}
              </div>
              <div className="module-options">
                {module.installed && (
                  <label className="compact-field">
                    Size
                    <select value={module.size} onChange={(event) => onPatchModule(module, { size: event.target.value as Module['size'] })}>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="wide">Wide</option>
                      <option value="full">Full</option>
                    </select>
                  </label>
                )}
                {module.homeWidget && module.installed && (
                  <label className="compact-field">
                    Homepage mode
                    <select
                      value={module.options.homeWidget?.mode && module.homeWidget!.modes.some((mode) => mode.id === module.options.homeWidget?.mode) ? module.options.homeWidget!.mode : module.homeWidget!.defaultMode}
                      onChange={(event) => onPatchModule(module, { options: { ...module.options, homeWidget: { enabled: module.options.homeWidget?.enabled ?? module.homeWidget!.defaultEnabled, mode: event.target.value } } })}
                    >
                      {module.homeWidget!.modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
                    </select>
                    <small>{module.homeWidget!.description}</small>
                  </label>
                )}
                {module.id === 'weather' && module.installed && (
                  <label className="compact-field">
                    Weather icons
                    <select value={module.options.iconStyle === 'icons' ? 'icons' : 'emoji'} onChange={(event) => onPatchModule(module, { options: { ...module.options, iconStyle: event.target.value as Module['options']['iconStyle'] } })}>
                      <option value="emoji">Emoji</option>
                      <option value="icons">Line icons</option>
                    </select>
                  </label>
                )}
                {module.id === 'weather' && module.installed && (
                  <label className="compact-field">
                    5-day forecast
                    <select value={module.options.showExtendedForecast ? 'on' : 'off'} onChange={(event) => onPatchModule(module, { options: { ...module.options, showExtendedForecast: event.target.value === 'on' } })}>
                      <option value="off">Hidden</option>
                      <option value="on">Show below weather</option>
                    </select>
                  </label>
                )}
                {module.id === 'tides' && module.installed && (
                  <>
                    <label className="compact-field">
                      Tide source
                      <select value={String(module.options?.source ?? 'model')} onChange={(event) => onPatchModule(module, { options: { ...module.options, source: event.target.value } })}>
                        <option value="model">Built-in estimate</option>
                        <option value="api">API</option>
                      </select>
                    </label>
                    {tideSource === 'api' && (
                      <>
                        <label className="compact-field api-key-field">
                          API key
                          <input
                            value={tideApiKeyDraft}
                            onChange={(event) => setTideApiKeyDraft(event.target.value)}
                            onBlur={() => onPatchModule(module, { options: { ...module.options, apiKey: tideApiKeyDraft.trim() } })}
                            placeholder="Paste API key"
                          />
                        </label>
                        <a className="plain-row compact-link api-key-link" href="https://tidesatlas.com/api/register" target="_blank" rel="noreferrer">
                          <strong>Get API key</strong>
                          <span>Open TidesAtlas signup page</span>
                        </a>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="compact-field position-field">
                <span className="position-label">Order</span>
                <div className="reorder-bar">
                  <button type="button" className="icon-button" disabled={index === 0} onClick={() => moveModule(index, index - 1)} aria-label="Move up">▲</button>
                  <span className="position-value" aria-label={`Position ${index + 1}`}>{index + 1}</span>
                  <button type="button" className="icon-button" disabled={index === modules.length - 1} onClick={() => moveModule(index, index + 1)} aria-label="Move down">▼</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
