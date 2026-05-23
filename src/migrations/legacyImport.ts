export type LegacyNote = {
  id?: string | number
  title?: string
  content?: string
  body?: string
  body_md?: string
  tags?: string
  pinned?: boolean | number
  createdAt?: string
  updatedAt?: string
  updated_at?: string | number
}

export type LegacyList = {
  id?: string | number
  name?: string
  items?: Array<{ id?: string | number; text?: string; done?: boolean; checked?: boolean | number; createdAt?: string; updatedAt?: string }>
  createdAt?: string
  updatedAt?: string
}

export type LegacyPage = {
  id?: string | number
  slug?: string
  title?: string
  body?: string
  body_md?: string
  message?: string
  theme?: string
  occasion?: string
  emoji?: string
  createdAt?: string
  updatedAt?: string
  updated_at?: string | number
}

export type LegacyPageLink = {
  id?: string
  title?: string
  href?: string
  description?: string
  kind?: string
}

export type LegacyBundle = {
  notes?: LegacyNote[]
  lists?: LegacyList[]
  pages?: LegacyPage[]
  pageLinks?: LegacyPageLink[]
}

export function buildLegacyImportSql(bundle: LegacyBundle) {
  const statements: string[] = ['BEGIN TRANSACTION;']

  for (const note of bundle.notes ?? []) {
    const id = stableId('note', note.id)
    const title = note.title || firstLine(note.content || note.body || note.body_md || '') || 'Imported note'
    const body = note.body ?? note.content ?? note.body_md ?? ''
    const stamp = normaliseStamp(note.updatedAt ?? note.updated_at)
    statements.push(
      `INSERT OR IGNORE INTO notes (id, title, body, tags, pinned, created_at, updated_at) VALUES (${q(id)}, ${q(title)}, ${q(body)}, ${q(note.tags ?? '')}, ${note.pinned ? 1 : 0}, ${q(
        normaliseStamp(note.createdAt),
      )}, ${q(stamp)});`,
    )
  }

  for (const list of bundle.lists ?? []) {
    const listId = stableId('list', list.id)
    const stamp = normaliseStamp(list.updatedAt)
    statements.push(
      `INSERT OR IGNORE INTO shopping_lists (id, name, created_at, updated_at) VALUES (${q(listId)}, ${q(list.name || 'Imported list')}, ${q(normaliseStamp(list.createdAt))}, ${q(stamp)});`,
    )
    for (const item of list.items ?? []) {
      const itemId = stableId('item', item.id)
      statements.push(
        `INSERT OR IGNORE INTO shopping_items (id, list_id, text, done, created_at, updated_at) VALUES (${q(itemId)}, ${q(listId)}, ${q(item.text || 'Imported item')}, ${
          item.done || item.checked ? 1 : 0
        }, ${q(normaliseStamp(item.createdAt))}, ${q(normaliseStamp(item.updatedAt))});`,
      )
    }
  }

  for (const page of bundle.pages ?? []) {
    const pageId = stableId('page', page.id)
    const title = page.title || 'Imported page'
    const slug = slugify(page.slug || title) || pageId
    const body = page.body ?? page.body_md ?? page.message ?? ''
    const stamp = normaliseStamp(page.updatedAt ?? page.updated_at)
    statements.push(
      `INSERT OR IGNORE INTO pages (id, slug, title, body, theme, occasion, emoji, created_at, updated_at) VALUES (${q(pageId)}, ${q(slug)}, ${q(title)}, ${q(body)}, ${q(
        page.theme || 'shell',
      )}, ${q(page.occasion || '')}, ${q(page.emoji || '')}, ${q(normaliseStamp(page.createdAt))}, ${q(stamp)});`,
    )
  }

  for (const link of bundle.pageLinks ?? []) {
    const linkId = pageLinkId(link.id)
    statements.push(
      `INSERT OR IGNORE INTO page_links (id, title, href, description, kind, created_at, updated_at) VALUES (${q(linkId)}, ${q(link.title || 'Imported link')}, ${q(
        normaliseHref(link.href || ''),
      )}, ${q(link.description || '')}, ${q(link.kind || 'static')}, ${q(normaliseStamp())}, ${q(normaliseStamp())});`,
    )
  }

  statements.push('COMMIT;')
  return `${statements.join('\n')}\n`
}

export function q(value: unknown) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`
}

export function stableId(prefix: string, value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return `${prefix}_${cryptoRandomish()}`
  return `${prefix}_${raw.replace(/[^a-zA-Z0-9_-]+/g, '_')}`
}

function pageLinkId(value: unknown) {
  const raw = String(value ?? '').trim()
  return raw ? raw.replace(/[^a-zA-Z0-9_-]+/g, '_') : stableId('link', value)
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function normaliseHref(href: string) {
  if (!href) return '/pages/example/index.html'
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/')) return href
  return `/pages/${href.replace(/^\/+/, '')}`
}

function normaliseStamp(value?: string | number) {
  if (typeof value === 'number') return new Date(value).toISOString()
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString()
  }
  return '2026-05-23T00:00:00.000Z'
}

function firstLine(value: string) {
  return value.split('\n').find((line) => line.trim())?.trim() ?? ''
}

function cryptoRandomish() {
  return Math.random().toString(36).slice(2, 11)
}
