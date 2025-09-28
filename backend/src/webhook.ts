import { Context } from 'hono'
import { Bot, webhookCallback, Context as GrammyContext } from 'grammy'

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

    // Validate content type
    const contentType = c.req.header('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return c.json({
        error: 'Bad Request',
        message: 'Content-Type must be application/json',
        timestamp: new Date().toISOString()
      }, 400)
    }

    // Parse and validate webhook body
    let webhookData
    try {
      webhookData = await c.req.json()
    } catch {
      return c.json({
        error: 'Bad Request',
        message: 'Invalid JSON in request body',
        timestamp: new Date().toISOString()
      }, 400)
    }

    // Basic validation of webhook structure
    if (!webhookData || typeof webhookData.update_id === 'undefined') {
      return c.json({
        error: 'Bad Request',
        message: 'Invalid webhook data: missing update_id',
        timestamp: new Date().toISOString()
      }, 400)
    }

    // Create bot instance only after validation
    const bot = new Bot(botToken)

    // Handle /start command
    bot.command('start', async (ctx: GrammyContext) => {
      const firstName = ctx.from?.first_name || 'User'
      const webAppUrl = 'https://603419c0.twa-cf-tpl.pages.dev'

      const text = `👋 Hello ${firstName}!\n\nWelcome to the Telegram Web App Template!\n\nClick the button below to open the web app:`

      await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🚀 Open Web App",
              web_app: { url: webAppUrl }
            }
          ]]
        }
      })
    })

    // Handle other messages
    bot.on('message', async (ctx: GrammyContext) => {
      if (ctx.message && !ctx.message.text?.startsWith('/')) {
        await ctx.reply('Thanks for your message! Use /start to see the web app.')
      }
    })

    // Create webhook callback that's compatible with Hono
    const handleUpdate = webhookCallback(bot, 'hono')

    // Call the Grammy webhook handler
    return await handleUpdate(c)

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