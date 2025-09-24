import { describe, it, expect } from 'vitest'

describe('GET /api/hello', () => {
  it('should return Hello World message', async () => {
    const response = await fetch('http://localhost:8787/api/hello')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const result = await response.json()
    expect(result).toMatchObject({
      message: 'Hello World',
      timestamp: expect.any(String),
      environment: expect.stringMatching(/^(local|preview|prod)$/)
    })
  })

  it('should return valid timestamp', async () => {
    const response = await fetch('http://localhost:8787/api/hello')
    const result = await response.json()

    expect(() => new Date(result.timestamp)).not.toThrow()

    const timestamp = new Date(result.timestamp)
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - timestamp.getTime())

    expect(timeDiff).toBeLessThan(5000) // Within 5 seconds
  })

  it('should include correct environment information', async () => {
    const response = await fetch('http://localhost:8787/api/hello')
    const result = await response.json()

    expect(['local', 'preview', 'prod']).toContain(result.environment)
  })

  it('should handle CORS preflight requests', async () => {
    const response = await fetch('http://localhost:8787/api/hello', {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
  })

  it('should respond with proper cache headers for development', async () => {
    const response = await fetch('http://localhost:8787/api/hello')

    expect(response.status).toBe(200)

    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBeTruthy()
  })
})