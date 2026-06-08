import { expect, type Page } from '@playwright/test'

export function testCredentials() {
  const username = process.env.TEST_USERNAME ?? process.env.FP_TEST_USERNAME
  const password = process.env.TEST_PASSWORD ?? process.env.FP_TEST_PASSWORD

  if (!username) {
    throw new Error('Set TEST_USERNAME (or legacy FP_TEST_USERNAME) explicitly for E2E runs')
  }

  if (!password) {
    throw new Error('Set TEST_PASSWORD (or legacy FP_TEST_PASSWORD) explicitly for E2E runs')
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
