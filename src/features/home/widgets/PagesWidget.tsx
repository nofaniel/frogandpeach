import type { Module, PageLink } from '../../../shared/api-types'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'

export function PagesWidget({
  module,
  pages,
}: {
  module: Module
  pages: PageLink[]
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const visiblePages = pages.slice(0, widget.mode === 'launchpad' ? 6 : 10)

  return (
    <article id={module.id} className={'panel module-' + module.size}>
      <p className="kicker">Pages</p>
      <h2>{widget.mode === 'launchpad' ? 'Launchpad cards' : 'Custom launchpad'}</h2>
      {widget.mode === 'launchpad' ? (
        <div className="launchpad-grid">
          {visiblePages.map((page) => (
            <article className="plain-row launchpad-card" key={page.kind + '-' + page.id}>
              <div className="panel-heading">
                <div>
                  <p className="kicker">{page.kind}</p>
                  <h3>{page.title}</h3>
                </div>
                <a className="button-link ghost compact-link" href={page.href}>Open</a>
              </div>
              <p>{page.description || 'No description yet.'}</p>
              <small>{page.href}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="page-chip-row">
          {visiblePages.map((page) => (
            <a key={page.kind + '-' + page.id} href={page.href} className="page-chip">
              <span>{page.kind}</span>
              <strong>{page.title}</strong>
            </a>
          ))}
        </div>
      )}
    </article>
  )
}
