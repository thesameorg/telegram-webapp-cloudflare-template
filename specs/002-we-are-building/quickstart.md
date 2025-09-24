# Quickstart Guide: Telegram Web App + Bot Template

## Prerequisites

Before starting, ensure you have:

1. **Cloudflare Account** with:
   - Workers and Pages enabled
   - API token with edit permissions
   - (No D1 database needed for Hello World template)

2. **Telegram Bot Setup**:
   - Create 3 bots via @BotFather (local, preview, prod)
   - Save bot tokens securely
   - Add web app button to each bot menu

3. **Development Environment**:
   - Node.js 18+ installed
   - Git configured
   - cloudflared installed (for local webhook tunnel)

## Quick Setup (5 minutes)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd twa-cf-tpl

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values:
# TELEGRAM_BOT_TOKEN=your_bot_token_here
# CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
# ENVIRONMENT=local
```

### 3. Validate Setup
```bash
# Validate environment configuration
./scripts/validate-env.sh
```

### 4. Configure Local Webhook
```bash
# Start cloudflared tunnel for local development
./scripts/webhook-local.sh
```

### 5. Start Development Servers
```bash
# Start backend server (in one terminal)
cd backend
npm run dev

# Start frontend server (in another terminal)
cd frontend
npm run dev
```

### 6. Test the Template
```bash
# Send /start to your bot in Telegram
# Or test via API
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<YOUR_TELEGRAM_ID>",
    "text": "/start"
  }'
```

## Verification Steps

### ✅ Bot Test
1. Send `/start` to your local bot
2. Expected response: "Hello World" message with Web App button
3. Check Worker logs: `wrangler tail --local`

### ✅ Web App Test
1. Open bot and click "Open Web App" button
2. Expected result: "Hello World" page loads
3. Check browser console for errors
4. Verify responsive design (mobile/desktop)

### ✅ Integration Test
1. Bot response includes web app button
2. Web app authenticates successfully
3. User profile loads correctly
4. Session tracking works

## Environment Deployment

### Preview Environment
```bash
# Deploy to preview (via GitHub Actions on PR)
# Or manually:
cd backend
npm run deploy:preview

# Webhook is set automatically via GitHub Actions
```

### Production Environment
```bash
# Deploy to production (via GitHub Actions on merge to main)
# Or manually:
cd backend
npm run deploy:prod

# Webhook is set automatically via GitHub Actions
```

## Webhook URL Management

**Environment-specific webhook URLs**:
- **Local**: Uses cloudflared tunnel URL (e.g., `https://abc123.trycloudflare.com/webhook`)
- **Preview**: Uses Cloudflare deployment URL (e.g., `https://preview-branch.your-app.pages.dev/webhook`)
- **Production**: Uses Cloudflare deployment URL (e.g., `https://your-app.pages.dev/webhook`)

Each environment uses its own bot token and webhook URL to prevent conflicts.

## Troubleshooting

### Common Issues

**Bot not responding:**
- Check webhook URL is set correctly
- Verify bot token in Cloudflare Secrets
- Check Worker logs for errors

**Web App not loading:**
- Ensure HTTPS is working
- Check Telegram Web App SDK integration
- Verify authentication endpoint

**Deployment failures:**
- Validate all environment variables present
- Check Cloudflare API token permissions
- Verify wrangler.toml configuration

### Debug Commands
```bash
# Check webhook status
./scripts/webhook-status.sh

# View Worker logs
wrangler tail --local

# Test API endpoints
curl http://localhost:8787/health
curl http://localhost:8787/api/hello

# Validate environment
./scripts/validate-env.sh
```

## Development Workflow

### 1. Local Development
- Use cloudflared tunnel for webhook testing
- Real bot token for authentic experience
- Hot reload with Vite for frontend
- Worker development mode for backend

### 2. Testing Changes
```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run type checking
cd backend && npm run typecheck
cd frontend && npm run typecheck
```

### 3. Deployment Process
```bash
# 1. Validate environment
./scripts/validate-env.sh

# 2. Create PR for preview deployment
git push origin feature-branch

# 3. Merge to main for production deployment
# GitHub Actions handles deployment automatically
```

## Next Steps

### Extend the Template

1. **Add New Bot Commands**:
   - Edit `/src/backend/bot/commands/`
   - Add command handlers
   - Update webhook router

2. **Enhance Web App**:
   - Add new React components
   - Implement additional API endpoints
   - Add database tables

3. **Improve Infrastructure**:
   - Add monitoring and alerting
   - Implement advanced caching
   - Add CI/CD pipelines

### Production Readiness

Before using in production:

1. **Security Review**:
   - Rotate all secrets
   - Review CORS settings
   - Audit dependencies

2. **Performance Testing**:
   - Load test API endpoints
   - Verify web app performance
   - Test webhook handling under load

3. **Monitoring Setup**:
   - Add error tracking
   - Implement health checks
   - Set up log aggregation

## Support

- **Documentation**: [Full docs link]
- **Issues**: [GitHub issues link]
- **Community**: [Discord/Telegram channel]

---

**Estimated Time**: 5-10 minutes for basic setup, 30-60 minutes for full deployment across all environments.