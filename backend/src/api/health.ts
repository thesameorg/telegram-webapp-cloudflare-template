import { Context } from 'hono'

export async function healthHandler(c: Context) {
  try {
    const environment = c.env.ENVIRONMENT || 'local'
    const timestamp = new Date().toISOString()

    const botToken = c.env.TELEGRAM_BOT_TOKEN
    const status = botToken ? 'healthy' : 'degraded'

    const version = '1.0.0'

    return c.json({
      status,
      timestamp,
      environment,
      version
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