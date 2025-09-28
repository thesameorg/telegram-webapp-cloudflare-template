import { describe, it, expect } from 'vitest'
import app from '../../src/index'

// Minimal mock environment for testing
const mockEnv = {
  TELEGRAM_BOT_TOKEN: 'test-token',
  ENVIRONMENT: 'test'
}

describe('GET /api/hello', () => {
  it('should return Hello World message', async () => {
    const response = await app.request('/api/hello', {}, mockEnv)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const result = await response.json() as any
    expect(result).toMatchObject({
      message: 'Hello World',
      timestamp: expect.any(String),
      environment: expect.stringMatching(/^(local|preview|prod|test)$/)
    })
  })

  it('should return valid timestamp', async () => {
    const response = await app.request('/api/hello', {}, mockEnv)
    const result = await response.json() as any

    expect(() => new Date(result.timestamp)).not.toThrow()

    const timestamp = new Date(result.timestamp)
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - timestamp.getTime())

    expect(timeDiff).toBeLessThan(5000) // Within 5 seconds
  })

  it('should include correct environment information', async () => {
    const response = await app.request('/api/hello', {}, mockEnv)
    const result = await response.json() as any

    expect(['local', 'preview', 'prod', 'test']).toContain(result.environment)
  })

  it('should handle basic requests without CORS middleware', async () => {
    const response = await app.request('/api/hello', {
      method: 'GET'
    }, mockEnv)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should respond with proper cache headers for development', async () => {
    const response = await app.request('/api/hello', {}, mockEnv)

    expect(response.status).toBe(200)

    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBeTruthy()
  })
})