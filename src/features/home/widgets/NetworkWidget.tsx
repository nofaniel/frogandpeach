import type { HomeData, Module, NetworkSummary } from '../../../shared/api-types'
import { formatDateTime, formatNumber } from '../../../shared/format'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'

export function NetworkWidget({
  module,
  network,
  deployment,
}: {
  module: Module
  network: NetworkSummary | null
  deployment: HomeData['deployment']
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const className = 'panel module-' + module.size

  return (
    <article id={module.id} className={className + ' network-panel'}>
      <div className="panel-heading">
        <div>
          <p className="kicker">Deployment</p>
          <h2>{deployment.host}</h2>
        </div>
        <span className={deployment.ready ? 'status-badge ok' : 'status-badge warn'}>
          {deployment.ready ? 'Connected' : 'Needs setup'}
        </span>
      </div>
      <p>{widget.mode === 'details' && network?.usage.period ? deployment.note + ' ' + network.usage.period + ' usage shown below.' : deployment.note}</p>
      <div className="stack-list">
        <a className="plain-row" href={deployment.origin} target="_blank" rel="noreferrer">
          <strong>Open current host</strong>
          <span>{deployment.origin}</span>
        </a>
        <a className="plain-row" href="/docs/cloudflare-hosting.md">
          <strong>Cloudflare hosting guide</strong>
          <span>Functions + D1 setup and deploy steps</span>
        </a>
      </div>
      {widget.mode === 'details' && network && (
        <section className="network-summary-grid">
          <div className="detail-box">
            <strong>Usage</strong>
            <span>{network.usage.period || 'Current period'}</span>
            <small>{network.usage.monthlyGb === null ? 'No usage data yet' : formatNumber(network.usage.monthlyGb) + ' GB' + (network.usage.updatedAt ? ' / updated ' + formatDateTime(network.usage.updatedAt) : '')}</small>
          </div>
          <div className="detail-box">
            <strong>Devices</strong>
            <span>{network.deviceCount} configured</span>
            <small>Open Network tab for details</small>
          </div>
        </section>
      )}
    </article>
  )
}
