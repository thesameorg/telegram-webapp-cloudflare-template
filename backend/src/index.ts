import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { handleWebhook } from './webhook'
import { helloHandler } from './api/hello'
import { healthHandler } from './api/health'

type Bindings = {
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_ADMIN_ID: string
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

// Test endpoint to send a message to admin
app.post('/api/test-message', async (c) => {
  try {
    const botToken = c.env.TELEGRAM_BOT_TOKEN
    const adminId = c.env.TELEGRAM_ADMIN_ID

    if (!botToken || !adminId) {
      return c.json({ error: 'Missing bot token or admin ID' }, 400)
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminId,
        text: `🤖 Test message from backend!\n\nTime: ${new Date().toISOString()}\nEnvironment: ${c.env.ENVIRONMENT}`
      })
    })

    const result = await response.json() as { ok: boolean; [key: string]: any }

    if (result.ok) {
      return c.json({ success: true, message: 'Test message sent!' })
    } else {
      return c.json({ error: 'Failed to send message', details: result }, 400)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: 'Internal error', details: errorMessage }, 500)
  }
})

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