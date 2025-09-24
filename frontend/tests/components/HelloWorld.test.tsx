import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HelloWorld from '../../src/components/HelloWorld'

describe('HelloWorld Component', () => {
  it('should render Hello World text', () => {
    render(<HelloWorld />)

    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should display current environment', () => {
    render(<HelloWorld />)

    const environmentText = screen.getByText(/Environment:/i)
    expect(environmentText).toBeInTheDocument()
  })

  it('should display timestamp', () => {
    render(<HelloWorld />)

    const timestampText = screen.getByText(/Last updated:/i)
    expect(timestampText).toBeInTheDocument()
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