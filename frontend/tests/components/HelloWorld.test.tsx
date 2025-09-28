import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HelloWorld from '../../src/components/HelloWorld'
import { AuthProvider } from '../../src/contexts/auth-context'

// Type declaration for global
declare const global: typeof globalThis;

// Mock the useTelegram hook
vi.mock('../../src/utils/telegram', () => ({
  useTelegram: () => ({
    webApp: {
      platform: 'tdesktop',
      version: '6.7',
      colorScheme: 'light',
      initData: 'mock_init_data'
    },
    user: {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
      photo_url: 'https://cdn.arstechnica.net/wp-content/uploads/archive/bill-gates-outlook/outlook-default-person.png'
    },
    isWebAppReady: true
  })
}))

// Mock fetch to handle auth requests
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    status: 401,
    json: () => Promise.resolve({ authenticated: false, message: 'Not authenticated' })
  })
) as any

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('HelloWorld Component', () => {

  it('should render Hello World text', () => {
    render(<HelloWorld />, { wrapper: TestWrapper })

    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should display welcome message', () => {
    render(<HelloWorld />, { wrapper: TestWrapper })

    expect(screen.getByText('Welcome to Telegram Web App!')).toBeInTheDocument()
  })

  it('should have proper styling classes', () => {
    render(<HelloWorld />, { wrapper: TestWrapper })

    const container = screen.getByTestId('hello-world-container')
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen')
  })

  it('should display Telegram Web App status', () => {
    render(<HelloWorld />, { wrapper: TestWrapper })

    const statusText = screen.getByText(/Telegram Web App:/i)
    expect(statusText).toBeInTheDocument()
  })

  it('should be responsive on mobile devices', () => {
    render(<HelloWorld />, { wrapper: TestWrapper })

    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toHaveClass('text-4xl', 'md:text-6xl')
  })

  it('should handle Telegram theme colors', () => {
    render(<HelloWorld />, { wrapper: TestWrapper })

    const container = screen.getByTestId('hello-world-container')
    expect(container).toHaveClass('bg-gray-50', 'text-gray-900')
  })
})