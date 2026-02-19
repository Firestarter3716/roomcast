import { type Page, type Locator, expect } from '@playwright/test'

export class RoomPage {
  readonly page: Page
  readonly addButton: Locator
  readonly nameInput: Locator
  readonly locationInput: Locator
  readonly capacityInput: Locator
  readonly calendarSelect: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page
    this.addButton = page.locator('a[href="/admin/rooms/new"]')
    this.nameInput = page.locator('input#room-name')
    this.locationInput = page.locator('input#room-location')
    this.capacityInput = page.locator('input#room-capacity')
    this.calendarSelect = page.locator('select#room-calendarId')
    this.submitButton = page.locator('button[type="submit"]')
  }

  async gotoList() {
    await this.page.goto('/admin/rooms')
  }

  async gotoNew() {
    await this.page.goto('/admin/rooms/new')
  }

  async fillForm(name: string, location: string, capacity: string) {
    await this.nameInput.fill(name)
    await this.locationInput.fill(location)
    await this.capacityInput.fill(capacity)
  }

  async selectFirstCalendar() {
    const options = this.calendarSelect.locator('option')
    const count = await options.count()
    if (count > 1) {
      // Select the first real calendar (skip placeholder)
      const value = await options.nth(1).getAttribute('value')
      if (value) await this.calendarSelect.selectOption(value)
    }
  }

  async submit() {
    await this.submitButton.click()
  }

  async expectRoomInList(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10_000 })
  }

  async clickRoom(name: string) {
    await this.page.locator(`text=${name}`).first().click()
  }

  async deleteRoom() {
    await this.page.locator('button:has-text("Delete"), button:has-text("Löschen")').click()
    const confirmButton = this.page.locator('[role="alertdialog"] button:has-text("Delete"), [role="alertdialog"] button:has-text("Löschen"), [role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Löschen")')
    await confirmButton.click()
  }
}
