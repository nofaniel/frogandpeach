import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import type { HomeData, NetworkOverview, NetworkSummary } from '../../shared/api-types'
import { formatDateTime, normaliseExternalUrl, toWifiPayload } from '../../shared/format'

export function NetworkWorkspace({
  networkSummary,
  fullNetwork,
  deployment,
}: {
  networkSummary: NetworkSummary | null
  fullNetwork: NetworkOverview | null
  deployment: HomeData['deployment'] | null
}) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copyState, setCopyState] = useState('')
  const hasWifi = Boolean(fullNetwork?.wifiName)
  const wifiPayload = useMemo(() => {
    if (!fullNetwork?.wifiName) return ''
    return toWifiPayload(fullNetwork.wifiName, fullNetwork.wifiPassword, fullNetwork.wifiSecurity)
  }, [fullNetwork])

  useEffect(() => {
    let cancelled = false
    if (!wifiPayload) {
      setQrDataUrl('')
      return
    }
    void QRCode.toDataURL(wifiPayload, { width: 300, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [wifiPayload])

  async function copyValue(text: string, label: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyState(`${label} copied`)
      window.setTimeout(() => setCopyState(''), 1400)
    } catch {
      setCopyState('Clipboard blocked')
      window.setTimeout(() => setCopyState(''), 1400)
    }
  }

  const routerUrl = normaliseExternalUrl(fullNetwork?.routerUrl)
  const adminUrl = normaliseExternalUrl(fullNetwork?.adminUrl)
  const devices = fullNetwork?.devices ?? []
  const usagePeriod = networkSummary?.usage.period || 'Current period'
  const usageValue = networkSummary?.usage.monthlyGb

  return (
    <section className="workspace-grid network-grid">
      <article className="panel span-2 network-share">
        <div className="panel-heading">
          <div>
            <p className="kicker">Network join</p>
            <h2>Share local Wi-Fi</h2>
          </div>
          {copyState && <span className="status-badge ok">{copyState}</span>}
        </div>
        {fullNetwork ? (
          hasWifi ? (
            <div className="network-share-grid">
              <div className="network-credentials">
                <div className="plain-row">
                  <strong>SSID</strong>
                  <span>{fullNetwork.wifiName}</span>
                </div>
                <div className="plain-row">
                  <strong>Password</strong>
                  <span>{fullNetwork.wifiPassword || '(none)'}</span>
                </div>
                <div className="plain-row">
                  <strong>Security</strong>
                  <span>{fullNetwork.wifiSecurity}</span>
                </div>
                <div className="button-row">
                  <button type="button" className="ghost" onClick={() => void copyValue(fullNetwork.wifiName, 'SSID')}>Copy SSID</button>
                  <button type="button" className="ghost" onClick={() => void copyValue(fullNetwork.wifiPassword, 'Password')}>Copy password</button>
                </div>
              </div>
              <div className="network-qr-wrap">
                {qrDataUrl ? (
                  <img className="network-qr" src={qrDataUrl} alt="Wi-Fi join QR code" />
                ) : (
                  <div className="plain-row">
                    <strong>QR unavailable</strong>
                    <span>Add SSID/security details in Admin settings.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p>Set Wi-Fi details in Admin settings to enable one-scan join sharing.</p>
          )
        ) : (
          <p>Loading network details...</p>
        )}
      </article>

      <article className="panel">
        <p className="kicker">Usage</p>
        <h2>{usageValue === null || usageValue === undefined ? '--' : `${usageValue.toFixed(1)} GB`}</h2>
        <p>{usagePeriod}</p>
        <p className="small-note">
          {networkSummary?.usage.updatedAt ? `Updated ${formatDateTime(networkSummary.usage.updatedAt)}` : 'Add usage values in Admin settings.'}
        </p>
      </article>

      <article className="panel">
        <p className="kicker">Quick links</p>
        <h2>Router access</h2>
        <div className="stack-list">
          {fullNetwork && routerUrl && <a className="plain-row" href={routerUrl} target="_blank" rel="noreferrer"><strong>Router</strong><span>{routerUrl}</span></a>}
          {fullNetwork && adminUrl && <a className="plain-row" href={adminUrl} target="_blank" rel="noreferrer"><strong>Admin</strong><span>{adminUrl}</span></a>}
          {!fullNetwork && <p className="small-note">Loading network details...</p>}
          <a className="plain-row" href={deployment?.origin ?? '/'}><strong>Current app host</strong><span>{deployment?.origin ?? 'No host loaded'}</span></a>
        </div>
      </article>

      <article className="panel span-2">
        <div className="panel-heading">
          <div>
            <p className="kicker">Connected devices</p>
            <h2>{fullNetwork ? `${devices.length} known` : `${networkSummary?.deviceCount ?? '--'} configured`}</h2>
          </div>
        </div>
        {fullNetwork ? (
          <div className="stack-list">
            {devices.map((device) => (
              <div className="device-row" key={device.id}>
                <div>
                  <strong>{device.name}</strong>
                  <span>{device.type} / {device.connection} / {device.status}</span>
                </div>
                <small>{device.ip || device.mac || 'No address'}</small>
                <small>{device.usageGb === null ? '--' : `${device.usageGb.toFixed(1)} GB`}</small>
              </div>
            ))}
            {devices.length === 0 && <p>No devices configured yet. Add JSON entries in Admin settings.</p>}
          </div>
        ) : (
          <p className="small-note">Loading network details...</p>
        )}
      </article>
    </section>
  )
}
