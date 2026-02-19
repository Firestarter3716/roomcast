import { render, screen } from '@testing-library/react'
import { StatusBanner } from './StatusBanner'

describe('StatusBanner', () => {
  describe('German (default locale)', () => {
    it('renders "FREI" when isFree is true', () => {
      render(<StatusBanner isFree={true} />)
      expect(screen.getByText('FREI')).toBeInTheDocument()
    })

    it('renders "BELEGT" when isFree is false', () => {
      render(<StatusBanner isFree={false} />)
      expect(screen.getByText('BELEGT')).toBeInTheDocument()
    })

    it('renders "Endet bald" when isEndingSoon is true and isFree is false', () => {
      render(<StatusBanner isFree={false} isEndingSoon={true} />)
      expect(screen.getByText('Endet bald')).toBeInTheDocument()
    })

    it('renders "FREI" even when isEndingSoon is true if isFree is true', () => {
      render(<StatusBanner isFree={true} isEndingSoon={true} />)
      expect(screen.getByText('FREI')).toBeInTheDocument()
    })
  })

  describe('English locale', () => {
    it('renders "FREE" when isFree is true', () => {
      render(<StatusBanner isFree={true} locale="en" />)
      expect(screen.getByText('FREE')).toBeInTheDocument()
    })

    it('renders "OCCUPIED" when isFree is false', () => {
      render(<StatusBanner isFree={false} locale="en" />)
      expect(screen.getByText('OCCUPIED')).toBeInTheDocument()
    })

    it('renders "Ending soon" when isEndingSoon is true and isFree is false', () => {
      render(<StatusBanner isFree={false} isEndingSoon={true} locale="en" />)
      expect(screen.getByText('Ending soon')).toBeInTheDocument()
    })
  })

  describe('French locale', () => {
    it('renders "LIBRE" when isFree is true', () => {
      render(<StatusBanner isFree={true} locale="fr" />)
      expect(screen.getByText('LIBRE')).toBeInTheDocument()
    })

    it('renders "OCCUP\u00c9" when isFree is false', () => {
      render(<StatusBanner isFree={false} locale="fr" />)
      expect(screen.getByText('OCCUP\u00c9')).toBeInTheDocument()
    })

    it('renders "Se termine bient\u00f4t" when isEndingSoon is true and isFree is false', () => {
      render(<StatusBanner isFree={false} isEndingSoon={true} locale="fr" />)
      expect(screen.getByText('Se termine bient\u00f4t')).toBeInTheDocument()
    })
  })

  describe('locale with region code', () => {
    it('handles "de-DE" and renders German text', () => {
      render(<StatusBanner isFree={true} locale="de-DE" />)
      expect(screen.getByText('FREI')).toBeInTheDocument()
    })

    it('handles "en-US" and renders English text', () => {
      render(<StatusBanner isFree={true} locale="en-US" />)
      expect(screen.getByText('FREE')).toBeInTheDocument()
    })

    it('handles "fr-FR" and renders French text', () => {
      render(<StatusBanner isFree={true} locale="fr-FR" />)
      expect(screen.getByText('LIBRE')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies freeColor when isFree is true', () => {
      const { container } = render(
        <StatusBanner isFree={true} freeColor="#00ff00" />
      )
      const div = container.firstChild as HTMLElement
      expect(div.style.color).toBe('rgb(0, 255, 0)')
    })

    it('applies busyColor when isFree is false', () => {
      const { container } = render(
        <StatusBanner isFree={false} busyColor="#ff0000" />
      )
      const div = container.firstChild as HTMLElement
      expect(div.style.color).toBe('rgb(255, 0, 0)')
    })

    it('uses ending-soon color when isEndingSoon is true and isFree is false', () => {
      const { container } = render(
        <StatusBanner isFree={false} isEndingSoon={true} busyColor="#ff0000" />
      )
      const div = container.firstChild as HTMLElement
      expect(div.style.color).toBe('var(--display-ending-soon)')
    })
  })
})
