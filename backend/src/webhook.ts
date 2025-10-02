import { Context } from 'hono'
import { Bot, webhookCallback, Context as GrammyContext } from 'grammy'
import { createDatabase } from './db'
import { PaymentService } from './services/payment-service'
import { sendPaymentSuccessNotification, sendAdminPaymentAlert, sendPaymentRefundNotification, sendAdminRefundAlert } from './services/notification-service'
import { posts, payments } from './db/schema'
import { eq } from 'drizzle-orm'

export async function handleWebhook(c: Context) {
  const botToken = c.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return c.json({ error: 'Bot token not configured' }, 500)
  }

  const bot = new Bot(botToken)

  bot.command('start', async (ctx: GrammyContext) => {
    const firstName = ctx.from?.first_name || 'User'

    await ctx.reply(
      `👋 Hello ${firstName}!\n\nWelcome to the Telegram Web App Template!\n\nhttps://github.com/garootman/telegram-webapp-cloudflare-template/`
    )
  })

  bot.command('repo', async (ctx: GrammyContext) => {
    await ctx.reply(
      'https://github.com/garootman/telegram-webapp-cloudflare-template/'
    )
  })

  // Payment webhook handlers (MUST be before generic message handler)
  bot.on('pre_checkout_query', async (ctx: GrammyContext) => {
    console.log('📋 Received pre_checkout_query')
    try {
      if (!ctx.preCheckoutQuery) {
        return;
      }
      const { invoice_payload } = ctx.preCheckoutQuery

      // Parse payload
      const payload = JSON.parse(invoice_payload)
      const { postId, userId } = payload

      const db = createDatabase(c.env.DB)
      const paymentService = new PaymentService(db, c.env)

      // Get the payment record
      const payment = await paymentService.getPaymentByInvoicePayload(invoice_payload)
      if (!payment) {
        await ctx.answerPreCheckoutQuery(false, {
          error_message: 'Payment record not found'
        })
        return
      }

      // Get the post
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1)

      // Validate:
      // 1. Post exists
      if (!post) {
        await ctx.answerPreCheckoutQuery(false, {
          error_message: 'Post not found'
        })
        return
      }

      // 2. Post not already premium (star_count === 0)
      if (post.starCount && post.starCount > 0) {
        await ctx.answerPreCheckoutQuery(false, {
          error_message: 'Post is already premium'
        })
        return
      }

      // 3. User owns the post
      if (post.userId !== userId) {
        await ctx.answerPreCheckoutQuery(false, {
          error_message: 'Unauthorized'
        })
        return
      }

      // All validations passed
      console.log('✅ pre_checkout_query validation passed')
      await ctx.answerPreCheckoutQuery(true)
    } catch (error) {
      console.error('❌ Error in pre_checkout_query handler:', error)
      await ctx.answerPreCheckoutQuery(false, {
        error_message: 'Payment validation failed'
      })
    }
  })

  bot.on('message:successful_payment', async (ctx: GrammyContext) => {
    console.log('💰 Received successful_payment message')
    try {
      const payment = ctx.message?.successful_payment
      if (!payment) {
        console.error('❌ No successful_payment in message')
        return
      }
      console.log('💳 Processing payment:', { telegram_payment_charge_id: payment.telegram_payment_charge_id, total_amount: payment.total_amount })

      const {
        telegram_payment_charge_id,
        provider_payment_charge_id,
        invoice_payload,
        total_amount
      } = payment

      const db = createDatabase(c.env.DB)
      const paymentService = new PaymentService(db, c.env)

      // Idempotency check: already processed?
      if (telegram_payment_charge_id) {
        const existing = await paymentService.getPaymentByChargeId(telegram_payment_charge_id)
        if (existing && existing.status === 'succeeded') {
          console.log('Payment already processed:', telegram_payment_charge_id)
          return
        }
      }

      // Parse payload
      const payload = JSON.parse(invoice_payload)
      const { postId, userId, paymentId } = payload

      // Atomic update with db.batch()
      const now = new Date().toISOString()
      await db.batch([
        db.update(payments)
          .set({
            status: 'succeeded',
            telegramPaymentChargeId: telegram_payment_charge_id,
            providerPaymentChargeId: provider_payment_charge_id,
            rawUpdate: JSON.stringify(ctx.message),
            updatedAt: now,
          })
          .where(eq(payments.id, paymentId)),

        db.update(posts)
          .set({
            starCount: total_amount,
            paymentId: paymentId,
            isPaymentPending: 0, // Clear pending flag
            updatedAt: now,
          })
          .where(eq(posts.id, postId))
      ])

      // Send notifications
      await sendPaymentSuccessNotification(c.env, userId, postId, total_amount)
      await sendAdminPaymentAlert(c.env, {
        userId,
        postId,
        starAmount: total_amount,
        chargeId: telegram_payment_charge_id || 'unknown',
      })

      console.log(`✅ Payment succeeded: user=${userId}, post=${postId}, stars=${total_amount}`)
    } catch (error) {
      console.error('❌ Error in successful_payment handler:', error)
    }
  })

  bot.on('message:refunded_payment', async (ctx: GrammyContext) => {
    console.log('↩️ Received refunded_payment message')
    try {
      const refundedPayment = ctx.message?.refunded_payment
      if (!refundedPayment) {
        console.error('❌ No refunded_payment in message')
        return
      }

      const { telegram_payment_charge_id, total_amount } = refundedPayment
      console.log('💳 Processing refund:', { telegram_payment_charge_id, total_amount })

      if (!telegram_payment_charge_id) {
        console.error('❌ Missing telegram_payment_charge_id in refunded_payment')
        return
      }

      const db = createDatabase(c.env.DB)
      const paymentService = new PaymentService(db, c.env)

      // Idempotency check: find payment by charge ID
      const payment = await paymentService.getPaymentByChargeId(telegram_payment_charge_id)
      if (!payment) {
        console.warn(`⚠️ Payment not found for charge ID: ${telegram_payment_charge_id}`)
        return
      }

      // Skip if already refunded
      if (payment.status === 'refunded') {
        console.log(`⏭️ Payment already refunded: ${payment.id}`)
        return
      }

      // Atomic update: payment status + revert post
      const now = new Date().toISOString()

      // Update payment status
      await db.update(payments)
        .set({
          status: 'refunded',
          rawUpdate: JSON.stringify(ctx.message),
          updatedAt: now,
        })
        .where(eq(payments.id, payment.id))

      // Revert post if it exists
      if (payment.postId !== null) {
        await db.update(posts)
          .set({
            starCount: 0,
            paymentId: null,
            updatedAt: now,
          })
          .where(eq(posts.id, payment.postId))
      }

      // Send notifications
      await sendPaymentRefundNotification(c.env, payment.userId, payment.postId ?? 0, payment.starAmount)
      await sendAdminRefundAlert(c.env, {
        userId: payment.userId,
        postId: payment.postId ?? 0,
        starAmount: payment.starAmount,
        chargeId: telegram_payment_charge_id,
      })

      console.log(`✅ Refund processed: user=${payment.userId}, post=${payment.postId ?? 'N/A'}, stars=${payment.starAmount}`)
    } catch (error) {
      console.error('❌ Error in refunded_payment handler:', error)
    }
  })

  // Generic message handler (MUST be after payment handlers to avoid interfering)
  bot.on('message:text', async (ctx: GrammyContext) => {
    if (ctx.message && !ctx.message.text?.startsWith('/')) {
      await ctx.reply('Thanks for your message! Use /start to see the web app.')
    }
  })

  return webhookCallback(bot, 'hono')(c)
}