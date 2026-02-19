import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json')

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input#email').fill('admin@roomcast.local')
  await page.locator('input#password').fill('changeme')
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to admin area
  await page.waitForURL(/\/admin/, { timeout: 15_000 })
  await expect(page.locator('nav')).toBeVisible()

  // Save signed-in state
  await page.context().storageState({ path: AUTH_FILE })
})
