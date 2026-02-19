import { locales, defaultLocale, isValidLocale } from '@/i18n/config'

describe('i18n config', () => {
  it('locales contains de, en, and fr', () => {
    expect(locales).toContain('de')
    expect(locales).toContain('en')
    expect(locales).toContain('fr')
  })

  it('defaultLocale is "de"', () => {
    expect(defaultLocale).toBe('de')
  })

  it('isValidLocale returns true for valid locales', () => {
    expect(isValidLocale('de')).toBe(true)
    expect(isValidLocale('en')).toBe(true)
    expect(isValidLocale('fr')).toBe(true)
  })

  it('isValidLocale returns false for invalid locales', () => {
    expect(isValidLocale('es')).toBe(false)
    expect(isValidLocale('ja')).toBe(false)
    expect(isValidLocale('')).toBe(false)
    expect(isValidLocale('DE')).toBe(false)
  })
})
