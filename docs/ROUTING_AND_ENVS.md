# Routing Architecture Explained

How requests are routed in different environments and what configuration is needed.

---

## Local Development - Browser Only

**Testing directly in browser without Telegram.**

**Setup:**
```bash
npm run dev
```

**.env requirements:**
```bash
PAGES_URL=http://localhost:3000
DEV_AUTH_BYPASS_ENABLED=true  # Required! Otherwise auth won't work
```

**How it works:**
- Frontend (localhost:3000) → Vite proxy → Backend (localhost:8787)
- Backend CORS checks `Origin: http://localhost:3000` against `PAGES_URL`
- Auth bypass creates mock session (no Telegram needed)

---

## Local Development - Telegram Web App (ngrok)

**Testing with real Telegram bot.**

**Setup:**
```bash
npm run tunnel:start  # Creates https://abc123.ngrok-free.app → localhost:3000
```

**.env requirements:**
```bash
PAGES_URL=https://abc123.ngrok-free.app  # Must match ngrok URL exactly!
```

**Important:**
- Update `PAGES_URL` in `.env` when ngrok restarts (URL changes)
- Restart backend after changing `.env`
- Bot sends Web App button with ngrok URL
- User clicks → ngrok tunnel → localhost:3000 → Vite proxy → localhost:8787

**ngrok internals:**
- ngrok runs on port 3000 (tunnels to frontend)
- ngrok API available at `http://localhost:4040` for status/management
- Scripts use `http://localhost:4040/api/tunnels` to retrieve active tunnel URL

**Request flow:**
```
Telegram → https://abc123.ngrok-free.app
  → ngrok (port 4040 API) → localhost:3000 (frontend)
  → Vite proxy /api → localhost:8787 (backend)
```

Backend CORS checks `Origin: https://abc123.ngrok-free.app` against `PAGES_URL`.

---

## GitHub Workflow - Tests

**Tests run during CI/CD.**

**No environment variables needed:**
- Tests call Worker code directly (no HTTP)
- No `Origin` header, no CORS needed
- `PAGES_URL` undefined → falls back to wildcard `*`

**Expected warnings (harmless):**
```
stderr | PAGES_URL not set - using wildcard CORS (not recommended for production)
```

This is normal - tests don't need real CORS validation.

---

## Production Deployment

**Deployed to Cloudflare via GitHub Actions.**

### Worker Deployment

**Receives:**
- `PAGES_URL` from GitHub Variables → passed via `--var PAGES_URL="${{ vars.PAGES_URL }}"`
- `TELEGRAM_BOT_TOKEN` from GitHub Secrets
- `TELEGRAM_ADMIN_ID` from GitHub Secrets

### Pages Deployment

**Build with:**
- GitHub Variables set `VITE_WORKER_URL` fon `WORKER_URL`
- Vite embeds this into bundle as `config.apiBaseUrl`

### Production Request Flow

```
1. Bot sends Web App button: https://twa-cf-tpl.pages.dev
2. User clicks → Telegram opens URL
3. Pages serves React app
4. Frontend calls: https://twa-cf-tpl.workers.dev/api/posts
5. Browser sends: Origin: https://twa-cf-tpl.pages.dev
6. Worker CORS checks: c.env.PAGES_URL === Origin
7. ✅ Match → response with CORS headers
```

### Custom Domains

**If configured:**
- Set GitHub Variables: `WORKER_URL=https://api.yourdomain.com`, `PAGES_URL=https://yourdomain.com`
- Same flow, different URLs

---

## Environment Variables Quick Reference

### Local (.env file)

| Variable | Value | Purpose |
|----------|-------|---------|
| `TELEGRAM_BOT_TOKEN` | Your dev bot token | Bot API access |
| `TELEGRAM_ADMIN_ID` | Your Telegram ID | Admin role |
| `PAGES_URL` | `http://localhost:3000` or ngrok URL (optional) | CORS validation |
| `DEV_AUTH_BYPASS_ENABLED` | `true` for browser testing | Skip Telegram auth |

### GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Deploy to Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `TELEGRAM_BOT_TOKEN` | Production bot |
| `TELEGRAM_ADMIN_ID` | Admin access |

### GitHub Variables

| Variable | Purpose |
|----------|---------|
| `WORKER_URL` | Frontend API base URL (build-time) |
| `PAGES_URL` | Worker CORS origin (runtime, optional) |

---

## Where Variables Come From

| Environment | PAGES_URL | WORKER_URL | Auth |
|-------------|-------------|------------|------|
| Local (browser) | `.env` | Vite proxy | Bypass required |
| Local (ngrok) | `.env` (ngrok URL) | Vite proxy | Telegram |
| Tests | None (fallback `*`) | N/A | Mock |
| Production | GitHub Var → `--var` | GitHub Var → build | Telegram |

---

## API Routes Reference

Complete catalog of all backend API endpoints defined in `backend/src/index.ts`.

### Public Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Root health check, returns "Telegram Web App + Bot Template" |
| `/api/health` | GET | Health check endpoint |
| `/webhook` | POST | Telegram bot webhook handler |
| `/r2/*` | GET | Serve images from R2 storage (1-year cache) |

### Authentication

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/auth` | POST | Authenticate Telegram Web App user | No |

### Posts

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/posts` | GET | List posts with pagination (default 50, max 100) | Yes |
| `/api/posts` | POST | Create new post | Yes |
| `/api/posts/user/:userId` | GET | Get posts by specific user ID | Yes |
| `/api/posts/:postId` | GET | Get single post by ID | Yes |
| `/api/posts/:postId` | PUT | Update post | Yes (owner) |
| `/api/posts/:postId` | DELETE | Delete post | Yes (owner) |
| `/api/posts/:postId/images` | POST | Upload images to post (max 10, multipart/form-data) | Yes (owner) |
| `/api/posts/:postId/images/:imageId` | DELETE | Delete specific image from post | Yes (owner) |
| `/api/posts/:postId/make-premium` | POST | Create Telegram Stars invoice (1-10 stars) | Yes (owner) |
| `/api/posts/:postId/clear-pending` | POST | Clear pending payment status for post | Yes (owner) |

### Profile

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/profile/me` | GET | Get current user profile | Yes |
| `/api/profile/me` | PUT | Update current user profile | Yes |
| `/api/profile/me/avatar` | POST | Upload user avatar (max 5MB) | Yes |
| `/api/profile/me/avatar` | DELETE | Delete user avatar | Yes |
| `/api/profile/:telegramId` | GET | Get profile by Telegram ID | Yes |

### Payments

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/payments` | GET | List payments with pagination (default 50, max 100) | Yes (admin) |
| `/api/payments/balance` | GET | Get cached bot star balance (5min cache) | Yes (admin) |
| `/api/payments/refresh-balance` | POST | Force refresh bot star balance from Telegram API | Yes (admin) |
| `/api/payments/reconcile` | POST | Reconcile payments with Telegram transactions | Yes (admin) |
| `/api/payments/:paymentId/refund` | POST | Refund payment (within 7 day window) | Yes (admin) |

### Admin

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/admin/ban/:telegramId` | POST | Ban user by Telegram ID | Yes (admin) |
| `/api/admin/unban/:telegramId` | POST | Unban user by Telegram ID | Yes (admin) |

### Request/Response Details

**Pagination Parameters (query params):**
- `page`: Page number (default 1)
- `limit`: Items per page (default 50, max 100)

**Image Upload (multipart/form-data):**
- Fields: `image_N`, `thumbnail_N`, `order_N`, `width_N`, `height_N` (where N is index)
- Max 10 images per post
- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Max size: 1MB (full images), 100KB (thumbnails), 10MB (frontend limit)

**R2 Storage Paths:**
- Full images: `images/{postId}/full/`
- Thumbnails: `images/{postId}/thumbs/`

**Payment Status Enum:**
- `created`: Initial state (not sent to user yet)
- `pending`: Invoice sent, awaiting user payment
- `succeeded`: Payment completed successfully
- `failed`: Payment failed or cancelled
- `refunded`: Payment refunded to user

**Authentication Methods:**
- `Bearer {token}`: Standard OAuth token
- `Session {sessionId}`: Custom session token
- `tma {initData}`: Telegram Mini App initData

---

## Common Issues

**CORS errors in production:**
- Check GitHub Variable `PAGES_URL` is set
- Verify `--var PAGES_URL=` syntax in workflow (not `:`)

**Local auth not working:**
- Set `DEV_AUTH_BYPASS_ENABLED=true` in `.env`

**ngrok not working:**
- Update `PAGES_URL` in `.env` to match ngrok URL
- Restart backend after changing `.env`
- Get ngrok URL: `npm run tunnel:status`
