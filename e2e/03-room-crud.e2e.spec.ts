import { test, expect } from '@playwright/test'
import { CalendarPage } from './pages/calendar.page'
import { RoomPage } from './pages/room.page'

const TEST_CALENDAR = 'E2E Room Test Calendar'
const ICS_URL = 'https://example.com/room-test.ics'
const TEST_ROOM = 'E2E Conference Room'
const TEST_ROOM_EDITED = 'E2E Conference Room Updated'

// Uses storageState from auth.setup — already logged in as admin

test.describe('Room CRUD Flow', () => {
  test('full room lifecycle: create calendar → create room → edit → delete → cleanup', async ({ page }) => {
    // --- Step 1: Create a calendar (rooms require a calendar) ---
    const calendarPage = new CalendarPage(page)
    await calendarPage.gotoNew()
    await calendarPage.fillIcsForm(TEST_CALENDAR, ICS_URL)
    await calendarPage.submit()
    await page.waitForURL(/\/admin\/calendars$/, { timeout: 15_000 })
    await calendarPage.expectCalendarInList(TEST_CALENDAR)

    // --- Step 2: Create a room ---
    const roomPage = new RoomPage(page)
    await roomPage.gotoNew()
    await roomPage.fillForm(TEST_ROOM, 'Floor 3, Building A', '12')
    await roomPage.selectFirstCalendar()
    await roomPage.submit()
    await page.waitForURL(/\/admin\/rooms$/, { timeout: 15_000 })
    await roomPage.expectRoomInList(TEST_ROOM)

    // --- Step 3: Edit the room ---
    await page.waitForLoadState('networkidle')
    let cards = page.locator('[class*="card"], [class*="Card"], article, [role="article"]')
    let count = await cards.count()

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      if (await card.locator(`text=${TEST_ROOM}`).count() > 0) {
        await card.locator('a[href*="/admin/rooms/"]').first().click()
        break
      }
    }

    await page.waitForURL(/\/admin\/rooms\/[^/]+$/, { timeout: 10_000 })
    const nameInput = page.locator('input#room-name')
    await nameInput.clear()
    await nameInput.fill(TEST_ROOM_EDITED)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin\/rooms$/, { timeout: 15_000 })
    await roomPage.expectRoomInList(TEST_ROOM_EDITED)

    // --- Step 4: Delete the room ---
    await page.waitForLoadState('networkidle')
    cards = page.locator('[class*="card"], [class*="Card"], article, [role="article"]')
    count = await cards.count()

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      if (await card.locator(`text=${TEST_ROOM_EDITED}`).count() > 0) {
        await card.locator('button').filter({ has: page.locator('svg') }).last().click()
        break
      }
    }

    let dialog = page.locator('[role="alertdialog"], [role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.locator('button:has-text("Löschen")').click()
    await expect(page.locator(`text=${TEST_ROOM_EDITED}`)).not.toBeVisible({ timeout: 10_000 })

    // --- Step 5: Cleanup calendar ---
    await calendarPage.gotoList()
    await page.waitForLoadState('networkidle')
    cards = page.locator('[class*="card"], [class*="Card"], article, [role="article"]')
    count = await cards.count()

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      if (await card.locator(`text=${TEST_CALENDAR}`).count() > 0) {
        await card.locator('button').filter({ has: page.locator('svg') }).last().click()
        break
      }
    }

    dialog = page.locator('[role="alertdialog"], [role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.locator('button:has-text("Löschen")').click()
    await expect(page.locator(`text=${TEST_CALENDAR}`)).not.toBeVisible({ timeout: 10_000 })
  })
})
