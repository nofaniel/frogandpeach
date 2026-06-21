import type { Dispatch, SetStateAction } from 'react'
import type { HomeData, Module, Session, Settings, Tab } from '../../shared/api-types'
import { ModuleEditControls } from './ModuleEditControls'
import { ListsWidget } from './widgets/ListsWidget'
import { NetworkWidget } from './widgets/NetworkWidget'
import { NotesWidget } from './widgets/NotesWidget'
import { PagesWidget } from './widgets/PagesWidget'
import { TidesWidget } from './widgets/TidesWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import { WhiteboardWidget } from './widgets/WhiteboardWidget'
import { GalleryWidget } from './widgets/GalleryWidget'


export function HomeDashboard({
  home,
  dashboardModules,
  allModules,
  locationConfigured,
  publicSettings,
  error,
  editMode,
  session,
  onSetActiveTab,
  onOpenAdmin,
  onPatchModule,
  onBatchPatchModules,
}: {
  home: HomeData | null
  dashboardModules: Module[]
  allModules: Module[]
  locationConfigured: boolean
  publicSettings: Settings
  error: string
  editMode: boolean
  session: Session | null
  onSetActiveTab: Dispatch<SetStateAction<Tab>>
  onOpenAdmin: () => void
  onPatchModule: (module: Module, patch: Partial<Module> & { deleteData?: boolean }) => void
  onBatchPatchModules: (patches: Array<{ id: string; position: number }>) => void
}) {
  if (!home) {
    return (
      <section className="panel empty-state">
        <p className="kicker">Home</p>
        <h2>Dashboard unavailable</h2>
        <p>{error || 'Something went wrong loading the dashboard.'}</p>
      </section>
    )
  }

  const visibleWidgets = dashboardModules.filter(
    (module) => module.homeWidget && module.options.homeWidget?.enabled !== false,
  )

  const hiddenWidgets = allModules.filter(
    (module) => module.installed && module.enabled && module.homeWidget && module.options.homeWidget?.enabled === false,
  )

  return (
    <section className="dashboard-grid home-dashboard">
      {editMode && (
        <div className="edit-mode-toolbar">
          <span className="edit-mode-label">Home edit mode</span>
          <button type="button" className="ghost" onClick={onOpenAdmin}>Admin settings</button>
        </div>
      )}
      {visibleWidgets.map((module, index) => (
        <div key={module.id} className={editMode ? 'edit-widget-wrapper' : undefined}>
          {renderWidget(module, home, locationConfigured, publicSettings, onSetActiveTab, onOpenAdmin)}
          {editMode && session?.adminUnlocked && (
            <ModuleEditControls
              module={module}
              visibleModules={visibleWidgets}
              visibleIndex={index}
              onPatchModule={onPatchModule}
              onBatchPatchModules={onBatchPatchModules}
            />
          )}
        </div>
      ))}
      {editMode && hiddenWidgets.length > 0 && (
        <div className="hidden-widgets-strip">
          <p className="kicker">Hidden home widgets</p>
          <div className="hidden-widgets-list">
            {hiddenWidgets.map((module) => (
              <button
                key={module.id}
                type="button"
                className="ghost"
                onClick={() => onPatchModule(module, {
                  options: {
                    ...module.options,
                    homeWidget: {
                      enabled: true,
                      mode: module.options.homeWidget?.mode && module.homeWidget!.modes.some((m) => m.id === module.options.homeWidget?.mode)
                        ? module.options.homeWidget!.mode
                        : module.homeWidget!.defaultMode,
                    },
                  },
                })}
              >
                Show {module.homeWidget!.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function renderWidget(
  module: Module,
  home: HomeData,
  locationConfigured: boolean,
  publicSettings: Settings,
  onSetActiveTab: (tab: Tab) => void,
  onOpenAdmin: () => void,
) {
  switch (module.id) {
    case 'weather':
      return <WeatherWidget key={module.id} module={module} home={home} locationConfigured={locationConfigured} publicSettings={publicSettings} onOpenAdmin={onOpenAdmin} />
    case 'tides':
      return <TidesWidget key={module.id} module={module} tides={home.tides} locationConfigured={locationConfigured} onOpenAdmin={onOpenAdmin} />
    case 'lists':
      return <ListsWidget key={module.id} module={module} lists={home.lists} onSetActiveTab={onSetActiveTab} />
    case 'notes':
      return <NotesWidget key={module.id} module={module} notes={home.notes} onSetActiveTab={onSetActiveTab} />
    case 'whiteboard':
      return <WhiteboardWidget key={module.id} module={module} strokes={home.whiteboardStrokes} strokeCount={home.whiteboardStrokeCount} onSetActiveTab={onSetActiveTab} />
    case 'pages':
      return <PagesWidget key={module.id} module={module} pages={home.pages} />
    case 'network':
      return <NetworkWidget key={module.id} module={module} network={home.network} deployment={home.deployment} />
    case 'gallery':
      return <GalleryWidget key={module.id} module={module} images={home.galleryImages} onSetActiveTab={onSetActiveTab} />
    default:
      return null
  }
}
