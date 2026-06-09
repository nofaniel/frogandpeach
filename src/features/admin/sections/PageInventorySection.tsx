import type { PageLink } from '../../../shared/api-types'
import { customPageMetadataPath, customPageSourcePath, suggestedPageMetadata } from '../../../shared/format'

export function PageInventorySection({
  pageLinks,
  customPages,
  pageManifestWarnings,
}: {
  pageLinks: PageLink[]
  customPages: PageLink[]
  pageManifestWarnings: Array<{ path: string; message: string }>
}) {
  const editablePages = pageLinks.filter((page) => page.kind === 'editable')
  const manualLinks = pageLinks.filter((page) => page.kind !== 'editable' && page.kind !== 'custom')
  return (
    <article className="panel span-2">
      <div className="panel-heading">
        <div>
          <p className="kicker">Pages</p>
          <h2>Page inventory</h2>
        </div>
        <span className={pageManifestWarnings.length === 0 ? 'status-badge ok' : 'status-badge warn'}>
          {pageManifestWarnings.length === 0 ? 'Ready' : 'Needs review'}
        </span>
      </div>
      <div className="stat-grid">
        <div><strong>{editablePages.length}</strong><span>Editable</span></div>
        <div><strong>{customPages.length}</strong><span>Discovered</span></div>
        <div><strong>{manualLinks.length}</strong><span>Manual links</span></div>
        <div><strong>{pageManifestWarnings.length}</strong><span>Warnings</span></div>
      </div>
      {pageManifestWarnings.length > 0 && (
        <div className="stack-list">
          {pageManifestWarnings.map((warning) => (
            <div className="plain-row warning-row" key={`${warning.path}-${warning.message}`}>
              <strong>{warning.path || 'Manifest'}</strong>
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}
      {customPages.length > 0 && (
        <div className="manifest-detail-grid">
          {customPages.map((page) => (
            <article className="manifest-card" key={page.id}>
              <div className="panel-heading">
                <div>
                  <strong>{page.title}</strong>
                  <span>{page.description || 'No description set.'}</span>
                </div>
                <a className="button-link ghost compact-link" href={page.href}>Open</a>
              </div>
              <dl className="manifest-fields">
                <div><dt>HTML source</dt><dd>{customPageSourcePath(page.href)}</dd></div>
                <div><dt>Metadata file</dt><dd>{customPageMetadataPath(page.href)}</dd></div>
                <div><dt>Manifest href</dt><dd>{page.href}</dd></div>
              </dl>
              <div className="metadata-preview">
                <div className="metadata-preview-header">
                  <span>Suggested page.json</span>
                  <button type="button" className="ghost compact-link" onClick={() => void navigator.clipboard.writeText(suggestedPageMetadata(page))}>Copy</button>
                </div>
                <textarea readOnly value={suggestedPageMetadata(page)} />
              </div>
            </article>
          ))}
        </div>
      )}
      {manualLinks.length > 0 && (
        <div className="stack-list">
          {manualLinks.slice(0, 8).map((page) => (
            <a className="plain-row" key={`${page.kind}-${page.id}`} href={page.href}>
              <strong>{page.title}</strong>
              <span>{page.kind} / {page.href}</span>
            </a>
          ))}
        </div>
      )}
      {customPages.length === 0 && manualLinks.length === 0 && <p>No custom or manual page links discovered.</p>}
    </article>
  )
}
