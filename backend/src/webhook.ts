import { Context } from 'hono'
import { z } from 'zod'

const TelegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional()
})

const TelegramChatSchema = z.object({
  id: z.number(),
  type: z.enum(['private', 'group', 'supergroup', 'channel']),
  title: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional()
})

const TelegramMessageSchema = z.object({
  message_id: z.number(),
  from: TelegramUserSchema,
  chat: TelegramChatSchema,
  date: z.number(),
  text: z.string().optional(),
  web_app_data: z.object({
    data: z.string(),
    button_text: z.string()
  }).optional()
})

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
  callback_query: z.object({
    id: z.string(),
    from: TelegramUserSchema,
    message: TelegramMessageSchema.optional(),
    data: z.string().optional()
  }).optional()
})

type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>

async function sendTelegramMessage(botToken: string, chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...(replyMarkup && { reply_markup: replyMarkup })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text())
    throw new Error(`Telegram API error: ${response.status}`)
  }

  return response.json()
}

async function handleStartCommand(botToken: string, chatId: number, firstName: string) {
  const webAppUrl = 'https://your-app.pages.dev' // This will be updated with actual deployment URL

  const text = `👋 Hello ${firstName}!\n\nWelcome to the Telegram Web App Template!\n\nClick the button below to open the web app:`

  const replyMarkup = {
    inline_keyboard: [[
      {
        text: "🚀 Open Web App",
        web_app: { url: webAppUrl }
      }
    ]]
  }

  await sendTelegramMessage(botToken, chatId, text, replyMarkup)
}

export async function handleWebhook(c: Context) {
  try {
    const botToken = c.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error('Missing TELEGRAM_BOT_TOKEN environment variable')
      return c.json({
        error: 'Configuration Error',
        message: 'Bot token not configured',
        timestamp: new Date().toISOString()
      }, 500)
    }

    const contentType = c.req.header('content-type')
    if (!contentType?.includes('application/json')) {
      return c.json({
        error: 'Bad Request',
        message: 'Content-Type must be application/json',
        timestamp: new Date().toISOString()
      }, 400)
    }

    let body
    try {
      body = await c.req.json()
    } catch (error) {
      return c.json({
        error: 'Bad Request',
        message: 'Invalid JSON in request body',
        timestamp: new Date().toISOString()
      }, 400)
    }

    const parseResult = TelegramUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      console.error('Invalid webhook data:', parseResult.error)
      return c.json({
        error: 'Bad Request',
        message: 'Invalid webhook data format',
        timestamp: new Date().toISOString()
      }, 400)
    }

    const update: TelegramUpdate = parseResult.data

    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id
      const firstName = update.message.from.first_name

      await handleStartCommand(botToken, chatId, firstName)
    }

    return c.json({
      ok: true,
      processed_at: new Date().toISOString(),
      update_id: update.update_id
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to process webhook',
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID()
    }, 500)
  }
}