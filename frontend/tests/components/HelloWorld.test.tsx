import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HelloWorld from '../../src/components/HelloWorld'

vi.mock('../../src/utils/telegram', () => ({
  useTelegram: () => ({
    webApp: { platform: 'tdesktop', version: '6.7', colorScheme: 'light' },
    isWebAppReady: true
  })
}))

vi.mock('../../src/hooks/use-simple-auth', () => ({
  useSimpleAuth: () => ({
    user: { first_name: 'Test', username: 'testuser' },
    sessionId: 'test-session-123',
    expiresAt: Date.now() + 3600000
  })
}))

vi.mock('../../src/hooks/use-health-check', () => ({
  useHealthCheck: () => ({
    healthStatus: 'ok',
    kvStatus: 'ok',
    healthTimestamp: Date.now()
  })
}))

vi.mock('../../src/hooks/use-countdown', () => ({
  useCountdown: () => '59:59'
}))

describe('HelloWorld Component', () => {
  it('renders without crashing', () => {
    render(<HelloWorld />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('displays Telegram Web App status', () => {
    render(<HelloWorld />)
    expect(screen.getByText(/Telegram Web App:/)).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
})