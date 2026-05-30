import { expect, type Page } from '@playwright/test'

export function testCredentials() {
  const username = process.env.FP_TEST_USERNAME
  const password = process.env.FP_TEST_PASSWORD

  if (!username || !password) {
    throw new Error('Set FP_TEST_USERNAME and FP_TEST_PASSWORD before running Playwright e2e tests.')
  }

  return { username, password }
}

export async function signIn(page: Page) {
  const { username, password } = testCredentials()

  await page.goto('/')
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening),/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
}

export async function expectNoConsoleErrors(page: Page, errors: string[]) {
  expect(errors, `Console errors:\n${errors.join('\n')}`).toEqual([])
  await expect(page.getByText(/Internal server error|Login required|Invalid username or password/)).toHaveCount(0)
}
