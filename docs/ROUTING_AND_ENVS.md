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
- Restart backend after changing `PAGES_URL`
- Bot sends Web App button with ngrok URL
- User clicks → ngrok tunnel → localhost:3000 → Vite proxy → localhost:8787

**Request flow:**
```
Telegram → https://abc123.ngrok-free.app
  → ngrok → localhost:3000 (frontend)
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
| `PAGES_URL` | `http://localhost:3000` or ngrok URL | CORS validation |
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
| `PAGES_URL` | Worker CORS origin (runtime) |

---

## Where Variables Come From

| Environment | PAGES_URL | WORKER_URL | Auth |
|-------------|-----------|------------|------|
| Local (browser) | `.env` | Vite proxy | Bypass required |
| Local (ngrok) | `.env` (ngrok URL) | Vite proxy | Telegram |
| Tests | None (fallback `*`) | N/A | Mock |
| Production | GitHub Var → `--var` | GitHub Var → build | Telegram |

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
