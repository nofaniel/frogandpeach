import { expect, test } from '@playwright/test'
import { expectNoConsoleErrors, signIn } from './helpers/auth'

test.describe('home dashboard', () => {
  test('logs in and renders neutral weather and tides setup state', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    await expect(page.getByRole('heading', { name: 'Location not set' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Admin settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lists' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notes' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pages' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Network' })).toBeVisible()

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('navigates every bottom tab without app errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    await page.getByRole('button', { name: 'Lists' }).click()
    await expect(page.getByRole('heading', { name: 'New list' })).toBeVisible()

    await page.getByRole('button', { name: 'Notes' }).click()
    await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible()

    await page.getByRole('button', { name: 'Pages' }).click()
    await expect(page.getByRole('heading', { name: 'New markdown page' })).toBeVisible()

    await page.getByRole('button', { name: 'Network' }).click()
    await expect(page.getByRole('heading', { name: /frog-peach-home-hub|Local app/ })).toBeVisible()

    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.getByRole('heading', { name: 'Location not set' })).toBeVisible()

    await expectNoConsoleErrors(page, consoleErrors)
  })
})
