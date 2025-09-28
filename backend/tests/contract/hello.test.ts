import { describe, it, expect } from 'vitest'
import { makeRequest, expectJsonResponse, expectValidTimestamp, expectValidEnvironment } from '../utils/test-helpers'

describe('GET /api/hello', () => {
  it('should return Hello World message with valid data', async () => {
    const response = await makeRequest('/api/hello')

    expect(response.status).toBe(200)
    expectJsonResponse(response)

    const result = await response.json() as any
    expect(result).toMatchObject({
      message: 'Hello World',
      timestamp: expect.any(String),
      environment: expect.stringMatching(/^(local|preview|prod|test)$/)
    })

    expectValidTimestamp(result.timestamp)
    expectValidEnvironment(result.environment)

    const timestamp = new Date(result.timestamp)
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - timestamp.getTime())
    expect(timeDiff).toBeLessThan(5000)
  })

  it('should not set cache headers in development', async () => {
    const response = await makeRequest('/api/hello')
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBeNull()
  })
})