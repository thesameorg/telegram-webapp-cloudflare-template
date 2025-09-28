import { Context } from 'hono'

export async function healthHandler(c: Context) {
  try {
    const timestamp = new Date().toISOString()
    let kvStatus = { available: false, error: null as string | null }

    try {
      kvStatus.available = !!c.env.SESSIONS
    } catch (error) {
      kvStatus.error = error instanceof Error ? error.message : 'Unknown KV error'
    }

    return c.json({
      status: kvStatus.available ? 'healthy' : 'degraded',
      timestamp,
      environment: c.env.ENVIRONMENT || 'local',
      version: '1.0.0',
      services: { kv: kvStatus }
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