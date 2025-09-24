import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { handleWebhook } from './webhook'
import { helloHandler } from './api/hello'
import { healthHandler } from './api/health'

type Bindings = {
  TELEGRAM_BOT_TOKEN: string
  WEBHOOK_SECRET?: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Bot-Api-Secret-Token']
}))

app.get('/health', healthHandler)
app.get('/api/hello', helloHandler)
app.post('/webhook', handleWebhook)

app.get('/', (c) => {
  const env = c.env.ENVIRONMENT || 'local'
  return c.json({
    message: 'Telegram Web App + Bot Template',
    environment: env,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      hello: '/api/hello',
      webhook: '/webhook'
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
  console.error('Server error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    request_id: crypto.randomUUID()
  }, 500)
})

export default app