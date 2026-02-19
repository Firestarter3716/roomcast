import { type Page, type Locator, expect } from '@playwright/test'

export class UserPage {
  readonly page: Page
  readonly addButton: Locator
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly roleSelect: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page
    this.addButton = page.locator('a[href="/admin/settings/users/new"]')
    this.nameInput = page.locator('input#user-name')
    this.emailInput = page.locator('input#user-email')
    this.passwordInput = page.locator('input#user-password')
    this.roleSelect = page.locator('select#user-role')
    this.submitButton = page.locator('button[type="submit"]')
  }

  async gotoList() {
    await this.page.goto('/admin/settings/users')
  }

  async gotoNew() {
    await this.page.goto('/admin/settings/users/new')
  }

  async fillForm(name: string, email: string, password: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.roleSelect.selectOption(role)
  }

  async submit() {
    await this.submitButton.click()
  }

  async expectUserInList(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10_000 })
  }

  async clickUser(name: string) {
    await this.page.locator(`text=${name}`).first().click()
  }

  async changeRole(role: 'ADMIN' | 'EDITOR' | 'VIEWER') {
    await this.roleSelect.selectOption(role)
  }

  async deleteUser() {
    await this.page.locator('button:has-text("Delete"), button:has-text("Löschen")').click()
    const confirmButton = this.page.locator('[role="alertdialog"] button:has-text("Delete"), [role="alertdialog"] button:has-text("Löschen"), [role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Löschen")')
    await confirmButton.click()
  }
}
