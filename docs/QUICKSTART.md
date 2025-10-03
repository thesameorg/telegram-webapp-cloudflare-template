# Quick Start Guide

## Prerequisites

### Required Software

- **Node.js** (v20 or higher) - [Installation guide](https://nodejs.org/)
- **Wrangler CLI** - Cloudflare's command-line tool
- **ngrok** - For local development tunneling
  - [Install ngrok](https://ngrok.com/download)
  - Create account and authenticate: `ngrok authtoken <your-token>`

### Initial Setup

1. **Copy environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Install dependencies:**

   ```bash
   npm install        # Root dependencies
   npm run install    # Backend & frontend dependencies
   npm run check      # Verify lint, typecheck & tests
   ```

3. **Initialize local database:**
   ```bash
   npm run db:migrate:local
   ```

---

## Local Development (No Telegram)

Perfect for testing the app without setting up a bot.

1. **Enable dev bypass mode in `.env`:**

   ```bash
   DEV_AUTH_BYPASS_ENABLED=true
   ```

2. **Run verification and start dev servers:**

   ```bash
   npm run clean-check    # Should complete without errors
   npm run dev
   ```

3. **Test the application:**
   - Open http://localhost:3000
   - Navigate to **Profile** section
   - You should see a "DEV Developer" user
   - Try adding posts and changing user data

---

## Local Development with Telegram

Full integration testing with a real Telegram bot.

### 1. Setup ngrok Tunnel

```bash
npm run tunnel:start
```

Note the URL you receive (e.g., `https://1cd4689c783a.ngrok-free.app/`)

### 2. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot and save the **bot token**
3. Set the menu button URL to your ngrok URL

### 3. Get Your Telegram ID

1. Message [@username_to_id_bot](https://t.me/username_to_id_bot)
2. Save your numeric Telegram ID

### 4. Configure Environment

Edit `.env`:

```bash
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_ADMIN_ID=<your-telegram-id>
DEV_AUTH_BYPASS_ENABLED=false
```

### 5. Restart Development Server

```bash
npm run stop && npm run dev
```

### 6. Test the Bot

1. Open your bot in Telegram
2. Send `/start`
3. Open the web app
4. Enjoy!

> **⚠️ Rate Limit Warning**
>
> ngrok free tier limits: 120 requests/minute. If you hit the limit, wait a minute before continuing.

---

## Production Deployment

### 1. Cloudflare Setup

**Get your credentials:**

```bash
wrangler whoami    # Get your Account ID
```

Add to `.env` (recommended):

```bash
CF_API_TOKEN=<your-api-token>
CF_ACCOUNT_ID=<your-account-id>
```

### 2. Create Cloudflare Resources

**D1 Database:**

```bash
wrangler d1 create <your-database-name>
```

- Copy `database_name` and `database_id` to `wrangler.toml`
- Update `package.json` line 28:
  ```json
  "db:migrate:local": "npx wrangler d1 migrations apply <your-database-name> --local"
  ```

**KV Namespace:**

```bash
wrangler kv namespace create <your-kv-namespace-name>
```

- Copy `binding` and `id` to `wrangler.toml` KV section

**R2 Bucket:**

```bash
wrangler r2 bucket create <bucket-name>
```

- Copy `binding` and `bucket_name` to `wrangler.toml` R2 section
- **Enable public access:**
  1. Go to Cloudflare Dashboard
  2. Navigate to R2 → Your bucket → Settings
  3. Enable "Public Development URL"

### 3. Create Production Bot

Create a new bot with [@BotFather](https://t.me/botfather) for production use (separate from development).

### 4. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

**Secrets:**

- `CLOUDFLARE_ACCOUNT_ID` - From `wrangler whoami`
- `CLOUDFLARE_API_TOKEN` - [Create API token](https://dash.cloudflare.com/profile/api-tokens)
- `TELEGRAM_ADMIN_ID` - Your Telegram ID
- `TELEGRAM_BOT_TOKEN` - Production bot token

**Variables:**

- `PAGES_URL` - Your Cloudflare Pages URL (see next step)
- `WORKER_URL` - Your Cloudflare Worker URL
- `R2_URL` - Your R2 bucket public URL (from step 2)
- `PAGES_PROJECT_NAME` - Your Pages project name

### 5. Deploy Infrastructure

**Create Pages project:**

```bash
wrangler pages project create <my-project>
```

**Set project name in `wrangler.toml`** (line 1)

**Deploy worker:**

```bash
wrangler deploy
```

Note the deployment URL for `WORKER_URL` variable.

### 6. Configure Bot

Update your production bot's menu button with `PAGES_URL` using [@BotFather](https://t.me/botfather).

### 7. Deploy via GitHub Actions

1. Commit and push your changes
2. Monitor deployment in GitHub Actions
3. Ensure the workflow completes successfully (green checkmark)

### 8. Verify Deployment

Test your production bot:

- ✅ Send `/start` message
- ✅ Open web app (should load)
- ✅ Check "Payments" section (visible to admin)
- ✅ Verify profile shows your Telegram name

**🎉 Congratulations! Your app is live!**

---

## Custom Domain (Optional)

If you have a custom domain:

1. **Configure Worker domain:**
   - Cloudflare Dashboard → Workers & Pages → Your worker → Settings → Domains

2. **Configure Pages domain:**
   - Cloudflare Dashboard → Workers & Pages → Your Pages project → Custom domains

3. **Update GitHub variables:**
   - Update `PAGES_URL` and `WORKER_URL` with your custom domains

4. **Update bot menu button** in [@BotFather](https://t.me/botfather) with your custom domain
