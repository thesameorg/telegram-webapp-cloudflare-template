import { Context } from 'hono'
import { Bot, webhookCallback, Context as GrammyContext } from 'grammy'

export async function handleWebhook(c: Context) {
  const botToken = c.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return c.json({ error: 'Bot token not configured' }, 500)
  }

  const bot = new Bot(botToken)

  bot.command('start', async (ctx: GrammyContext) => {
    const firstName = ctx.from?.first_name || 'User'
    const webAppUrl = c.env.WEB_APP_URL || 'https://603419c0.twa-cf-tpl.pages.dev'

    await ctx.reply(
      `👋 Hello ${firstName}!\n\nWelcome to the Telegram Web App Template!\n\nClick the button below to open the web app:`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🚀 Open Web App",
              web_app: { url: webAppUrl }
            }
          ]]
        }
      }
    )
  })

  bot.on('message', async (ctx: GrammyContext) => {
    if (ctx.message && !ctx.message.text?.startsWith('/')) {
      await ctx.reply('Thanks for your message! Use /start to see the web app.')
    }
  })

  return webhookCallback(bot, 'hono')(c)
}