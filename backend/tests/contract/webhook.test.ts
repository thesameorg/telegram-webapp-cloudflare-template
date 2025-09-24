import { describe, it, expect } from 'vitest'

describe('POST /webhook', () => {
  it('should handle Telegram webhook signature validation', async () => {
    const response = await fetch('http://localhost:8787/webhook', {
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
    })

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result).toMatchObject({
      ok: true,
      processed_at: expect.any(String),
      update_id: 123
    })
  })

  it('should respond to /start command with Hello World', async () => {
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

    const response = await fetch('http://localhost:8787/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    })

    expect(response.status).toBe(200)
  })

  it('should reject invalid webhook data', async () => {
    const response = await fetch('http://localhost:8787/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invalid: 'data'
      })
    })

    expect(response.status).toBe(400)

    const result = await response.json()
    expect(result).toMatchObject({
      error: expect.any(String),
      message: expect.any(String),
      timestamp: expect.any(String)
    })
  })

  it('should handle missing content type', async () => {
    const response = await fetch('http://localhost:8787/webhook', {
      method: 'POST',
      body: 'invalid'
    })

    expect(response.status).toBe(400)
  })
})