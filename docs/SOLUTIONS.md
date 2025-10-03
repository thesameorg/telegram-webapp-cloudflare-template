
### Data Flow

**Authentication**:
1. Telegram WebApp provides `initData` via SDK
2. Frontend sends to `/api/auth` with HMAC signature
3. Backend validates using `TELEGRAM_BOT_TOKEN`
4. Session stored in KV, cookie returned

**Payments Flow**:
1. User creates post with star amount
2. Frontend requests invoice from `/api/payments/create-invoice`
3. Telegram processes payment
4. Webhook receives `pre_checkout_query` → validates → `successful_payment`
5. Atomic DB update (post + payment) via `db.batch()`
6. Notifications sent to user

**Image Upload**:
1. Frontend crops/compresses image
2. Uploads to `/api/posts/:postId/images` or `/api/profile/me/avatar`
3. Backend generates thumbnail using `browser-image-compression`
4. Stores original + thumbnail in R2
5. Saves keys to D1 `postImages` table