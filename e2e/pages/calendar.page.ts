import { type Page, type Locator, expect } from '@playwright/test'

export class CalendarPage {
  readonly page: Page
  readonly addButton: Locator
  readonly nameInput: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page
    this.addButton = page.locator('a[href="/admin/calendars/new"]')
    this.nameInput = page.locator('input#cal-name')
    this.submitButton = page.locator('button[type="submit"]')
  }

  async gotoList() {
    await this.page.goto('/admin/calendars')
  }

  async gotoNew() {
    await this.page.goto('/admin/calendars/new')
  }

  async selectProvider(provider: 'EXCHANGE' | 'GOOGLE' | 'CALDAV' | 'ICS') {
    await this.page.locator(`button:has-text("${provider}")`).click()
  }

  async fillIcsForm(name: string, feedUrl: string) {
    await this.nameInput.fill(name)
    await this.selectProvider('ICS')
    await this.page.locator('input#cal-ics-feedUrl').fill(feedUrl)
  }

  async submit() {
    await this.submitButton.click()
  }

  async expectCalendarInList(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10_000 })
  }

  async clickCalendar(name: string) {
    await this.page.locator(`text=${name}`).first().click()
  }

  async deleteCalendar() {
    await this.page.locator('button:has-text("Delete"), button:has-text("Löschen")').click()
    // Confirm in the dialog
    const confirmButton = this.page.locator('[role="alertdialog"] button:has-text("Delete"), [role="alertdialog"] button:has-text("Löschen"), [role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Löschen")')
    await confirmButton.click()
  }
}
