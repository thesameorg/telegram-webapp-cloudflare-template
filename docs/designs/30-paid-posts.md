# Design Document: Paid Posts with Telegram Stars

**Feature**: Allow users to make posts "premium" by paying Telegram Stars
**Document Version**: 1.0
**Date**: 2025-10-01

---

## Table of Contents
1. [Feasibility Check](#feasibility-check)
2. [Fit-Gap Analysis](#fit-gap-analysis)
3. [Implementation Plan](#implementation-plan)
4. [Technical Specifications](#technical-specifications)

---

## Feasibility Check

### ✅ Telegram Stars API Compatibility

**Status**: FEASIBLE

- **Grammy Support**: Grammy bot framework supports `bot.api.createInvoiceLink()` method
- **Stars Payment**: Currency "XTR" with empty provider_token is supported
- **Payment Flow**: pre_checkout_query → answerPreCheckoutQuery → successful_payment webhook flow is standard
- **WebApp Integration**: `window.Telegram.WebApp.openInvoice(url, callback)` is available for in-app payment UX

**Payment Flow Validation**:
```
1. Backend: bot.api.createInvoiceLink({ currency: "XTR", provider_token: "", ... })
2. Frontend: Telegram.WebApp.openInvoice(invoiceUrl, (status) => {...})
3. User pays in Telegram Stars overlay (stays in app)
4. Backend webhook: receives pre_checkout_query (validate, respond within 10s)
5. Backend webhook: receives successful_payment (finalize transaction)
```

### ✅ D1 Transaction Support

**Status**: FEASIBLE (with caveats)

- **D1 Batch Operations**: Available and act as atomic transactions
- **Rollback Support**: If any statement in batch fails, entire batch rolls back
- **Limitation**: No interactive BEGIN/COMMIT transactions (by design)
- **Solution**: Use `db.batch([stmt1, stmt2, stmt3])` for atomic payment + post update

**Transaction Pattern**:
```typescript
await db.batch([
  db.update(payments).set({ status: 'succeeded', ... }).where(...),
  db.update(posts).set({ star_count: X, payment_id: Y }).where(...)
]);
```

### ✅ Architecture Compatibility

**Status**: FEASIBLE

- **Cloudflare Workers**: Stateless design suits webhook handling
- **Grammy Bot**: Already integrated, can extend with payment handlers
- **React TWA**: Telegram WebApp SDK already in use
- **Drizzle ORM**: Supports schema migrations and batch operations
- **R2/KV/D1**: All services available and operational

### ⚠️ Potential Risks

1. **Webhook Reliability**: Telegram may retry webhooks → Need idempotency key (telegram_payment_charge_id)
2. **10s Timeout**: pre_checkout_query requires response within 10 seconds → Keep validation simple
3. **Payment State**: User may close app during payment → Handle pending states gracefully
4. **Invoice Reuse**: Same invoice link can be used multiple times → Validate on backend

**Mitigation**:
- Use telegram_payment_charge_id as unique constraint
- Cache balance API calls (5min TTL)
- Store raw webhook payload for debugging
- Implement proper pending state handling

---

## Fit-Gap Analysis

### Existing Components

#### Backend ✅
- Hono.js HTTP framework
- Grammy bot with webhook handler (backend/src/webhook.ts)
- Posts API endpoints (CRUD) (backend/src/api/posts.ts)
- Post service (backend/src/services/post-service.ts)
- Notification service pattern (backend/src/services/notification-service.ts)
- Admin authentication (backend/src/services/admin-auth.ts)
- Session management via KV
- Database with Drizzle ORM (backend/src/db/schema.ts)

#### Frontend ✅
- PostItem component for displaying posts (frontend/src/components/PostItem.tsx)
- PostFormModal for create/edit (frontend/src/components/PostFormModal.tsx)
- Toast notification system
- Telegram WebApp SDK integration
- Bottom navigation with Feed/Profile/Admin tabs

#### Database ✅
- D1 with Drizzle schema
- posts table (id, userId, username, displayName, content, createdAt, updatedAt)
- userProfiles table
- postImages table

### Missing Components (Gaps)

#### Backend 🔴
1. **payments table** - New table with full schema
2. **PaymentService** - Business logic for payment lifecycle
3. **Payment API endpoints**:
   - POST /api/posts/:postId/make-premium
   - GET /api/payments (admin)
   - GET /api/payments/balance (admin, cached)
4. **Webhook payment handlers**:
   - pre_checkout_query handler
   - successful_payment handler
5. **Payment notifications**:
   - User: payment success/failure
   - Admin: new payment alert via bot message
6. **Database migration**:
   - Add star_count (integer, default 0) to posts table
   - Add payment_id (text, nullable) to posts table

#### Frontend 🔴
1. **"Make Premium" button** on PostItem (only for own posts)
2. **Star selector UI** (0-10 stars slider/picker)
3. **Premium post styling**:
   - Golden gradient border/background based on star_count (1-10)
   - Linear interpolation for brightness
4. **Star count badge** (⭐️ emoji + count)
5. **Payment loading state** (rotating spinner overlay)
6. **Admin Payments page**:
   - List all payments (paginated)
   - Show: amount, status, user link, post link, date, telegram_payment_charge_id
   - Bot balance display (top of page, cached)
   - Refresh balance button
7. **WebApp.openInvoice() integration**

#### Database 🔴
1. **payments table** (full schema below)
2. **posts table columns**:
   - star_count: integer, default 0
   - payment_id: text, nullable
   - is_payment_pending: integer, default 0 (0 or 1 flag to avoid N+1 queries for payment status)

---

## Implementation Plan

### Phase 1: Database Schema (Sprint 1)

**Tasks**:
1. Create payments table migration
2. Add star_count and payment_id columns to posts table
3. Test migration in local D1

**Deliverables**:
- `backend/src/db/schema.ts` updated with payments table
- Migration scripts

**Dependencies**: None

---

### Phase 2: Backend Payment Service (Sprint 1)

**Tasks**:
1. Create PaymentService class (backend/src/services/payment-service.ts)
   - createPayment(userId, postId, starAmount)
   - getPaymentByInvoicePayload(payload)
   - updatePaymentStatus(paymentId, status, webhookData)
   - getPaymentsByUser(userId)
   - getAllPayments(limit, offset) - admin only
2. Add payment notification functions (backend/src/services/notification-service.ts)
   - sendPaymentSuccessNotification(userId, postId, starCount)
   - sendPaymentFailureNotification(userId, reason)
   - sendAdminPaymentAlert(adminId, paymentDetails)

**Deliverables**:
- PaymentService with full CRUD
- Notification functions

**Dependencies**: Phase 1 (database schema)

---

### Phase 3: Backend Payment API (Sprint 1)

**Tasks**:
1. Create payment API endpoints (backend/src/api/payments.ts)
   - POST /api/posts/:postId/make-premium
     - Auth: user session required
     - Body: { star_count: number (1-10) }
     - Logic: Create payment record, set post.is_payment_pending=1, generate invoice link, return { invoice_url }
   - POST /api/posts/:postId/clear-pending
     - Auth: user session required
     - Logic: Clear is_payment_pending flag (called when payment cancelled/failed)
   - GET /api/payments (admin only)
     - Query params: limit, offset
     - Returns paginated payment list
   - GET /api/payments/balance (admin only)
     - Returns cached bot star balance + transaction count
     - Cache: 5 minutes
2. Wire up routes in backend/src/index.ts

**Deliverables**:
- Payment API endpoints
- Route configuration

**Dependencies**: Phase 2 (PaymentService)

---

### Phase 4: Backend Webhook Handlers (Sprint 1)

**Tasks**:
1. Extend webhook.ts with payment handlers
   - bot.on('pre_checkout_query', handler)
     - Validate invoice_payload (check post exists, not already paid)
     - answerPreCheckoutQuery(ok: true/false)
     - Must respond within 10 seconds
   - bot.on('successful_payment', handler)
     - Parse telegram_payment_charge_id (idempotency key)
     - Use db.batch() for atomic update:
       - Update payment status to 'succeeded'
       - Update post star_count, payment_id, and is_payment_pending (set to 0)
     - Send notifications (user + admin)
2. Add webhook error handling
3. Test with Telegram Bot API test payments

**Deliverables**:
- pre_checkout_query handler
- successful_payment handler
- Error handling

**Dependencies**: Phase 3 (API endpoints)

---

### Phase 5: Frontend Premium Post Display (Sprint 2)

**Tasks**:
1. Update PostItem component:
   - Add golden gradient styling based on star_count (1-10)
   - Linear interpolation: star_count=1 → light gold, star_count=10 → bright gold
   - Add star badge (⭐️ + count) in header
   - Add loading spinner overlay when is_payment_pending=1
   - Style: border or background gradient (decide based on design)
2. Update Post interface to include star_count, payment_id, and is_payment_pending

**Deliverables**:
- Premium post visual styling
- Star count badge

**Dependencies**: None (can work in parallel)

---

### Phase 6: Frontend "Make Premium" Flow (Sprint 2)

**Tasks**:
1. Add "Make Premium" button to PostItem:
   - Only show for own posts
   - Only show if post.star_count === 0 (not already premium)
   - Position: near Edit/Delete buttons
2. Create MakePremiumModal component:
   - Star selector UI (0-10 range input or buttons)
   - Show preview of golden gradient
   - Show cost in stars
   - Cancel/Confirm buttons
3. Implement payment flow:
   - On confirm: POST /api/posts/:postId/make-premium
   - Get invoice_url from response
   - Call Telegram.WebApp.openInvoice(invoice_url, callback)
   - Show loading overlay during payment
   - On callback status='paid': Show success toast, refresh posts
   - On callback status='failed': Show error toast

**Deliverables**:
- "Make Premium" button
- MakePremiumModal component
- Payment flow integration

**Dependencies**: Phase 3 (API endpoints), Phase 5 (styling)

---

### Phase 7: Frontend Admin Payments Page (Sprint 2)

**Tasks**:
1. Create Payments page component (frontend/src/pages/Payments.tsx)
   - Add route in Router
   - Add navigation item in BottomNavigation (admin only)
2. Implement payments list:
   - Fetch GET /api/payments with pagination
   - Display table/list with columns:
     - Star amount
     - Status (badge with color coding)
     - User (link to profile)
     - Post (link to post)
     - Date
     - telegram_payment_charge_id
     - provider_payment_charge_id
   - Pagination controls
3. Add bot balance display:
   - Fetch GET /api/payments/balance
   - Show at top: "Bot Balance: X ⭐️"
   - Add "Refresh" button (clears cache)
4. Add loading states and error handling

**Deliverables**:
- Admin Payments page
- Bot balance display
- Pagination

**Dependencies**: Phase 3 (API endpoints)

---

### Phase 8: Testing & QA (Sprint 3)

**Tasks**:
1. Backend unit tests:
   - PaymentService methods
   - Payment API endpoints
   - Webhook handlers (mock Grammy context)
2. Frontend component tests:
   - PostItem premium styling
   - MakePremiumModal
   - Payments page
3. Integration tests:
   - End-to-end payment flow (use Telegram test environment)
   - Webhook idempotency (send duplicate successful_payment)
   - Error scenarios (insufficient stars, cancelled payment)
4. Manual QA:
   - Create premium post
   - Verify notifications
   - Check admin panel
   - Test edge cases

**Deliverables**:
- Test suite
- QA report

**Dependencies**: All previous phases

---

## Technical Specifications

### Database Schema

#### payments table
```typescript
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(), // UUID
  invoicePayload: text('invoice_payload').notNull().unique(),
  telegramPaymentChargeId: text('telegram_payment_charge_id').unique(), // Idempotency key
  providerPaymentChargeId: text('provider_payment_charge_id'),
  userId: integer('user_id').notNull(), // Telegram ID
  postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
  starAmount: integer('star_amount').notNull(),
  status: text('status').notNull(), // 'created' | 'pending' | 'succeeded' | 'failed' | 'refunded'
  rawUpdate: text('raw_update'), // JSON string of full webhook payload
  meta: text('meta'), // JSON string for additional data
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  userIdIdx: index('idx_payments_user_id').on(table.userId),
  postIdIdx: index('idx_payments_post_id').on(table.postId),
  statusIdx: index('idx_payments_status').on(table.status),
  createdAtIdx: index('idx_payments_created_at').on(table.createdAt),
}));
```

#### posts table updates
```typescript
export const posts = sqliteTable('posts', {
  // ... existing columns
  starCount: integer('star_count').default(0).notNull(),
  paymentId: text('payment_id').references(() => payments.id),
  isPaymentPending: integer('is_payment_pending').default(0).notNull(), // 0 or 1
});
```

**Note on `is_payment_pending`**: This flag prevents N+1 queries when fetching posts. Instead of joining payments table to check status, we can directly see if payment is in progress. States:
- `is_payment_pending = 1` → Show loading spinner
- `is_payment_pending = 0` + `star_count > 0` → Payment succeeded
- `is_payment_pending = 0` + `star_count = 0` → No payment or failed

### API Endpoints

#### POST /api/posts/:postId/make-premium
**Request**:
```json
{
  "star_count": 5
}
```

**Response** (200):
```json
{
  "success": true,
  "invoice_url": "https://t.me/$...",
  "payment_id": "uuid"
}
```

**Side Effects**:
- Creates payment record with status='created'
- Sets post.is_payment_pending=1 (so UI shows loading state)
- Generates invoice link via bot.api.createInvoiceLink()

**Errors**:
- 400: Invalid star_count (must be 1-10)
- 401: Not authenticated
- 403: Not post owner
- 404: Post not found
- 409: Post already premium (star_count > 0 or is_payment_pending=1)

#### GET /api/payments (Admin only)
**Query params**: `limit`, `offset`

**Response** (200):
```json
{
  "payments": [
    {
      "id": "uuid",
      "userId": 123456,
      "username": "johndoe",
      "postId": 789,
      "starAmount": 5,
      "status": "succeeded",
      "telegramPaymentChargeId": "tg_charge_123",
      "providerPaymentChargeId": "provider_123",
      "createdAt": "2025-10-01T12:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### GET /api/payments/balance (Admin only)
**Response** (200):
```json
{
  "star_balance": 1234,
  "cached_at": "2025-10-01T12:00:00Z",
  "expires_at": "2025-10-01T12:05:00Z"
}
```

#### POST /api/posts/:postId/clear-pending
**Purpose**: Clear is_payment_pending flag when payment is cancelled/failed (called from frontend)

**Request**: Empty body

**Response** (200):
```json
{
  "success": true
}
```

**Errors**:
- 401: Not authenticated
- 403: Not post owner
- 404: Post not found

### Webhook Handlers

**Note**: If payment is cancelled or fails, the `is_payment_pending` flag should be cleared after a timeout (e.g., 10 minutes) or when user tries to make premium again. Alternatively, the frontend callback can call a `/api/posts/:postId/clear-pending` endpoint on failure.

#### pre_checkout_query
```typescript
bot.on('pre_checkout_query', async (ctx) => {
  const { invoice_payload, from } = ctx.preCheckoutQuery;

  // Parse payload: { postId, userId, timestamp }
  const payload = JSON.parse(invoice_payload);

  // Validate:
  // 1. Post exists
  // 2. Post not already premium (star_count === 0)
  // 3. User owns post (or payment intent is valid)

  const isValid = await validatePayment(payload);

  if (isValid) {
    await ctx.answerPreCheckoutQuery(true);
  } else {
    await ctx.answerPreCheckoutQuery(false, {
      error_message: "Post is no longer available for upgrade"
    });
  }
});
```

#### successful_payment
```typescript
bot.on('message:successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  const {
    telegram_payment_charge_id,
    provider_payment_charge_id,
    invoice_payload,
    currency, // "XTR"
    total_amount
  } = payment;

  // Idempotency check: already processed?
  const existing = await paymentService.getPaymentByChargeId(telegram_payment_charge_id);
  if (existing) {
    console.log('Payment already processed:', telegram_payment_charge_id);
    return;
  }

  // Parse payload
  const payload = JSON.parse(invoice_payload);
  const { postId, userId, paymentId } = payload;

  // Atomic update with db.batch()
  await db.batch([
    db.update(payments)
      .set({
        status: 'succeeded',
        telegramPaymentChargeId: telegram_payment_charge_id,
        providerPaymentChargeId: provider_payment_charge_id,
        rawUpdate: JSON.stringify(ctx.message),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(payments.id, paymentId)),

    db.update(posts)
      .set({
        starCount: total_amount, // Amount is in stars
        paymentId: paymentId,
        isPaymentPending: 0, // Clear pending flag
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, postId))
  ]);

  // Send notifications
  await sendPaymentSuccessNotification(userId, postId, total_amount);
  await sendAdminPaymentAlert(env.TELEGRAM_ADMIN_ID, {
    userId,
    postId,
    starAmount: total_amount,
    chargeId: telegram_payment_charge_id,
  });
});
```

### Frontend Payment Flow

```typescript
// In PostItem component
const handleMakePremium = async (starCount: number) => {
  setIsPaymentLoading(true);

  try {
    // 1. Create payment and get invoice URL
    const response = await fetch(`/api/posts/${post.id}/make-premium`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`,
      },
      body: JSON.stringify({ star_count: starCount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment');
    }

    const { invoice_url } = await response.json();

    // 2. Open invoice with Telegram WebApp
    window.Telegram.WebApp.openInvoice(invoice_url, async (status) => {
      setIsPaymentLoading(false);

      if (status === 'paid') {
        showToast('Payment successful! Your post is now premium ⭐️', 'success');
        onRefresh(); // Refresh post list
      } else if (status === 'cancelled' || status === 'failed') {
        // Clear pending flag
        await fetch(`/api/posts/${post.id}/clear-pending`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionId}` },
        });

        showToast(status === 'cancelled' ? 'Payment cancelled' : 'Payment failed', 'info');
        onRefresh(); // Refresh to clear loading state
      }
    });
  } catch (error) {
    setIsPaymentLoading(false);
    showToast(error.message, 'error');
  }
};
```

### Premium Post Styling

```typescript
// Calculate golden gradient based on star_count (1-10)
const getGoldenGradient = (starCount: number) => {
  if (starCount === 0) return null;

  // Linear interpolation from light gold to bright gold
  const intensity = starCount / 10;
  const lightGold = '#FFD700'; // Light gold
  const brightGold = '#FFA500'; // Bright gold

  // CSS gradient
  return {
    borderImage: `linear-gradient(135deg, ${lightGold}, ${brightGold}) 1`,
    borderWidth: '2px',
    borderStyle: 'solid',
    boxShadow: `0 0 ${10 + starCount * 2}px rgba(255, 215, 0, ${0.3 + intensity * 0.4})`,
  };
};

// In PostItem render
<div
  className={`post-item ${post.starCount > 0 ? 'premium' : ''}`}
  style={post.starCount > 0 ? getGoldenGradient(post.starCount) : undefined}
>
  {/* Post header */}
  {post.starCount > 0 && (
    <div className="star-badge">
      ⭐️ {post.starCount}
    </div>
  )}
  {/* Rest of post content */}
</div>
```

### Caching Strategy

**Bot Balance Cache** (KV):
- Key: `bot_star_balance`
- TTL: 5 minutes (300 seconds)
- Value: `{ balance: number, cached_at: string }`

```typescript
async function getBotStarBalance(env: Env): Promise<number> {
  const cached = await env.SESSIONS.get('bot_star_balance', 'json');

  if (cached && Date.now() - cached.cached_at < 300000) {
    return cached.balance;
  }

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const balance = await bot.api.getStarTransactions();

  await env.SESSIONS.put('bot_star_balance', JSON.stringify({
    balance: balance.balance,
    cached_at: Date.now(),
  }), { expirationTtl: 300 });

  return balance.balance;
}
```

---

## Security Considerations

1. **Webhook Validation**: Verify X-Telegram-Bot-Api-Secret-Token header (set via setWebhook)
2. **Idempotency**: Use telegram_payment_charge_id to prevent duplicate processing
3. **Authorization**: Only post owner can make post premium, only admin can view payments
4. **Input Validation**: Validate star_count (1-10), post ownership, post not already premium
5. **Raw Data Storage**: Store raw webhook payload for audit/debugging

---

## Rollout Strategy

1. **Local Development**: Test with Telegram test environment
2. **Preview Environment**: Deploy to preview bot, test with small group
3. **Production**:
   - Deploy backend first (webhook handlers)
   - Deploy frontend incrementally (feature flag if needed)
   - Monitor error rates and payment success rates
4. **Post-Launch**:
   - Monitor admin payment notifications
   - Track payment success/failure rates
   - Optimize UX based on user feedback

---

## Future Enhancements (Out of Scope)

1. **Refunds**: Admin UI for refunding payments (requires refundStarPayment API)
2. **Star Boost**: Allow increasing stars on existing premium posts
3. **Payment History**: User-facing payment history page
4. **Analytics**: Payment conversion funnel, revenue dashboard
5. **Promotions**: Discount codes, bulk star purchases
6. **Sorting**: Sort feed by star_count (most premium first)

---

## Appendix

### References
- [Telegram Bot Payments API (Stars)](https://core.telegram.org/bots/payments-stars)
- [Grammy Bot Framework](https://grammy.dev/)
- [Telegram WebApp openInvoice](https://core.telegram.org/bots/webapps#initializing-mini-apps)
- [Cloudflare D1 Batch Operations](https://developers.cloudflare.com/d1/worker-api/d1-database/)

### Glossary
- **Stars**: Telegram's in-app currency (symbol: ⭐️, currency code: XTR)
- **Invoice Link**: URL generated by createInvoiceLink for payment
- **Pre-checkout Query**: Telegram webhook to validate payment before processing
- **Successful Payment**: Final confirmation webhook after user pays
- **Invoice Payload**: Custom JSON string passed through payment flow for tracking
- **Charge ID**: Unique identifier for completed payment (telegram_payment_charge_id)
