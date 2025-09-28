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

app.get('/', async (c) => {
  const env = c.env.ENVIRONMENT || 'local'

  // Check KV availability for main page with detailed status
  let kvInfo = {
    available: false,
    error: null as string | null,
    status: 'unknown' as 'healthy' | 'degraded' | 'unavailable' | 'unknown',
    testResult: null as any,
    namespace: 'SESSIONS'
  }

  try {
    const kv = c.env.SESSIONS
    if (!kv) {
      kvInfo.status = 'unavailable'
      kvInfo.error = 'KV namespace not bound'
    } else {
      // Perform a write/read test
      const testKey = 'status-check'
      const testValue = { timestamp: new Date().toISOString(), check: 'main-page' }
      await kv.put(testKey, JSON.stringify(testValue))
      const result = await kv.get(testKey)

      if (result) {
        kvInfo.available = true
        kvInfo.status = 'healthy'
        kvInfo.testResult = JSON.parse(result)
      } else {
        kvInfo.status = 'degraded'
        kvInfo.error = 'Read test failed'
      }
    }
  } catch (error) {
    kvInfo.error = error instanceof Error ? error.message : 'Unknown error'
    kvInfo.available = false
    kvInfo.status = 'degraded'
  }

  return c.json({
    message: 'Telegram Web App + Bot Template',
    environment: env,
    timestamp: new Date().toISOString(),
    kvStatus: `KV status: ${kvInfo.status} (${kvInfo.namespace})${kvInfo.error ? ' - ' + kvInfo.error : ''}`,
    services: {
      kv: {
        available: kvInfo.available,
        status: kvInfo.status,
        error: kvInfo.error,
        namespace: kvInfo.namespace,
        lastTest: kvInfo.testResult
      }
    },
    endpoints: {
      health: '/api/health',
      hello: '/api/hello',
      webhook: '/webhook',
      auth: '/api/auth'
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

// Simple error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong'
  }, 500);
})

export default app