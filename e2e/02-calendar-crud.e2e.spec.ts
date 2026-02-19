import { test, expect } from '@playwright/test'
import { CalendarPage } from './pages/calendar.page'

const TEST_CALENDAR = 'E2E Test Calendar'
const TEST_CALENDAR_EDITED = 'E2E Test Calendar Edited'
const ICS_URL = 'https://example.com/test-calendar.ics'

// Uses storageState from auth.setup — already logged in as admin

test.describe('Calendar CRUD Flow', () => {
  test('creates a new ICS calendar', async ({ page }) => {
    const calendarPage = new CalendarPage(page)
    await calendarPage.gotoNew()

    await calendarPage.fillIcsForm(TEST_CALENDAR, ICS_URL)
    await calendarPage.submit()

    await page.waitForURL(/\/admin\/calendars$/, { timeout: 15_000 })
    await calendarPage.expectCalendarInList(TEST_CALENDAR)
  })

  test('edits the calendar name', async ({ page }) => {
    const calendarPage = new CalendarPage(page)
    await calendarPage.gotoList()
    await page.waitForLoadState('networkidle')

    const cards = page.locator('[class*="card"], [class*="Card"], article, [role="article"]')
    const count = await cards.count()

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      if (await card.locator(`text=${TEST_CALENDAR}`).count() > 0) {
        await card.locator('a[href*="/admin/calendars/"]').first().click()
        break
      }
    }

    await page.waitForURL(/\/admin\/calendars\/[^/]+$/, { timeout: 10_000 })

    const nameInput = page.locator('input#cal-name')
    await nameInput.clear()
    await nameInput.fill(TEST_CALENDAR_EDITED)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/admin\/calendars$/, { timeout: 15_000 })
    await calendarPage.expectCalendarInList(TEST_CALENDAR_EDITED)
  })

  test('deletes the calendar', async ({ page }) => {
    const calendarPage = new CalendarPage(page)
    await calendarPage.gotoList()
    await page.waitForLoadState('networkidle')

    const cards = page.locator('[class*="card"], [class*="Card"], article, [role="article"]')
    const count = await cards.count()

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      if (await card.locator(`text=${TEST_CALENDAR_EDITED}`).count() > 0) {
        await card.locator('button').filter({ has: page.locator('svg') }).last().click()
        break
      }
    }

    const dialog = page.locator('[role="alertdialog"], [role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.locator('button:has-text("Löschen")').click()

    await expect(page.locator(`text=${TEST_CALENDAR_EDITED}`)).not.toBeVisible({ timeout: 10_000 })
  })
})
