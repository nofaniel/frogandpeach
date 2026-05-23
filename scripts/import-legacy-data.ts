import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildLegacyImportSql, type LegacyBundle } from '../src/migrations/legacyImport'

const sources = {
  mainData: 'N:\\code\\Frog&Peach\\data',
  claudisusDb: 'N:\\code\\Frog&Peach-Claudisus\\hub.db',
  doceksDb: 'N:\\code\\Frog&Peach-Doceks\\server\\data\\frog-peach.sqlite',
  doceksPages: 'N:\\code\\Frog&Peach-Doceks\\pages\\pages.json',
}

const bundle: LegacyBundle = {
  notes: [],
  lists: [],
  pages: [],
  pageLinks: [],
}

readMainJson(bundle)
await readSqliteBundle(bundle, sources.claudisusDb, 'claudisus')
await readSqliteBundle(bundle, sources.doceksDb, 'doceks')
readDoceksPageLinks(bundle)

mkdirSync('imports', { recursive: true })
writeFileSync(path.join('imports', 'legacy-import.sql'), buildLegacyImportSql(bundle))

console.log(`Wrote imports/legacy-import.sql with ${bundle.notes?.length ?? 0} notes, ${bundle.lists?.length ?? 0} lists, ${bundle.pages?.length ?? 0} pages, and ${bundle.pageLinks?.length ?? 0} page links.`)

function readMainJson(target: LegacyBundle) {
  if (!existsSync(sources.mainData)) return
  target.notes?.push(...readJson(path.join(sources.mainData, 'notes.json')))
  target.lists?.push(...readJson(path.join(sources.mainData, 'lists.json')))
  target.pages?.push(...readJson(path.join(sources.mainData, 'pages.json')))
}

function readDoceksPageLinks(target: LegacyBundle) {
  if (!existsSync(sources.doceksPages)) return
  target.pageLinks?.push(...readJson(sources.doceksPages))
}

async function readSqliteBundle(target: LegacyBundle, file: string, source: 'claudisus' | 'doceks') {
  if (!existsSync(file)) return

  const sqlite = await import('node:sqlite').catch(() => null)
  if (!sqlite) {
    console.warn(`Skipping ${file}: this Node.js runtime does not expose node:sqlite.`)
    return
  }

  const db = new sqlite.DatabaseSync(file, { readOnly: true })
  try {
    if (source === 'claudisus') {
      target.notes?.push(...safeAll(db, 'SELECT id, title, body_md, tags, updated_at FROM notes'))
      target.pages?.push(...safeAll(db, 'SELECT id, slug, title, body_md, updated_at FROM pages'))
      const lists = safeAll(db, 'SELECT id, name, created_at FROM shopping_lists')
      const items = safeAll(db, 'SELECT id, list_id, text, checked, created_at FROM shopping_items')
      target.lists?.push(...lists.map((list: any) => ({ ...list, items: items.filter((item: any) => item.list_id === list.id).map((item: any) => ({ ...item, checked: item.checked === 1 })) })))
    } else {
      target.notes?.push(...safeAll(db, 'SELECT id, title, body, tags, pinned, created_at, updated_at FROM notes'))
      target.pages?.push(...safeAll(db, 'SELECT id, title, body, theme, created_at, updated_at FROM pages'))
      const lists = safeAll(db, 'SELECT id, name, created_at, updated_at FROM shopping_lists')
      const items = safeAll(db, 'SELECT id, list_id, text, done, created_at, updated_at FROM shopping_items')
      target.lists?.push(...lists.map((list: any) => ({ ...list, items: items.filter((item: any) => item.list_id === list.id).map((item: any) => ({ ...item, done: item.done === 1 })) })))
    }
  } finally {
    db.close()
  }
}

function safeAll(db: any, sql: string) {
  try {
    return db.prepare(sql).all()
  } catch {
    return []
  }
}

function readJson(file: string) {
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, 'utf8'))
}
