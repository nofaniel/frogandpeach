import { Markdown } from '../../components/Markdown'
import type { Page } from '../../shared/api-types'

export function StandalonePageView({ page }: { page: Page }) {
  return (
    <section className={`standalone-page ${page.theme}`}>
      <a className="button-link" href="/">Back</a>
      <p className="kicker">{page.emoji} {page.occasion || 'Editable page'}</p>
      <h1>{page.title}</h1>
      <Markdown body={page.body} />
    </section>
  )
}
