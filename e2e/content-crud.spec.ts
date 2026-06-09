import { expect, test } from '@playwright/test'
import { expectNoConsoleErrors, signIn } from './helpers/auth'

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}`
}

test.describe('content workflows', () => {
  test('creates, completes, and deletes a list item', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    const listName = uniqueName('E2E List')
    const itemName = uniqueName('E2E item')

    await signIn(page)
    await page.getByRole('button', { name: 'Lists' }).click()

    await page.getByRole('textbox', { name: 'Big shop, chores, goals...' }).fill(listName)
    await page.getByRole('button', { name: 'Add list' }).click()
    await expect(page.getByRole('heading', { name: listName })).toBeVisible()

    await page.getByRole('textbox', { name: 'Add item' }).fill(itemName)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const item = page.getByText(itemName).first()
    await expect(item).toBeVisible()

    const checkbox = page.getByRole('checkbox', { name: new RegExp(itemName) })
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    await page.getByRole('button', { name: new RegExp(`Delete ${itemName}`) }).click()
    await expect(page.getByText(itemName)).toHaveCount(0)

    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: listName })).toHaveCount(0)

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('creates, pins, and deletes a markdown note', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    const noteTitle = uniqueName('E2E Note')

    await signIn(page)
    await page.getByRole('button', { name: 'Notes' }).click()

    await page.getByRole('textbox', { name: 'Title' }).fill(noteTitle)
    await page.getByRole('textbox', { name: 'Note body' }).fill('This is an **automated** note.')
    await page.getByRole('button', { name: 'Save note' }).click()

    await expect(page.getByRole('heading', { name: noteTitle })).toBeVisible()
    await expect(page.getByText('automated')).toBeVisible()

    await page.getByRole('button', { name: new RegExp(`Pin note: ${noteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
    await expect(page.getByRole('button', { name: new RegExp(`Unpin note: ${noteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toBeVisible()

    await page.getByRole('button', { name: new RegExp(`Delete note: ${noteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
    await expect(page.getByRole('heading', { name: noteTitle })).toHaveCount(0)

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('creates, opens, and deletes an editable page', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    const pageTitle = uniqueName('E2E Page')
    const slug = `e2e-page-${Date.now()}`

    await signIn(page)
    await page.getByRole('button', { name: 'Pages' }).click()

    await page.getByRole('textbox', { name: 'Title' }).fill(pageTitle)
    await page.getByRole('textbox', { name: 'custom-slug' }).fill(slug)
    await page.getByRole('textbox', { name: 'Icon' }).fill('🧪')
    await page.getByRole('textbox', { name: 'Occasion or short description' }).fill('E2E generated page')
    await page.getByRole('textbox', { name: 'Markdown body' }).fill('Hello from **Playwright**.')
    await page.getByRole('button', { name: 'Create page' }).click()

    const editablePageCard = page.getByRole('article').filter({ hasText: `/page/${slug}` })
    await expect(editablePageCard.getByRole('heading', { name: pageTitle })).toBeVisible()
    await editablePageCard.getByRole('link', { name: 'Open' }).click()
    await expect(page.getByRole('heading', { name: pageTitle })).toBeVisible()
    await expect(page.getByText('Hello from')).toBeVisible()

    await page.getByRole('link', { name: 'Back' }).click()
    await page.getByRole('button', { name: 'Pages' }).click()
    await page.getByRole('article').filter({ hasText: `/page/${slug}` }).getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('article').filter({ hasText: `/page/${slug}` })).toHaveCount(0)

    await expectNoConsoleErrors(page, consoleErrors)
  })
})
