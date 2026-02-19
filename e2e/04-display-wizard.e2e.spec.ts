import { test, expect } from '@playwright/test'
import { DisplayPage } from './pages/display.page'

const TEST_DISPLAY = 'E2E Lobby Display'

// Uses storageState from auth.setup — already logged in as admin

test.describe('Display Wizard Flow', () => {
  test('creates a display through the wizard and verifies public access', async ({ page }) => {
    const displayPage = new DisplayPage(page)
    await displayPage.gotoNew()
    await page.waitForLoadState('networkidle')

    // Step 1: Fill display name
    await displayPage.fillName(TEST_DISPLAY)

    // Click Next to go to Step 2
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Wait for step 2 to render (layout selection)
    await expect(page.getByText(/Layout|layout/).first()).toBeVisible({ timeout: 5_000 })

    // Select AGENDA layout (no room required)
    const agendaButton = page.locator('button[aria-pressed]').filter({ hasText: /Agenda/i }).first()
    if (await agendaButton.isVisible()) {
      await agendaButton.click()
    }

    // Click Create Display
    await page.getByRole('button', { name: /Create Display/ }).click()

    // Wait for success (step 3)
    await displayPage.expectSuccess()

    // Verify token is generated
    const token = await displayPage.getToken()
    expect(token.length).toBeGreaterThan(0)

    // Verify public display access (no auth needed)
    const publicContext = await page.context().browser()!.newContext()
    const publicPage = await publicContext.newPage()
    const baseURL = page.url().split('/admin')[0]
    await publicPage.goto(`${baseURL}/display/${token}`)
    await publicPage.waitForLoadState('domcontentloaded')
    expect(publicPage.url()).toContain('/display/')
    expect(publicPage.url()).not.toContain('/login')
    await publicContext.close()

    // Navigate to display list and verify it appears
    await page.locator('a[href="/admin/displays"]').last().click()
    await page.waitForURL(/\/admin\/displays$/, { timeout: 10_000 })
    await displayPage.expectDisplayInList(TEST_DISPLAY)
  })

  test('deletes a display via the list card', async ({ page }) => {
    await page.goto('/admin/displays')
    await page.waitForLoadState('networkidle')

    // Check if our test display exists
    const displayName = page.locator(`text=${TEST_DISPLAY}`).first()
    if (!(await displayName.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No test display to clean up')
      return
    }

    // Click the delete button (trash icon)
    const deleteBtn = page.locator('button[aria-label="Delete display"]').first()
    await deleteBtn.click()

    // Wait for confirm dialog (Radix UI Dialog with portal)
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Intercept server action response before clicking confirm
    const actionPromise = page.waitForResponse(
      resp => resp.request().method() === 'POST',
      { timeout: 15_000 }
    )

    // Click confirm — use evaluate to bypass any overlay interference
    const confirmBtn = dialog.getByRole('button', { name: /Löschen/ })
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Verify server action was called
    const response = await actionPromise
    expect(response.status()).toBeLessThan(500)

    // Wait for dialog to close (server action completed)
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // Reload to get fresh server state
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify display is removed
    await expect(page.locator(`text=${TEST_DISPLAY}`).first()).not.toBeVisible({ timeout: 10_000 })
  })
})
