# Routing & Environment Configuration

How requests flow in different environments and what configuration is required.

---

## Local Development (Browser Only)

Test without Telegram integration.

**Setup:**
```bash
npm run dev
```

**.env:**
```bash
DEV_AUTH_BYPASS_ENABLED=true  # Required
```

**Flow:**
```
Browser → localhost:3000 (Vite) → proxy → localhost:8787 (Worker)
```

Auth bypass creates a mock "DEV Developer" session.

---

## Local Development (Telegram Bot)

Full integration with real Telegram bot via ngrok tunnel.

**Setup:**
```bash
npm run tunnel:start  # Creates https://abc123.ngrok-free.app
```

**.env:**
```bash
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_ADMIN_ID=<your-telegram-id>
DEV_AUTH_BYPASS_ENABLED=false
```

**Flow:**
```
Telegram → https://abc123.ngrok-free.app (ngrok)
  → localhost:3000 (Vite) → proxy → localhost:8787 (Worker)
```

**Important:**
- ngrok URL changes on restart - restart dev server after getting new URL
- ngrok runs on port 4040 for status/management API
- Free tier: 120 requests/minute

---

## Production Deployment

Deployed via GitHub Actions to Cloudflare.

**GitHub Secrets (required):**
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `TELEGRAM_BOT_TOKEN` - Production bot
- `TELEGRAM_ADMIN_ID`

**GitHub Variables (required):**
- `PAGES_URL` - Frontend URL (e.g., `https://twa-cf-tpl.pages.dev`)
- `WORKER_URL` - Backend URL (e.g., `https://twa-cf-tpl.workers.dev`)
- `R2_URL` - R2 bucket public URL
- `PAGES_PROJECT_NAME` - Cloudflare Pages project name

**Flow:**
```
1. Telegram → https://twa-cf-tpl.pages.dev (Pages)
2. Frontend loads, reads VITE_WORKER_URL (set at build time)
3. API calls → https://twa-cf-tpl.workers.dev (Worker)
4. Worker validates Origin header against PAGES_URL
```

**Custom domains:**
Set `PAGES_URL` and `WORKER_URL` to your custom domains.

---

## Environment Variables Reference

| Variable | Local (.env) | GitHub Secret | GitHub Variable | Purpose |
|----------|--------------|---------------|-----------------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ | ✅ | | Bot API access |
| `TELEGRAM_ADMIN_ID` | ✅ | ✅ | | Admin role |
| `DEV_AUTH_BYPASS_ENABLED` | ✅ | | | Skip Telegram auth locally |
| `CLOUDFLARE_ACCOUNT_ID` | | ✅ | | Cloudflare account |
| `CLOUDFLARE_API_TOKEN` | | ✅ | | Deploy to Cloudflare |
| `PAGES_URL` | | | ✅ | Frontend URL (CORS validation) |
| `WORKER_URL` | | | ✅ | Backend URL (build-time) |
| `R2_URL` | | | ✅ | R2 bucket public URL |
| `PAGES_PROJECT_NAME` | | | ✅ | Pages project name |

---

## API Routes

Complete catalog of backend endpoints (defined in `backend/src/index.ts`).

### Public Routes (No Auth)

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Health check |
| `/api/health` | GET | Health check |
| `/webhook` | POST | Telegram webhook |
| `/r2/*` | GET | Serve R2 images |

### Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth` | POST | Telegram Web App auth |

### Posts (Auth Required)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/posts` | GET | List posts (pagination: `?page=1&limit=50`) |
| `/api/posts` | POST | Create post |
| `/api/posts/user/:userId` | GET | Get user posts |
| `/api/posts/:postId` | GET | Get single post |
| `/api/posts/:postId` | PUT | Update post (owner only) |
| `/api/posts/:postId` | DELETE | Delete post (owner only) |
| `/api/posts/:postId/images` | POST | Upload images (max 10, multipart/form-data) |
| `/api/posts/:postId/images/:imageId` | DELETE | Delete image (owner only) |
| `/api/posts/:postId/make-premium` | POST | Create Stars invoice (1-10 stars) |
| `/api/posts/:postId/clear-pending` | POST | Clear pending payment |

### Profile (Auth Required)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/profile/me` | GET | Get current user |
| `/api/profile/me` | PUT | Update current user |
| `/api/profile/me/avatar` | POST | Upload avatar |
| `/api/profile/me/avatar` | DELETE | Delete avatar |
| `/api/profile/:telegramId` | GET | Get user by ID |

### Payments (Admin Only)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/payments` | GET | List payments |
| `/api/payments/balance` | GET | Get bot Stars balance (cached) |
| `/api/payments/refresh-balance` | POST | Refresh balance from API |
| `/api/payments/reconcile` | POST | Reconcile with Telegram |
| `/api/payments/:paymentId/refund` | POST | Refund payment (7-day window) |

### Admin (Admin Only)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/ban/:telegramId` | POST | Ban user |
| `/api/admin/unban/:telegramId` | POST | Unban user |

---

## Common Issues

**CORS errors in production:**
- Verify `PAGES_URL` GitHub variable is set
- Check workflow uses `--var PAGES_URL=` syntax (not `:`)

**Local auth not working:**
- Set `DEV_AUTH_BYPASS_ENABLED=true` in `.env`

**ngrok tunnel issues:**
- Restart dev server after ngrok restart (URL changes)
- Check status: `npm run tunnel:status`

**CI test warnings (harmless):**
```
PAGES_URL not set - using wildcard CORS
```
This is normal - tests don't need CORS validation.
