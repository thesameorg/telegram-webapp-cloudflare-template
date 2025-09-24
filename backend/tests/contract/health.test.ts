import { describe, it, expect } from 'vitest'

describe('GET /health', () => {
  it('should return service health status', async () => {
    const response = await fetch('http://localhost:8787/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const result = await response.json() as any
    expect(result).toMatchObject({
      status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
      timestamp: expect.any(String),
      environment: expect.stringMatching(/^(local|preview|prod)$/),
      version: expect.any(String)
    })
  })

  it('should return valid timestamp format', async () => {
    const response = await fetch('http://localhost:8787/health')
    const result = await response.json() as any

    expect(() => new Date(result.timestamp)).not.toThrow()
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0)
  })

  it('should return environment from configuration', async () => {
    const response = await fetch('http://localhost:8787/health')
    const result = await response.json() as any

    expect(['local', 'preview', 'prod']).toContain(result.environment)
  })

  it('should respond quickly (performance test)', async () => {
    const startTime = Date.now()
    const response = await fetch('http://localhost:8787/health')
    const endTime = Date.now()

    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000) // Should respond within 1 second
  })
})