import { type Page, type Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input#email')
    this.passwordInput = page.locator('input#password')
    this.submitButton = page.locator('button[type="submit"]')
    this.errorAlert = page.locator('[role="alert"]')
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  /** Login with retry on rate-limit (429) errors */
  async loginWithRetry(email: string, password: string, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await this.goto()
      await this.login(email, password)

      // Check if we hit rate limit or auth error
      try {
        await this.page.waitForURL(/\/admin/, { timeout: 10_000 })
        return // success
      } catch {
        const url = this.page.url()
        if (url.includes('/api/auth/error') || url.includes('/login')) {
          // Rate limited or auth error — wait and retry
          await this.page.waitForTimeout(5_000)
          continue
        }
        throw new Error(`Login failed, ended up at: ${url}`)
      }
    }
    throw new Error(`Login failed after ${maxRetries} retries (likely rate limited)`)
  }

  async expectError() {
    await expect(this.errorAlert).toBeVisible({ timeout: 10_000 })
  }
}
