import { getDisplayTranslations, type DisplayTranslations } from '@/features/display/shared/translations'

describe('getDisplayTranslations', () => {
  it('returns German translations for "de"', () => {
    const t = getDisplayTranslations('de')
    expect(t.status.free).toBe('FREI')
    expect(t.status.busy).toBe('BELEGT')
  })

  it('returns English translations for "en"', () => {
    const t = getDisplayTranslations('en')
    expect(t.status.free).toBe('FREE')
    expect(t.status.busy).toBe('OCCUPIED')
  })

  it('returns French translations for "fr"', () => {
    const t = getDisplayTranslations('fr')
    expect(t.status.free).toBe('LIBRE')
    expect(t.status.busy).toBe('OCCUP\u00c9')
  })

  it('falls back to German for unknown locale', () => {
    const t = getDisplayTranslations('ja')
    expect(t.status.free).toBe('FREI')
    expect(t.status.busy).toBe('BELEGT')
  })

  it('handles locale with region code ("de-DE" returns German)', () => {
    const t = getDisplayTranslations('de-DE')
    expect(t.status.free).toBe('FREI')
  })

  it('all translations have required keys', () => {
    const requiredKeys: (keyof DisplayTranslations)[] = [
      'status',
      'noEvents',
      'noEventsToday',
      'noEventsThisWeek',
      'noFurtherEvents',
      'noUpcomingEvents',
      'lunchBreak',
      'free',
      'comingUp',
      'today',
      'upcoming',
      'agenda',
      'attendees',
      'freeForMinutes',
    ]

    const statusKeys = ['free', 'busy', 'endingSoon', 'allDay', 'freeFrom'] as const

    for (const locale of ['de', 'en', 'fr']) {
      const t = getDisplayTranslations(locale)
      for (const key of requiredKeys) {
        expect(t).toHaveProperty(key)
      }
      for (const key of statusKeys) {
        expect(t.status).toHaveProperty(key)
      }
    }
  })
})
