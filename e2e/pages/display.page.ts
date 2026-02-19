import { type Page, type Locator, expect } from '@playwright/test'

export class DisplayPage {
  readonly page: Page
  readonly addButton: Locator
  readonly nameInput: Locator

  constructor(page: Page) {
    this.page = page
    this.addButton = page.locator('a[href="/admin/displays/new"]')
    this.nameInput = page.locator('input#wizard-name')
  }

  async gotoList() {
    await this.page.goto('/admin/displays')
  }

  async gotoNew() {
    await this.page.goto('/admin/displays/new')
  }

  // Step 1: Fill name
  async fillName(name: string) {
    await this.nameInput.fill(name)
  }

  // Step 1 -> Step 2
  async clickNext() {
    await this.page.getByRole('button', { name: /Next|Weiter/ }).click()
  }

  // Step 2: Select layout
  async selectLayout(layout: string) {
    await this.page.locator(`button[aria-pressed]:has-text("${layout}")`).click()
  }

  // Step 2 -> Create
  async clickCreate() {
    await this.page.getByRole('button', { name: /Create Display|Display erstellen/ }).click()
  }

  // Step 3: Verify success
  async expectSuccess() {
    await expect(
      this.page.getByRole('heading', { name: /Display Created Successfully|Display erfolgreich erstellt/i })
    ).toBeVisible({ timeout: 15_000 })
  }

  // Get the generated token from step 3
  async getToken(): Promise<string> {
    const codeElement = this.page.locator('code').first()
    return (await codeElement.textContent()) || ''
  }

  async expectDisplayInList(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10_000 })
  }
}
