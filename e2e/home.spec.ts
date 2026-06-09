import { expect, test, type Page } from '@playwright/test'
import { expectNoConsoleErrors, signIn, testCredentials } from './helpers/auth'

async function openAdmin(page: Page) {
  await page.getByRole('button', { name: 'Admin settings' }).click()
  const unlockButton = page.getByRole('button', { name: 'Unlock' })
  if (await unlockButton.count()) {
    const { username, password } = testCredentials()
    await page.getByRole('textbox', { name: 'Admin username' }).fill(username)
    await page.getByRole('textbox', { name: 'Password' }).fill(password)
    await unlockButton.click()
  }
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
}

function moduleRow(page: Page, title: string) {
  return page.locator('.module-config-row').filter({ hasText: title }).first()
}

async function setModuleWidgetEnabled(page: Page, title: string, enabled: boolean) {
  const row = moduleRow(page, title)
  const button = row.getByRole('button', { name: enabled ? 'Widget on' : 'Widget off' })
  if (await button.count()) {
    await button.click()
  }
}

async function setModuleMode(page: Page, title: string, mode: string) {
  const row = moduleRow(page, title)
  await row.getByRole('combobox', { name: 'Homepage mode' }).selectOption(mode)
}

async function createPinnedNote(page: Page, title: string, body: string) {
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill(title)
  await page.getByRole('textbox', { name: 'Markdown note' }).fill(body)
  await page.getByRole('button', { name: 'Save note' }).click()
  const notePanel = page.locator('.note-panel').filter({ hasText: title }).first()
  await expect(notePanel).toBeVisible()
  await notePanel.getByRole('button', { name: 'Pin' }).click()
  await expect(notePanel.getByRole('button', { name: 'Unpin' })).toBeVisible()
}

async function createList(page: Page, name: string) {
  await page.getByRole('button', { name: 'Lists' }).click()
  await page.getByPlaceholder('Big shop, chores, goals...').fill(name)
  await page.getByRole('button', { name: 'Add list' }).click()
  await expect(page.locator('.list-panel').filter({ hasText: name }).first()).toBeVisible()
}

test.describe('home dashboard', () => {
  test('shows every built-in widget by default', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    await expect(page.locator('.home-dashboard .panel')).toHaveCount(6)
    await expect(page.getByRole('button', { name: 'Lists' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notes' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pages' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Network' })).toBeVisible()

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('removes a widget from home without disabling the module tab', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)
    await openAdmin(page)

    let toggled = false
    try {
      await setModuleWidgetEnabled(page, 'Notes', false)
      toggled = true
      await page.getByRole('button', { name: 'Close' }).click()
      await page.getByRole('button', { name: 'Home' }).click()
      await expect(page.locator('.home-dashboard .panel')).toHaveCount(5)
      await expect(page.getByRole('button', { name: 'Notes' })).toBeVisible()
    } finally {
      if (toggled) {
        await openAdmin(page)
        await setModuleWidgetEnabled(page, 'Notes', true)
        await page.getByRole('button', { name: 'Close' }).click()
      }
    }

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('changing notes and network modes changes visible density and detail', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    const notePrefix = `Widget note ${Date.now()}`
    const noteTitles = Array.from({ length: 4 }, (_, index) => `${notePrefix} ${index + 1}`)

    await signIn(page)

    for (const [index, title] of noteTitles.entries()) {
      await createPinnedNote(page, title, `Body ${index + 1}`)
    }

    await page.getByRole('button', { name: 'Home' }).click()
    const notesWidget = page.locator('.home-dashboard article').filter({ hasText: 'Notes' }).first()
    await expect(notesWidget.getByText(noteTitles[3], { exact: true })).toHaveCount(0)

    await openAdmin(page)
    await setModuleMode(page, 'Notes', 'large')
    await setModuleMode(page, 'Network', 'details')
    await page.getByRole('button', { name: 'Close' }).click()

    await page.getByRole('button', { name: 'Home' }).click()
    await expect(notesWidget.getByText(noteTitles[3], { exact: true })).toBeVisible()
    await expect(page.locator('.network-summary-grid')).toBeVisible()

    await openAdmin(page)
    await setModuleMode(page, 'Notes', 'small')
    await setModuleMode(page, 'Network', 'status')
    await page.getByRole('button', { name: 'Close' }).click()

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('starring a list prioritizes it in the lists widget', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    const listPrefix = `Widget list ${Date.now()}`
    const starredList = `${listPrefix} star`
    const backupList = `${listPrefix} backup`

    await signIn(page)
    await openAdmin(page)
    await setModuleMode(page, 'Lists', 'starred')
    await page.getByRole('button', { name: 'Close' }).click()

    await createList(page, starredList)
    await createList(page, backupList)

    const starredRow = page.locator('.list-panel').filter({ hasText: starredList }).first()
    await starredRow.getByRole('button', { name: 'Star' }).click()
    await expect(starredRow.getByRole('button', { name: 'Unstar' })).toBeVisible()

    await page.getByRole('button', { name: 'Home' }).click()
    const listsWidget = page.locator('.home-dashboard article').filter({ hasText: 'Lists' }).first()
    const firstRow = listsWidget.locator('button.plain-row').first()
    await expect(firstRow).toContainText(starredList)

    await expectNoConsoleErrors(page, consoleErrors)
  })
})

test.describe('weather widget', () => {
  test('renders the weather panel on the home dashboard', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    const weatherPanel = page.locator('.home-dashboard .weather-panel').first()
    await expect(weatherPanel).toBeVisible()

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('shows hourly timeline when weather data is available', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    const weatherPanel = page.locator('.home-dashboard .weather-panel').first()
    await expect(weatherPanel).toBeVisible()

    const hourlySection = weatherPanel.locator('.weather-hourly')
    const hourlyCount = await hourlySection.count()
    if (hourlyCount > 0) {
      await expect(hourlySection).toBeVisible()
      await expect(hourlySection).toHaveAttribute('aria-label', 'Hourly forecast for today')
      const cards = hourlySection.locator('.weather-hour-card')
      expect(await cards.count()).toBeGreaterThan(0)
    }

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('tooltip appears on hover over metric icons', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    const weatherPanel = page.locator('.home-dashboard .weather-panel').first()
    const currentSection = weatherPanel.locator('.weather-current')
    const hasCurrentWeather = (await currentSection.count()) > 0 && await currentSection.isVisible().catch(() => false)

    if (hasCurrentWeather) {
      const tooltipTriggers = weatherPanel.locator('.info-tooltip-trigger')
      const triggerCount = await tooltipTriggers.count()
      if (triggerCount > 0) {
        const firstTrigger = tooltipTriggers.first()
        await firstTrigger.hover()
        const tooltipBubble = weatherPanel.locator('.info-tooltip-bubble')
        await expect(tooltipBubble.first()).toBeVisible()
        await page.mouse.move(0, 0)
      }
    }

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('tooltip appears on keyboard focus', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    const weatherPanel = page.locator('.home-dashboard .weather-panel').first()
    const tooltipTriggers = weatherPanel.locator('.info-tooltip-trigger')
    const triggerCount = await tooltipTriggers.count()

    if (triggerCount > 0) {
      await tooltipTriggers.first().focus()
      const tooltipBubble = weatherPanel.locator('.info-tooltip-bubble')
      await expect(tooltipBubble.first()).toBeVisible()
    }

    await expectNoConsoleErrors(page, consoleErrors)
  })

  test('5-day forecast rain bar has accessible label', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await signIn(page)

    const weatherPanel = page.locator('.home-dashboard .weather-panel').first()
    const precipTrack = weatherPanel.locator('.weather-precip-track')
    const trackCount = await precipTrack.count()

    if (trackCount > 0) {
      const firstTrack = precipTrack.first()
      const ariaLabel = await firstTrack.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toMatch(/Chance of rain/)
    }

    await expectNoConsoleErrors(page, consoleErrors)
  })
})
