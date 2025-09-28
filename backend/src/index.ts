import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { handleWebhook } from './webhook'
import { helloHandler } from './api/hello'
import { healthHandler } from './api/health'
import { authHandler } from './api/auth'
import type { Env } from './types/env'

const app = new Hono<{ Bindings: Env }>()


// Simple middleware
app.use('*', prettyJSON())

// API endpoints
app.get('/api/health', healthHandler)
app.get('/api/hello', helloHandler)
app.post('/webhook', handleWebhook)

// Authentication endpoints
app.get('/api/auth', authHandler)
app.post('/api/auth', authHandler)


app.get('/', async (c) => {
  const env = c.env.ENVIRONMENT || 'local'

  let kvStatus = 'unknown'
  try {
    const kv = c.env.SESSIONS
    if (kv) {
      await kv.get('ping')
      kvStatus = 'healthy'
    } else {
      kvStatus = 'unavailable'
    }
  } catch {
    kvStatus = 'error'
  }

  return c.json({
    message: 'Telegram Web App + Bot Template',
    environment: env,
    timestamp: new Date().toISOString(),
    services: { kv: kvStatus },
    endpoints: {
      health: '/api/health',
      hello: '/api/hello',
      webhook: '/webhook',
      auth: '/api/auth',
    }
  })
})

app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString()
  }, 404)
})

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong'
  }, 500);
})

export default app