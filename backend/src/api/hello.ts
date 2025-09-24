import { Context } from 'hono'

export async function helloHandler(c: Context) {
  try {
    const environment = c.env.ENVIRONMENT || 'local'
    const timestamp = new Date().toISOString()

    return c.json({
      message: 'Hello World',
      timestamp,
      environment
    }, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Hello endpoint error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to generate hello response',
      timestamp: new Date().toISOString()
    }, 500)
  }
}