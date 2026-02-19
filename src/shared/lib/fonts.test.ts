import {
  getFontFamily,
  AVAILABLE_FONTS,
  DEFAULT_FONT,
  FONT_OPTIONS,
} from '@/shared/lib/fonts'

describe('getFontFamily', () => {
  it('returns the correct family for "inter"', () => {
    expect(getFontFamily('inter')).toBe("'Inter Variable', 'Inter', sans-serif")
  })

  it('returns the correct family for "roboto"', () => {
    expect(getFontFamily('roboto')).toBe("'Roboto Flex Variable', 'Roboto', sans-serif")
  })

  it('returns the correct family for "dm-sans"', () => {
    expect(getFontFamily('dm-sans')).toBe("'DM Sans Variable', 'DM Sans', sans-serif")
  })

  it('returns the correct family for "geist"', () => {
    expect(getFontFamily('geist')).toBe("'Geist Sans', sans-serif")
  })

  it('returns the correct family for "nunito"', () => {
    expect(getFontFamily('nunito')).toBe("'Nunito Variable', 'Nunito', sans-serif")
  })

  it('returns the correct family for "source-sans"', () => {
    expect(getFontFamily('source-sans')).toBe(
      "'Source Sans 3 Variable', 'Source Sans 3', sans-serif"
    )
  })

  it('falls back to the default font for an unknown id', () => {
    expect(getFontFamily('unknown-font')).toBe(DEFAULT_FONT.family)
    expect(getFontFamily('')).toBe(DEFAULT_FONT.family)
  })
})

describe('AVAILABLE_FONTS', () => {
  it('has 6 font definitions', () => {
    expect(AVAILABLE_FONTS).toHaveLength(6)
  })
})

describe('DEFAULT_FONT', () => {
  it('is inter', () => {
    expect(DEFAULT_FONT.id).toBe('inter')
    expect(DEFAULT_FONT.name).toBe('Inter')
  })
})

describe('FONT_OPTIONS', () => {
  it('has the correct structure with value and label properties', () => {
    expect(FONT_OPTIONS).toHaveLength(6)
    for (const option of FONT_OPTIONS) {
      expect(option).toHaveProperty('value')
      expect(option).toHaveProperty('label')
      expect(typeof option.value).toBe('string')
      expect(typeof option.label).toBe('string')
    }
  })

  it('maps font ids to values and names to labels', () => {
    expect(FONT_OPTIONS[0]).toEqual({ value: 'inter', label: 'Inter' })
    expect(FONT_OPTIONS[1]).toEqual({ value: 'roboto', label: 'Roboto' })
  })
})
