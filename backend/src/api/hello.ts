import { Context } from 'hono'

export async function helloHandler(c: Context) {
  return c.json({
    message: 'Hello World',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'local'
  })
}