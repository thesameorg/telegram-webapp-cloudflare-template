import { Context } from 'hono'

export async function healthHandler(c: Context) {
  try {
    const environment = c.env.ENVIRONMENT || 'local'
    const timestamp = new Date().toISOString()
    const version = '1.0.0'

    // Test KV storage
    let kvStatus = { available: false, error: null as string | null }
    try {
      const kv = c.env.SESSIONS
      if (kv) {
        const testKey = 'health-check'
        const testValue = { timestamp, check: 'health' }
        await kv.put(testKey, JSON.stringify(testValue))
        const result = await kv.get(testKey)
        kvStatus.available = !!result
      }
    } catch (error) {
      kvStatus.error = error instanceof Error ? error.message : 'Unknown KV error'
    }

    const status = kvStatus.available ? 'healthy' : 'degraded'

    return c.json({
      status,
      timestamp,
      environment,
      version,
      services: {
        kv: {
          available: kvStatus.available,
          error: kvStatus.error
        }
      }
    }, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Health check error:', error)
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT || 'local',
      version: '1.0.0',
      error: 'Health check failed'
    }, 500)
  }
}