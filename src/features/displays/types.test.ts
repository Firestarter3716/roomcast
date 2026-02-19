import {
  getDefaultLayoutConfig,
  DEFAULT_ROOM_BOOKING,
  DEFAULT_AGENDA,
  DEFAULT_DAY_GRID,
  DEFAULT_WEEK_GRID,
  DEFAULT_INFO_DISPLAY,
} from '@/features/displays/types'

describe('getDefaultLayoutConfig', () => {
  it('returns RoomBookingConfig for "ROOM_BOOKING"', () => {
    const config = getDefaultLayoutConfig('ROOM_BOOKING')
    expect(config).toEqual(DEFAULT_ROOM_BOOKING)
  })

  it('returns AgendaConfig for "AGENDA"', () => {
    const config = getDefaultLayoutConfig('AGENDA')
    expect(config).toEqual(DEFAULT_AGENDA)
  })

  it('returns DayGridConfig for "DAY_GRID"', () => {
    const config = getDefaultLayoutConfig('DAY_GRID')
    expect(config).toEqual(DEFAULT_DAY_GRID)
  })

  it('returns WeekGridConfig for "WEEK_GRID"', () => {
    const config = getDefaultLayoutConfig('WEEK_GRID')
    expect(config).toEqual(DEFAULT_WEEK_GRID)
  })

  it('returns InfoDisplayConfig for "INFO_DISPLAY"', () => {
    const config = getDefaultLayoutConfig('INFO_DISPLAY')
    expect(config).toEqual(DEFAULT_INFO_DISPLAY)
  })

  it('returns RoomBookingConfig for unknown layout type', () => {
    const config = getDefaultLayoutConfig('UNKNOWN_TYPE')
    expect(config).toEqual(DEFAULT_ROOM_BOOKING)
  })

  it('returns a new object each time (not the same reference)', () => {
    const config1 = getDefaultLayoutConfig('ROOM_BOOKING')
    const config2 = getDefaultLayoutConfig('ROOM_BOOKING')
    expect(config1).toEqual(config2)
    expect(config1).not.toBe(config2)
  })
})
