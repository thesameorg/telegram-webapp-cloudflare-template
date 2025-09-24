import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HelloWorld from '../../src/components/HelloWorld'

// Mock the useTelegram hook
vi.mock('../../src/utils/telegram', () => ({
  useTelegram: () => ({
    webApp: {
      platform: 'tdesktop',
      version: '6.7',
      colorScheme: 'light'
    },
    user: {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en'
    },
    isWebAppReady: true
  })
}))

describe('HelloWorld Component', () => {

  it('should render Hello World text', () => {
    render(<HelloWorld />)

    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should display welcome message', () => {
    render(<HelloWorld />)

    expect(screen.getByText('Welcome to Telegram Web App!')).toBeInTheDocument()
  })

  it('should have proper styling classes', () => {
    render(<HelloWorld />)

    const container = screen.getByTestId('hello-world-container')
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen')
  })

  it('should display Telegram Web App status', () => {
    render(<HelloWorld />)

    const statusText = screen.getByText(/Telegram Web App:/i)
    expect(statusText).toBeInTheDocument()
  })

  it('should be responsive on mobile devices', () => {
    render(<HelloWorld />)

    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toHaveClass('text-4xl', 'md:text-6xl')
  })

  it('should handle Telegram theme colors', () => {
    render(<HelloWorld />)

    const container = screen.getByTestId('hello-world-container')
    expect(container).toHaveClass('bg-gray-50', 'text-gray-900')
  })
})