export type Tab = 'home' | 'lists' | 'notes' | 'pages' | 'network' | 'whiteboard' | 'weather' | 'gallery'

export type ModuleSettingDefinition = {
  key: string
  type: 'select' | 'boolean' | 'text' | 'secret' | 'number'
  label: string
  description: string
  defaultValue: unknown
  options?: Array<{ value: string; label: string; description?: string }>
  placeholder?: string
  min?: number
  max?: number
}

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
  settings?: ModuleSettingDefinition[]
  options: Record<string, unknown> & {
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
  metadata: Record<string, unknown>
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
    uvIndexMax: number | null
    sunrise: string | null
    sunset: string | null
  }>
  hourly: Array<{
    time: string
    temperature: number | null
    precipitationChance: number | null
    label: string
  }>
  environment?: {
    time: string | null
    uvIndex: number | null
    uvIndexMax: number | null
    airQuality: { europeanAqi: number | null; pm2_5: number | null; pm10: number | null; level: string | null } | null
    pollen: { available: boolean; overallLevel: string | null; grass: number | null; birch: number | null; alder: number | null; mugwort: number | null; olive: number | null; ragweed: number | null } | null
  } | null
}

export type TideSummary = {
  current: {
    seaLevel: number | null
    waveHeight: number | null
    time: string | null
  } | null
  forecastUntil: string | null
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
  whiteboardStrokes: WhiteboardStroke[]
  whiteboardStrokeCount: number
  galleryImages: GalleryImage[]
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

export type WhiteboardPoint = {
  x: number
  y: number
}

export type WhiteboardTool = 'pen' | 'eraser' | 'pan'

export type WhiteboardStrokeInput = {
  points: WhiteboardPoint[]
  color: string
  width: number
  tool: WhiteboardTool
  opacity: number
}

export type WhiteboardStroke = {
  id: string
  points: WhiteboardPoint[]
  color: string
  width: number
  tool: WhiteboardTool
  opacity: number
  createdByName: string | null
  createdAt: string
}

export type WhiteboardStrokePatch = {
  color?: string
  width?: number
  tool?: WhiteboardTool
  opacity?: number
}

export type Toast = {
  id: string
  message: string
  kind: 'info' | 'warn'
}

export type GalleryImage = {
  id: string
  name: string
  mimeType: string
  thumbnailLink: string
  webContentLink: string
  width: number | null
  height: number | null
  createdTime: string
  size: string
}

export type GalleryStatus = {
  connected: boolean
  email: string
  folderId: string
  folderName: string
  configured: boolean
}
