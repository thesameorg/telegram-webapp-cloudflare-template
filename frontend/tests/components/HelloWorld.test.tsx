import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HelloWorld from '../../src/components/HelloWorld'

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

// Mock fetch to handle auth requests - return successful auth for tests
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      authenticated: true,
      sessionId: 'test-session-123',
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en'
      },
      expiresAt: Date.now() + 3600000
    })
  })
) as any

// Mock the useSimpleAuth hook to return authenticated state for tests
vi.mock('../../src/hooks/use-simple-auth', () => ({
  useSimpleAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en'
    },
    sessionId: 'test-session-123',
    expiresAt: Date.now() + 3600000
  })
}))

// Test wrapper component - just render children since auth is mocked
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
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