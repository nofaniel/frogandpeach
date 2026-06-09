export type Tab = 'home' | 'lists' | 'notes' | 'pages' | 'network'

export type Module = {
  id: string
  title: string
  description: string
  category: string
  homeWidget?: {
    label: string
    description: string
    defaultEnabled: boolean
    defaultMode: string
    modes: Array<{
      id: string
      label: string
      description: string
    }>
  }
  installed: boolean
  enabled: boolean
  position: number
  size: 'small' | 'medium' | 'wide' | 'full'
  options: Record<string, unknown> & {
    iconStyle?: 'emoji' | 'icons'
    showExtendedForecast?: boolean
    navigationBar?: {
      enabled: boolean
      mode: string
    }
    homeWidget?: {
      enabled: boolean
      mode: string
    }
  }
}

export type ListType = {
  id: string
  title: string
  description: string
  reset: string
}

export type Note = {
  id: string
  title: string
  body: string
  tags: string
  noteType: string
  pinned: boolean
  createdByName: string | null
  updatedByName: string | null
  updatedAt: string
}

export type ListItem = {
  id: string
  text: string
  done: boolean
  completedAt: string | null
  createdByName: string | null
  updatedByName: string | null
}

export type SharedList = {
  id: string
  name: string
  listType: string
  resetKey: string
  metadata: Record<string, unknown>
  createdByName: string | null
  updatedByName: string | null
  updatedAt: string
  items: ListItem[]
}

export type Page = {
  id: string
  slug: string
  title: string
  body: string
  theme: string
  occasion: string
  emoji: string
  updatedAt: string
}

export type PageLink = {
  id: string
  title: string
  href: string
  description: string
  kind: string
}

export type CacheEntry = {
  key: string
  expiresAt: string
  updatedAt: string
  payloadBytes: number
  expired: boolean
}

export type PageManifestReport = {
  pages: PageLink[]
  warnings: Array<{ path: string; message: string }>
}

export type ActivityEntry = {
  id: string
  actorUserId: string | null
  actorName: string
  action: string
  entityType: string
  entityId: string
  summary: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type Settings = {
  wifiName: string
  wifiPassword: string
  wifiSecurity: string
  routerUrl: string
  adminUrl: string
  wifiUsagePeriod: string
  wifiUsageMonthlyGb: string
  wifiUsageUpdatedAt: string
  wifiDevicesJson: string
  binDay: string
  flatNotes: string
  locationName: string
  locationRegion: string
  latitude: string
  longitude: string
  timezone: string
  themeId: string
}

export type Appearance = Pick<Settings, 'themeId'>

export type WeatherSummary = {
  location: string
  current: {
    temperature: number | null
    feelsLike: number | null
    windSpeed: number | null
    windGusts: number | null
    precipitationMm: number | null
    label: string
    time: string | null
  }
  daily: Array<{
    date: string
    label: string
    max: number | null
    min: number | null
    precipitationChance: number | null
  }>
}

export type TideSummary = {
  events: Array<{
    id: string
    type: 'high' | 'low'
    time: string
    height: number | null
  }>
  note: string
}

export type HomeData = {
  weather: WeatherSummary | null
  tides: TideSummary | null
  notes: Note[]
  lists: SharedList[]
  pages: PageLink[]
  network: NetworkSummary | null
  settings: Partial<Settings>
  modules: Module[]
  appearance: Appearance
  listTypes: ListType[]
  deployment: {
    origin: string
    host: string
    mode: string
    ready: boolean
    note: string
  }
}

export type NetworkDevice = {
  id: string
  name: string
  type: string
  ip: string
  mac: string
  connection: string
  status: string
  lastSeen: string
  usageGb: number | null
}

export type NetworkOverview = {
  wifiName: string
  wifiPassword: string
  wifiSecurity: string
  routerUrl: string
  adminUrl: string
  usage: {
    period: string
    monthlyGb: number | null
    updatedAt: string | null
  }
  devices: NetworkDevice[]
}

export type NetworkSummary = {
  wifiName: string
  wifiSecurity: string
  deviceCount: number
  usage: {
    period: string
    monthlyGb: number | null
    updatedAt: string | null
  }
}

export type Session = {
  authenticated: boolean
  userId: string | null
  userName: string | null
  displayName: string | null
  role: 'admin' | 'member' | null
  adminUnlocked: boolean
  adminUnlockedUntil: string | null
  passwordSetupRequired: boolean
}

export type UserRecord = {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'member'
  active: boolean
  passwordResetRequired: boolean
}

export type UserPatch = Partial<UserRecord> & {
  password?: string
}

export type Toast = {
  id: string
  message: string
  kind: 'info' | 'warn'
}
