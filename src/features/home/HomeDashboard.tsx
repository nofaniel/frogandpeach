import type { HomeData, Module, Settings, Tab } from '../../shared/api-types'
import { ListsWidget } from './widgets/ListsWidget'
import { NetworkWidget } from './widgets/NetworkWidget'
import { NotesWidget } from './widgets/NotesWidget'
import { PagesWidget } from './widgets/PagesWidget'
import { TidesWidget } from './widgets/TidesWidget'
import { WeatherWidget } from './widgets/WeatherWidget'

export function HomeDashboard({
  home,
  dashboardModules,
  locationConfigured,
  publicSettings,
  busy,
  error,
  onSetActiveTab,
  onOpenAdmin,
}: {
  home: HomeData | null
  dashboardModules: Module[]
  locationConfigured: boolean
  publicSettings: Settings
  busy: boolean
  error: string
  onSetActiveTab: (tab: Tab) => void
  onOpenAdmin: () => void
}) {
  if (!home) {
    return (
      <section className="panel empty-state">
        <p className="kicker">Home</p>
        <h2>{busy ? 'Loading dashboard...' : 'Dashboard unavailable'}</h2>
        <p>{error || 'Use Refresh to load the dashboard again.'}</p>
      </section>
    )
  }

  return (
    <section className="dashboard-grid home-dashboard">
      {dashboardModules
        .filter((module) => module.homeWidget && module.options.homeWidget?.enabled !== false)
        .map((module) => renderWidget(module, home, locationConfigured, publicSettings, onSetActiveTab, onOpenAdmin))}
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
    case 'pages':
      return <PagesWidget key={module.id} module={module} pages={home.pages} />
    case 'network':
      return <NetworkWidget key={module.id} module={module} network={home.network} deployment={home.deployment} />
    default:
      return null
  }
}
