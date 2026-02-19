import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'

// Auth tests use their own login flow — no storageState dependency
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication Flow', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin/calendars')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })

  test('shows error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('wrong@user.com', 'wrongpassword')
    await loginPage.expectError()
  })

  test('logs in with valid admin credentials and reaches admin area', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin@roomcast.local', 'changeme')

    await page.waitForURL(/\/admin/, { timeout: 15_000 })
    expect(page.url()).toContain('/admin')
    await expect(page.locator('nav').first()).toBeVisible()
  })

  test('can navigate between admin sections after login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin@roomcast.local', 'changeme')
    await page.waitForURL(/\/admin/, { timeout: 15_000 })

    await page.locator('a[href="/admin/rooms"]').first().click()
    await page.waitForURL(/\/admin\/rooms/)
    expect(page.url()).toContain('/admin/rooms')

    await page.locator('a[href="/admin/displays"]').first().click()
    await page.waitForURL(/\/admin\/displays/)
    expect(page.url()).toContain('/admin/displays')

    await page.locator('a[href="/admin/settings"]').first().click()
    await page.waitForURL(/\/admin\/settings/)
    expect(page.url()).toContain('/admin/settings')
  })

  test('can log out and is redirected to login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin@roomcast.local', 'changeme')
    await page.waitForURL(/\/admin/, { timeout: 15_000 })

    const logoutButton = page.locator('button[aria-label="Log out"], button:has-text("Abmelden")')
    await logoutButton.click()

    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })
})
