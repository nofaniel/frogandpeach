import { describe, expect, it } from 'vitest'
import { buildLegacyImportSql } from './legacyImport'

describe('legacy import SQL builder', () => {
  it('normalises JSON notes, lists, pages, and static launchers', () => {
    const sql = buildLegacyImportSql({
      notes: [{ id: 'abc', title: 'Milk note', content: 'Buy <milk>', tags: 'flat,shop', pinned: true }],
      lists: [{ id: 'groceries', name: 'Groceries', items: [{ id: 'one', text: "Bob's oats", done: false }] }],
      pages: [{ id: 'p1', title: 'Hello You', message: 'A page', theme: 'botanical', emoji: '*' }],
      pageLinks: [{ id: 'static', title: 'Static', href: 'example/index.html' }],
    })

    expect(sql).toContain("INSERT OR IGNORE INTO notes")
    expect(sql).toContain("Buy <milk>")
    expect(sql).toContain("Bob''s oats")
    expect(sql).toContain("'hello-you'")
    expect(sql).toContain("'/pages/example/index.html'")
  })
})
