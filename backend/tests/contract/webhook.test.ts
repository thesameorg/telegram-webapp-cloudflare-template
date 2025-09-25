import { describe, it, expect } from 'vitest'
import app from '../../src/index'

// Minimal mock environment required by Hono
const mockEnv = {
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_ADMIN_ID: '123456',
  ENVIRONMENT: 'test'
}

describe('POST /webhook', () => {
  it.skip('should handle Telegram webhook signature validation', async () => {
    const response = await app.request('/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'test-secret'
      },
      body: JSON.stringify({
        update_id: 123,
        message: {
          message_id: 456,
          from: {
            id: 789,
            is_bot: false,
            first_name: 'Test'
          },
          chat: {
            id: 789,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      })
    }, mockEnv)

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result).toMatchObject({
      ok: true,
      processed_at: expect.any(String),
      update_id: 123
    })
  })

  it.skip('should respond to /start command with Hello World', async () => {
    const webhookData = {
      update_id: 123,
      message: {
        message_id: 456,
        from: {
          id: 789,
          is_bot: false,
          first_name: 'Test'
        },
        chat: {
          id: 789,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    }

    const response = await app.request('/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    }, mockEnv)

    expect(response.status).toBe(200)
  })

  it('should reject invalid webhook data', async () => {
    const response = await app.request('/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invalid: 'data'
      })
    }, mockEnv)

    expect(response.status).toBe(400)

    const result = await response.json()
    expect(result).toMatchObject({
      error: expect.any(String),
      message: expect.any(String),
      timestamp: expect.any(String)
    })
  })

  it('should handle missing content type', async () => {
    const response = await app.request('/webhook', {
      method: 'POST',
      body: 'invalid'
    }, mockEnv)

    expect(response.status).toBe(400)
  })
})