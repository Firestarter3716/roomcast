import { THEME_PALETTES } from '@/features/displays/palettes'
import type { ThemeConfig } from '@/features/displays/types'

describe('THEME_PALETTES', () => {
  it('has 5 entries', () => {
    expect(THEME_PALETTES).toHaveLength(5)
  })

  it('each palette has id, name, description, and theme', () => {
    for (const palette of THEME_PALETTES) {
      expect(palette).toHaveProperty('id')
      expect(palette).toHaveProperty('name')
      expect(palette).toHaveProperty('description')
      expect(palette).toHaveProperty('theme')
      expect(typeof palette.id).toBe('string')
      expect(typeof palette.name).toBe('string')
      expect(typeof palette.description).toBe('string')
    }
  })

  it('each theme has all required ThemeConfig keys', () => {
    const requiredKeys: (keyof ThemeConfig)[] = [
      'preset',
      'background',
      'foreground',
      'primary',
      'secondary',
      'free',
      'busy',
      'endingSoon',
      'muted',
      'fontFamily',
      'baseFontSize',
      'statusBackground',
    ]

    for (const palette of THEME_PALETTES) {
      for (const key of requiredKeys) {
        expect(palette.theme).toHaveProperty(key)
      }
    }
  })

  it('contains a dark palette', () => {
    const dark = THEME_PALETTES.find((p) => p.id === 'dark')
    expect(dark).toBeDefined()
  })

  it('contains a light palette', () => {
    const light = THEME_PALETTES.find((p) => p.id === 'light')
    expect(light).toBeDefined()
  })

  it('contains a high-contrast palette', () => {
    const highContrast = THEME_PALETTES.find((p) => p.id === 'high-contrast')
    expect(highContrast).toBeDefined()
  })
})
