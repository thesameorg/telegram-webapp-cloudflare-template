import { describe, it, expect } from 'vitest'
import { makeRequest, expectJsonResponse, expectValidTimestamp, expectValidEnvironment } from '../utils/test-helpers'

describe('GET /api/health', () => {
  it('should return complete health status with valid data', async () => {
    const response = await makeRequest('/api/health')

    expect(response.status).toBe(200)
    expectJsonResponse(response)

    const result = await response.json() as any
    expect(result).toMatchObject({
      status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
      timestamp: expect.any(String),
      environment: expect.stringMatching(/^(local|preview|prod|test)$/),
      version: expect.any(String)
    })

    expectValidTimestamp(result.timestamp)
    expectValidEnvironment(result.environment)
  })

  it('should respond quickly', async () => {
    const startTime = Date.now()
    const response = await makeRequest('/api/health')
    const endTime = Date.now()

    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })
})