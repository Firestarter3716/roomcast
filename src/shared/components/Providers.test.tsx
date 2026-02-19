import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="intl-provider">{children}</div>,
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Admin', email: 'admin@test.com', role: 'ADMIN' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>,
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

import { Providers } from '@/shared/components/Providers'

describe('Providers', () => {
  const defaultProps = {
    locale: 'en',
    messages: { greeting: 'Hello' },
  }

  it('renders children', () => {
    render(
      <Providers {...defaultProps}>
        <p>Child content</p>
      </Providers>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('wraps content with SessionProvider and NextIntlClientProvider', () => {
    render(
      <Providers {...defaultProps}>
        <p>Wrapped content</p>
      </Providers>
    )

    const sessionProvider = screen.getByTestId('session-provider')
    const intlProvider = screen.getByTestId('intl-provider')

    expect(sessionProvider).toBeInTheDocument()
    expect(intlProvider).toBeInTheDocument()

    // SessionProvider wraps IntlProvider which wraps children
    expect(sessionProvider).toContainElement(intlProvider)
    expect(intlProvider).toHaveTextContent('Wrapped content')
  })
})
