# Configuration Guide

Configuration is managed in **3 places**: GitHub (CI/CD), `.env` (local dev), `wrangler.toml` (production defaults).

---

## 1. GitHub Repository Settings

**Location:** Repository Settings → Secrets and variables → Actions

### Variables

| Variable | Example |
|----------|---------|
| `WORKER_URL` | `https://your-project.workers.dev` or `https://api.your-domain.com` |
| `PAGES_URL` | `https://your-project.pages.dev` or `https://your-domain.com` |

### Secrets

| Secret | How to get |
|--------|------------|
| `CLOUDFLARE_API_TOKEN` | [Create token](https://dash.cloudflare.com/profile/api-tokens) (Workers:Edit, Pages:Edit, D1:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers (top right) |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/botfather) (production bot) |
| `TELEGRAM_ADMIN_ID` | [@userinfobot](https://t.me/userinfobot) |

---

## 2. Local `.env` File

Copy `.env.example` → `.env` and configure:

```bash
TELEGRAM_BOT_TOKEN=your_dev_bot_token_here
TELEGRAM_ADMIN_ID=123456789
ENVIRONMENT=local
PAGES_URL=http://localhost:3000  # Or your ngrok URL for Telegram testing
DEV_AUTH_BYPASS_ENABLED=false
```

**Notes:**
- Use a separate bot token for local development
- For Telegram Web App testing, set `PAGES_URL` to your ngrok tunnel URL
- Get ngrok URL with `npm run tunnel:status`

---

## 3. `wrangler.toml`

Update these values in `wrangler.toml`:

```toml
account_id = "YOUR_ACCOUNT_ID"  # From Cloudflare Dashboard

[[kv_namespaces]]
id = "YOUR_KV_ID"  # Create in Cloudflare Dashboard → KV

[[d1_databases]]
database_id = "YOUR_D1_ID"  # Create in Cloudflare Dashboard → D1

[[r2_buckets]]
bucket_name = "your-bucket-name"  # Create in Cloudflare Dashboard → R2
```

**Note:** `PAGES_URL` is NOT configured here - it's set via `.env` (local) and GitHub Variables (production).

---

## 🌐 Custom Domains (Optional)

If using custom domains, update:
- GitHub Variables: `WORKER_URL`, `PAGES_URL` → your custom domains
- `.env`: Keep `PAGES_URL=http://localhost:3000` for local dev (or ngrok URL)

**Cloudflare setup:**
- Pages: Dashboard → Pages → Custom domains
- Worker: Dashboard → Workers → Triggers → Custom domains

---

## ✅ Setup Checklist

**Local:**
- [ ] Copy `.env.example` → `.env`
- [ ] Set Telegram bot token and admin ID in `.env`
- [ ] Set `PAGES_URL` in `.env` (localhost or ngrok)
- [ ] Update `wrangler.toml` account_id
- [ ] Create KV/D1/R2 resources, update IDs in `wrangler.toml`

**GitHub:**
- [ ] Add all 4 secrets listed above
- [ ] Add WORKER_URL and PAGES_URL variables

**Verify:**
- [ ] `npm run dev` works locally
- [ ] Push to GitHub triggers successful deployment

---

## 🔍 Troubleshooting

| Error | Solution |
|-------|----------|
| `VITE_WORKER_URL environment variable is required` | Set GitHub Variable `WORKER_URL` |
| `PAGES_URL must be configured` | Set `PAGES_URL` in `wrangler.toml` [vars] |
| CORS errors | `PAGES_URL` doesn't match frontend URL |
| Telegram webhook not working | Check `TELEGRAM_BOT_TOKEN` in GitHub Secrets |
