import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'
import { UserPage } from './pages/user.page'

const TEST_USER_NAME = 'E2E Test User'
const TEST_USER_EMAIL = 'e2e-test@roomcast.local'
const TEST_USER_PASSWORD = 'TestPassword123!'

// Uses storageState from auth.setup — already logged in as admin

test.describe('User Management Flow', () => {
  test('full user lifecycle: create → edit role → delete', async ({ page }) => {
    const userPage = new UserPage(page)

    // --- Step 1: Create user ---
    await userPage.gotoNew()
    await userPage.fillForm(TEST_USER_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD, 'VIEWER')
    await userPage.submit()
    await page.waitForURL(/\/admin\/settings\/users$/, { timeout: 15_000 })
    await userPage.expectUserInList(TEST_USER_NAME)

    // --- Step 2: Verify edit link works (B1 fixed) ---
    await page.waitForLoadState('networkidle')
    const userRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_USER_NAME }).first()
    const editLink = userRow.locator('a[href*="/admin/settings/users/"]').first()
    const href = await editLink.getAttribute('href')
    expect(href).not.toContain('/edit') // B1 fixed: no /edit suffix

    // --- Step 3: Edit user via edit link ---
    await editLink.click()
    await page.waitForLoadState('networkidle')

    // Change role to EDITOR
    await userPage.changeRole('EDITOR')

    // B2 fixed: password is optional in edit mode, no need to fill it

    await userPage.submit()
    await page.waitForURL(/\/admin\/settings\/users$/, { timeout: 15_000 })

    // Verify role changed
    await userPage.expectUserInList(TEST_USER_NAME)
    const updatedRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_USER_NAME }).first()
    await expect(updatedRow.getByText('EDITOR')).toBeVisible()

    // --- Step 4: Delete user ---
    await page.waitForLoadState('networkidle')
    const deleteRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_USER_NAME }).first()
    const deleteButton = deleteRow.locator('button').filter({ has: page.locator('svg') }).last()
    await deleteButton.click()

    const dialog = page.locator('[role="alertdialog"], [role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.locator('button:has-text("Löschen")').click()
    await page.waitForTimeout(1000)
    await expect(page.locator(`text=${TEST_USER_NAME}`)).not.toBeVisible({ timeout: 10_000 })
  })

  test('new user can log in', async ({ page, browser }) => {
    const userPage = new UserPage(page)
    const testEmail = `e2e-login-${Date.now()}@roomcast.local`

    // Create a user via admin session (page already authenticated via storageState)
    await userPage.gotoNew()
    await page.waitForLoadState('networkidle')
    await userPage.fillForm('Login Test User', testEmail, 'LoginTest123!', 'VIEWER')
    await userPage.submit()
    await page.waitForURL(/\/admin\/settings\/users$/, { timeout: 15_000 })
    await userPage.expectUserInList('Login Test User')

    // Login as the new user (fresh context, no auth)
    const userContext = await browser.newContext()
    const userLoginPage = await userContext.newPage()
    const login = new LoginPage(userLoginPage)
    await login.loginWithRetry(testEmail, 'LoginTest123!')
    expect(userLoginPage.url()).toContain('/admin')
    await userContext.close()

    // Clean up: delete the test user
    await page.goto('/admin/settings/users')
    await page.waitForLoadState('networkidle')

    const row = page.locator('tr, [role="row"]').filter({ hasText: 'Login Test User' }).first()
    await row.locator('button').filter({ has: page.locator('svg') }).last().click()

    const dialog = page.locator('[role="alertdialog"], [role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.locator('button:has-text("Löschen")').click()
    await page.waitForTimeout(1000)
  })
})
