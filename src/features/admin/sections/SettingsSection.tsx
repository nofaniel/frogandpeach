import type { FormEvent } from 'react'
import type { Settings } from '../../../shared/api-types'

export function SettingsSection({
  settings,
  onSettingsChange,
  onSaveSettings,
  onUseDeviceLocation,
}: {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  onSaveSettings: (event: FormEvent<HTMLFormElement>) => void
  onUseDeviceLocation: () => Promise<void>
}) {
  return (
    <form className="panel form-panel" onSubmit={onSaveSettings}>
      <p className="kicker">Household and location</p>
      <h2>Private settings</h2>
      <div className="two-col">
        <label>Wi-Fi name<input value={settings.wifiName} onChange={(event) => onSettingsChange({ ...settings, wifiName: event.target.value })} /></label>
        <label>Wi-Fi password<input value={settings.wifiPassword} onChange={(event) => onSettingsChange({ ...settings, wifiPassword: event.target.value })} /></label>
        <label>Wi-Fi security
          <select value={settings.wifiSecurity} onChange={(event) => onSettingsChange({ ...settings, wifiSecurity: event.target.value })}>
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Open (no password)</option>
          </select>
        </label>
        <label>Router URL<input value={settings.routerUrl} onChange={(event) => onSettingsChange({ ...settings, routerUrl: event.target.value })} /></label>
        <label>Admin URL<input value={settings.adminUrl} onChange={(event) => onSettingsChange({ ...settings, adminUrl: event.target.value })} /></label>
        <label>Usage period<input value={settings.wifiUsagePeriod} onChange={(event) => onSettingsChange({ ...settings, wifiUsagePeriod: event.target.value })} placeholder="May 2026" /></label>
        <label>Usage this period (GB)<input value={settings.wifiUsageMonthlyGb} onChange={(event) => onSettingsChange({ ...settings, wifiUsageMonthlyGb: event.target.value })} placeholder="612.4" /></label>
        <label>Usage updated at<input value={settings.wifiUsageUpdatedAt} onChange={(event) => onSettingsChange({ ...settings, wifiUsageUpdatedAt: event.target.value })} placeholder="2026-05-30T15:30:00Z" /></label>
        <label>Bin day<input value={settings.binDay} onChange={(event) => onSettingsChange({ ...settings, binDay: event.target.value })} /></label>
        <label>Timezone<input value={settings.timezone} onChange={(event) => onSettingsChange({ ...settings, timezone: event.target.value })} /></label>
        <label>Location<input value={settings.locationName} onChange={(event) => onSettingsChange({ ...settings, locationName: event.target.value })} /></label>
        <label>Region<input value={settings.locationRegion} onChange={(event) => onSettingsChange({ ...settings, locationRegion: event.target.value })} /></label>
        <label>Latitude<input value={settings.latitude} onChange={(event) => onSettingsChange({ ...settings, latitude: event.target.value })} /></label>
        <label>Longitude<input value={settings.longitude} onChange={(event) => onSettingsChange({ ...settings, longitude: event.target.value })} /></label>
      </div>
      <div className="button-row">
        <button type="button" className="ghost" onClick={() => void onUseDeviceLocation()}>Use this device location</button>
        <p className="small-note">Timezone comes from your browser and can still be edited manually.</p>
      </div>
      <label>Network devices JSON<textarea value={settings.wifiDevicesJson} onChange={(event) => onSettingsChange({ ...settings, wifiDevicesJson: event.target.value })} placeholder='[{"name":"Living Room TV","type":"tv","ip":"192.168.1.28","status":"online"}]' /></label>
      <label>Household notes<textarea value={settings.flatNotes} onChange={(event) => onSettingsChange({ ...settings, flatNotes: event.target.value })} /></label>
      <button type="submit">Save settings</button>
    </form>
  )
}
