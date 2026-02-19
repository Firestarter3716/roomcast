import { vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => new Date('2025-01-15T10:30:00Z'),
}))

import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T10:00:00Z')}
        endTime={new Date('2025-01-15T11:00:00Z')}
      />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('progress div has width style based on elapsed time', () => {
    // Current time is 10:30, start is 10:00, end is 11:00
    // Elapsed: 30 min out of 60 min = 50%
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T10:00:00Z')}
        endTime={new Date('2025-01-15T11:00:00Z')}
      />
    )
    const progressDiv = container.firstChild!.firstChild as HTMLElement
    expect(progressDiv.style.width).toBe('50%')
  })

  it('progress is 0% when current time is before start', () => {
    // Current time is 10:30, start is 11:00, end is 12:00
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T11:00:00Z')}
        endTime={new Date('2025-01-15T12:00:00Z')}
      />
    )
    const progressDiv = container.firstChild!.firstChild as HTMLElement
    expect(progressDiv.style.width).toBe('0%')
  })

  it('progress is 100% when current time is after end', () => {
    // Current time is 10:30, start is 09:00, end is 10:00
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T09:00:00Z')}
        endTime={new Date('2025-01-15T10:00:00Z')}
      />
    )
    const progressDiv = container.firstChild!.firstChild as HTMLElement
    expect(progressDiv.style.width).toBe('100%')
  })

  it('applies default height of 4px', () => {
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T10:00:00Z')}
        endTime={new Date('2025-01-15T11:00:00Z')}
      />
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.height).toBe('4px')
  })

  it('applies custom height prop', () => {
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T10:00:00Z')}
        endTime={new Date('2025-01-15T11:00:00Z')}
        height={8}
      />
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.height).toBe('8px')
  })

  it('applies custom color prop', () => {
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T10:00:00Z')}
        endTime={new Date('2025-01-15T11:00:00Z')}
        color="#ff6600"
      />
    )
    const progressDiv = container.firstChild!.firstChild as HTMLElement
    expect(progressDiv.style.backgroundColor).toBe('rgb(255, 102, 0)')
  })

  it('calculates correct percentage for 75% elapsed', () => {
    // Current time is 10:30, start is 10:00, end is 10:40
    // Elapsed: 30 min out of 40 min = 75%
    const { container } = render(
      <ProgressBar
        startTime={new Date('2025-01-15T10:00:00Z')}
        endTime={new Date('2025-01-15T10:40:00Z')}
      />
    )
    const progressDiv = container.firstChild!.firstChild as HTMLElement
    expect(progressDiv.style.width).toBe('75%')
  })
})
