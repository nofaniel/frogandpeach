import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Markdown } from '../../components/Markdown'
import type { Page, PageLink } from '../../shared/api-types'

export function PagesWorkspace({
  pages,
  pageLinks,
  pageDraft,
  setPageDraft,
  linkDraft,
  setLinkDraft,
  onCreatePage,
  onRemovePage,
  onCreatePageLink,
  onRemovePageLink,
}: {
  pages: Page[]
  pageLinks: PageLink[]
  pageDraft: { title: string; slug: string; body: string; theme: string; occasion: string; emoji: string }
  setPageDraft: Dispatch<SetStateAction<{ title: string; slug: string; body: string; theme: string; occasion: string; emoji: string }>>
  linkDraft: { title: string; href: string; description: string; kind: string }
  setLinkDraft: Dispatch<SetStateAction<{ title: string; href: string; description: string; kind: string }>>
  onCreatePage: (event: FormEvent<HTMLFormElement>) => void
  onRemovePage: (id: string) => void
  onCreatePageLink: (event: FormEvent<HTMLFormElement>) => void
  onRemovePageLink: (id: string) => void
}) {
  return (
    <section className="workspace-grid">
      <form className="panel form-panel" onSubmit={onCreatePage}>
        <p className="kicker">Editable page</p>
        <h2>New markdown page</h2>
        <input value={pageDraft.title} onChange={(event) => setPageDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Title" />
        <input value={pageDraft.slug} onChange={(event) => setPageDraft((draft) => ({ ...draft, slug: event.target.value }))} placeholder="custom-slug" />
        <div className="two-col">
          <select value={pageDraft.theme} onChange={(event) => setPageDraft((draft) => ({ ...draft, theme: event.target.value }))}>
            <option value="shell">Shell</option>
            <option value="peach">Peach</option>
            <option value="moon">Moon</option>
            <option value="fern">Fern</option>
            <option value="botanical">Botanical</option>
          </select>
          <input value={pageDraft.emoji} onChange={(event) => setPageDraft((draft) => ({ ...draft, emoji: event.target.value }))} placeholder="Icon" />
        </div>
        <input value={pageDraft.occasion} onChange={(event) => setPageDraft((draft) => ({ ...draft, occasion: event.target.value }))} placeholder="Occasion or short description" />
        <textarea value={pageDraft.body} onChange={(event) => setPageDraft((draft) => ({ ...draft, body: event.target.value }))} placeholder="Markdown body" />
        <button type="submit">Create page</button>
      </form>

      <form className="panel form-panel" onSubmit={onCreatePageLink}>
        <p className="kicker">Custom launcher</p>
        <h2>Link a page file</h2>
        <input value={linkDraft.title} onChange={(event) => setLinkDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="House rules" />
        <input value={linkDraft.href} onChange={(event) => setLinkDraft((draft) => ({ ...draft, href: event.target.value }))} placeholder="house-rules/index.html" />
        <input value={linkDraft.description} onChange={(event) => setLinkDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Description" />
        <button type="submit">Add launcher</button>
      </form>

      {pages.map((page) => (
        <article className={`panel page-panel ${page.theme}`} key={page.id}>
          <div className="panel-heading">
            <div>
              <p className="kicker">{page.emoji} /page/{page.slug}</p>
              <h2>{page.title}</h2>
            </div>
            <a className="button-link" href={`/page/${page.slug}`}>Open</a>
          </div>
          <Markdown body={page.body} />
          <button type="button" className="ghost danger" onClick={() => void onRemovePage(page.id)}>Delete</button>
        </article>
      ))}

      {pageLinks.map((link) => (
        <article className="panel page-panel" key={`${link.kind}-${link.id}`}>
          <div className="panel-heading">
            <div>
              <p className="kicker">{link.kind}</p>
              <h2>{link.title}</h2>
            </div>
            <a className="button-link" href={link.href}>Open</a>
          </div>
          <p>{link.description}</p>
          {link.kind !== 'editable' && link.kind !== 'custom' && <button type="button" className="ghost danger" onClick={() => void onRemovePageLink(link.id)}>Delete launcher</button>}
        </article>
      ))}
    </section>
  )
}
