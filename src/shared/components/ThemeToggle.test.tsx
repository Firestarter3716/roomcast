import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Admin', email: 'admin@test.com', role: 'ADMIN' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/calendars',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { ThemeToggle } from '@/shared/components/ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.cookie = ''
  })

  it('renders without crashing', () => {
    render(<ThemeToggle />)

    // After mount, the button should be present
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('shows moon icon (switch to dark) when theme is light', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('has correct aria-label', () => {
    render(<ThemeToggle />)

    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument()
  })

  it('toggles theme on click (sets data-theme attribute on documentElement)', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')

    // Initially light, clicking should switch to dark
    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    // Click again to switch back to light
    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets theme cookie on toggle', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(document.cookie).toContain('theme=dark')

    fireEvent.click(button)
    expect(document.cookie).toContain('theme=light')
  })
})
