# Star Refund Feature - Design Document

## 1. Feasibility Check ✅

### Current Infrastructure
The codebase is **well-positioned** for refund implementation:

- ✅ **Payment system exists** (`backend/src/services/payment-service.ts`)
- ✅ **'refunded' status already defined** in `PaymentStatus` type
- ✅ **Admin authentication** in place (`backend/src/api/admin.ts`)
- ✅ **Notification service** ready (`backend/src/services/notification-service.ts`)
- ✅ **Payments admin UI** exists (`frontend/src/pages/Payments.tsx`)
- ✅ **Database schema supports it** (payments table has all needed fields)

### Telegram Bot API Support
- ✅ **`refundStarPayment` method exists** in Bot API
  - Parameters: `user_id`, `telegram_payment_charge_id`
  - Returns: `true` on success
- ✅ **`refunded_payment` webhook message** type exists
  - Telegram sends notification when refund completes
- ✅ **Grammy framework supports both** (types confirmed in node_modules/@grammyjs/types)

### Technical Feasibility: **HIGH** ✅
All required infrastructure exists. Implementation is straightforward API integration work.

---

## 2. Fit-Gap Analysis

### What We Have ✅
| Component | Status | Location |
|-----------|--------|----------|
| Payment records | ✅ Exists | `payments` table in D1 |
| Charge ID storage | ✅ Exists | `telegram_payment_charge_id` column |
| Admin auth | ✅ Exists | `backend/src/api/admin.ts` |
| Notification service | ✅ Exists | `backend/src/services/notification-service.ts` |
| Payment UI | ✅ Exists | `frontend/src/pages/Payments.tsx` |
| Status badge rendering | ✅ Exists | UI already shows 'refunded' badge (gray) |
| Webhook handler | ✅ Exists | `backend/src/webhook.ts` |
| Post-payment link | ✅ Exists | `payment_id` on posts table |

### What We Need ⚙️
| Component | Status | Effort |
|-----------|--------|--------|
| Admin refund API endpoint | ❌ Missing | Low |
| Refund webhook handler | ❌ Missing | Low |
| Refund button in UI | ❌ Missing | Low |
| 1-week validation logic | ❌ Missing | Trivial |
| Post reversion logic | ❌ Missing | Low |
| Refund notifications | ❌ Missing | Trivial |
| Webhook allowed methods check | ⚠️ Unknown | Research needed |

### Gap Assessment: **SMALL** ✅
~80% of infrastructure exists. Missing pieces are well-defined CRUD operations.

---

## 3. MVP Fit Analysis ✅

### MVP-Friendly Aspects ✅
1. **No complex state management** - Simple status transitions
2. **No data retention concerns** - Just flip flags, no historical tracking needed
3. **Telegram handles the money** - We just call API, no financial liability
4. **Existing patterns** - Similar to ban/unban flow already implemented
5. **Single payment per post** - No complex multi-payment scenarios
6. **No rollback complexity** - Refund = revert to regular post

### MVP Anti-Patterns to Avoid ⚠️
1. ❌ Don't build refund history tracking
2. ❌ Don't build dispute/appeal system
3. ❌ Don't build partial refund support
4. ❌ Don't build automated refund rules
5. ❌ Don't build refund analytics dashboard

### MVP Recommendation: **EXCELLENT FIT** ✅
Feature is simple, well-scoped, and leverages existing infrastructure. Perfect for MVP.

---

## 4. Critical Questions & Clarifications Needed

### Business Logic ✅ CONFIRMED
1. **Q: What happens to refunded posts?**
   - ✅ **CONFIRMED**: Posts stay visible as regular posts (not-starred)

2. **Q: One payment per post model?**
   - ✅ **CONFIRMED**: 1 payment per post (1:1 relationship)

3. **Q: Can admins refund their own payments?**
   - ✅ **CONFIRMED**: Yes, admins can refund their own payments

4. **Q: Refund time window?**
   - ✅ **CONFIRMED**: `now() - payment.createdAt` must not exceed 7*24 hours (168 hours)
   - Payments older than 168 hours cannot be refunded

5. **Q: What if Telegram refund API fails?**
   - ✅ **CONFIRMED**: Retry for transient errors (network, timeout, rate limit)
   - ❌ **DO NOT RETRY** for permanent errors (payment not found, already refunded, etc.)
   - Show error to admin, don't change payment status on failure

### Technical Details
6. **Q: Webhook allowed methods configuration?**
   - Where is `setWebhook` called with `allowed_updates`?
   - Is `message` type allowed (covers refunded_payment)?
   - *Action: Need to verify webhook setup code*

7. **Q: Idempotency for refund webhook?**
   - Can Telegram send `refunded_payment` multiple times?
   - *Assumption for plan: Yes, implement idempotency check*

8. **Q: What if post was deleted before refund?**
   - Should refund still work?
   - *Assumption for plan: Yes, refund payment regardless of post state*

---

## 5. Technical Implementation Notes

### Webhook Setup Verification Required ⚠️
Need to find/check:
```typescript
// Somewhere in codebase or deployment script
bot.api.setWebhook(webhookUrl, {
  allowed_updates: ["message", "pre_checkout_query"] // Need to verify "message" is included
})
```

If `allowed_updates` doesn't include `"message"`, the `refunded_payment` webhook won't arrive.

### Refund Flow
```
Admin clicks "Refund"
  → Confirmation modal
  → POST /api/admin/refund-payment/:paymentId
    → Validate (< 1 week, status=succeeded)
    → Call bot.api.refundStarPayment(userId, chargeId)
    → On success: Update status to 'refund_pending'
    → Return success to UI

[Time passes - async]

Telegram processes refund
  → Sends webhook: message:refunded_payment
    → Validate telegram_payment_charge_id
    → Update payment status: 'refunded'
    → Revert post: starCount=0, paymentId=null
    → Notify user (bot message)
    → Notify admin (bot message)
```

### Database Changes
**None required!** ✅ Existing schema supports everything needed.

---

## 6. Execution Plan

### Phase 1: Backend - Refund API (2-3 hours)
**File: `backend/src/api/payments.ts`**

- [ ] Add `POST /api/payments/:paymentId/refund` endpoint
  - Authenticate admin
  - Validate payment exists
  - Validate status === 'succeeded'
  - Validate `now() - payment.createdAt <= 168 hours` (7 days)
  - Validate not already refunded
  - Call `bot.api.refundStarPayment(userId, telegram_payment_charge_id)`
  - Implement retry logic:
    - ✅ Retry on: Network errors, timeouts, 429 rate limits, 5xx errors
    - ❌ Don't retry on: 400 errors (invalid payment), 404 (not found), already refunded
  - Log all steps (request, response, retries)
  - Return success/error with clear error messages

- [ ] Add method to PaymentService:
  ```typescript
  async refundPayment(paymentId: string): Promise<{success: boolean, error?: string}> {
    // Validate 7-day window: (Date.now() - payment.createdAt) <= 168 hours
    // Call bot.api.refundStarPayment with retry logic
    // Retry transient errors (network, timeout, 429, 5xx)
    // Don't retry permanent errors (400, 404, "already refunded")
  }
  ```

**File: `backend/src/index.ts`**
- [ ] Add route: `app.post('/api/payments/:paymentId/refund', refundPayment)`

### Phase 2: Backend - Webhook Handler (1-2 hours)
**File: `backend/src/webhook.ts`**

- [ ] Add handler BEFORE generic message handler:
  ```typescript
  bot.on('message:refunded_payment', async (ctx) => {
    // Log webhook received
    // Parse refunded_payment data
    // Find payment by telegram_payment_charge_id (idempotency)
    // If already refunded, skip
    // Update payment status to 'refunded'
    // Get associated post
    // Revert post: starCount=0, paymentId=null
    // Send user notification
    // Send admin notification
    // Log completion
  })
  ```

- [ ] Verify webhook configuration allows `message` updates

### Phase 3: Backend - Notifications (30 min)
**File: `backend/src/services/notification-service.ts`**

- [ ] Add `sendPaymentRefundNotification(env, telegramId, postId, starAmount)`
  - Message: "Your payment was reverted" (per spec)

- [ ] Add `sendAdminRefundAlert(env, details)`
  - Notify admin that refund completed

### Phase 4: Frontend - Refund Button (2 hours)
**File: `frontend/src/pages/Payments.tsx`**

- [ ] Add "Refund" button column to table
  - Show only if status === 'succeeded'
  - Show only if `(Date.now() - payment.createdAt) <= 168 hours` (7 days)
  - Add icon (↩️ or refund icon)
  - Disable button if time window expired (with tooltip explaining why)

- [ ] Add confirmation modal
  - "Are you sure you want to refund X stars to user Y?"
  - Confirm/Cancel buttons

- [ ] Add `handleRefund(paymentId)` function
  - Call `POST /api/payments/${paymentId}/refund`
  - Show loading state
  - Show success toast
  - Refresh payments list
  - Handle errors gracefully

- [ ] Update UI to handle 'refund_pending' status (optional)
  - Show spinner or "Processing refund..." badge

### Phase 5: Post Display (30 min)
**File: `frontend/src/components/PostItem.tsx`**

- [ ] Verify premium styling removed when starCount = 0
  - Already implemented via `isPremium` check ✅
  - No changes needed

### Phase 6: Testing & Validation (2-3 hours)

- [ ] **Test: Successful refund flow**
  - Create payment → Make premium → Refund → Verify reverted

- [ ] **Test: 7-day (168 hour) validation**
  - Try refund on payment > 168 hours old → Should fail with clear error
  - Try refund on payment exactly at 168 hours → Should work (edge case)

- [ ] **Test: Already refunded**
  - Try refund twice → Should fail second time

- [ ] **Test: Webhook idempotency**
  - Simulate duplicate refunded_payment webhook → Should handle gracefully

- [ ] **Test: Notifications**
  - Verify user receives bot message
  - Verify admin receives bot message

- [ ] **Test: Post reverts correctly**
  - Verify no gold frame
  - Verify no star badge
  - Verify normal background

- [ ] **Test: Error handling**
  - Payment not found → Should fail immediately (no retry)
  - Telegram API 400 error → Should fail immediately (no retry)
  - Network timeout → Should retry and eventually succeed or timeout
  - 429 rate limit → Should retry with backoff
  - 5xx server error → Should retry

- [ ] **Test: Logging**
  - Check all steps logged in server console
  - Check webhook logged in browser console (for client-side actions)

### Phase 7: Webhook Configuration Verification (30 min)

- [ ] Find webhook setup code (likely in deployment script or wrangler config)
- [ ] Verify `allowed_updates` includes `"message"` or is omitted (defaults to all)
- [ ] If not included, update and redeploy webhook
- [ ] Test webhook delivery with refund

---

## 7. Time Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Refund API | 2-3 hours |
| Phase 2: Webhook Handler | 1-2 hours |
| Phase 3: Notifications | 30 min |
| Phase 4: Frontend UI | 2 hours |
| Phase 5: Post Display | 30 min |
| Phase 6: Testing | 2-3 hours |
| Phase 7: Webhook Config | 30 min |
| **Total** | **9-12 hours** |

For a solo developer working focused: **1.5-2 days**

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Telegram API rate limits | Low | Retry 429 errors with exponential backoff |
| Webhook not receiving refunded_payment | Medium | Verify allowed_updates config early |
| Duplicate webhook processing | Low | Implement idempotency checks |
| Refund after post deleted | Low | Handle gracefully, still refund payment |
| Race condition (refund during payment) | Very Low | Check status before refund |
| Time zone confusion (7-day check) | Low | Use UTC consistently, validate in milliseconds |
| Permanent API errors (payment not found) | Low | Don't retry, show clear error to admin |

**Overall Risk: LOW** ✅

---

## 9. Post-MVP Enhancements (Out of Scope)

Future improvements NOT included in this MVP:

1. Refund history/audit log
2. Partial refunds
3. Refund reasons/notes
4. Bulk refunds
5. Automated refund policies
6. Refund analytics
7. Dispute resolution system
8. Email/push notifications (only bot messages for MVP)

---

## 10. Success Criteria

Feature is complete when:

1. ✅ Admin sees "Refund" button for eligible payments (< 168 hours, succeeded)
2. ✅ Clicking "Refund" shows confirmation modal
3. ✅ Confirming triggers refund via Telegram API
4. ✅ User receives bot message about refund
5. ✅ Admin receives bot message about refund
6. ✅ Payment status changes to "refunded" (gray badge)
7. ✅ Post reverts to regular (no frame, no stars)
8. ✅ Webhook handler processes refunded_payment correctly
9. ✅ All steps logged in server console
10. ✅ Error cases handled gracefully
11. ✅ Cannot refund same payment twice
12. ✅ Cannot refund payments > 168 hours old
13. ✅ Retry transient errors, don't retry permanent errors

---

## 11. Requirements Confirmed ✅

All questions have been answered by the client:

1. ✅ **Refund time window**: `now() - payment.createdAt <= 168 hours` (7 days)
2. ✅ **Post after refund**: Refunded posts stay visible as regular posts (not-starred)
3. ✅ **Refund cost**: Bot loses the stars when refunding - acceptable
4. ✅ **One payment per post**: Current model is 1:1, not multiple tips
5. ✅ **Admin self-refund**: Admins can refund their own payments
6. ✅ **Retry policy**: Retry transient errors, don't retry permanent errors

---

## 12. Related Files Reference

### Backend Files to Modify
- `backend/src/api/payments.ts` - Add refund endpoint
- `backend/src/webhook.ts` - Add refunded_payment handler
- `backend/src/services/payment-service.ts` - Add refund method
- `backend/src/services/notification-service.ts` - Add refund notifications
- `backend/src/index.ts` - Register refund route

### Frontend Files to Modify
- `frontend/src/pages/Payments.tsx` - Add refund button & confirmation

### Existing Files to Review (No Changes Needed)
- `backend/drizzle/migrations/0004_add_payments_table.sql` ✅
- `frontend/src/components/PostItem.tsx` ✅
- `backend/src/db/schema.ts` ✅

---

**Document Status**: ✅ **APPROVED - Ready for Implementation**
**Next Step**: Proceed with Phase 1 implementation (Backend - Refund API)
