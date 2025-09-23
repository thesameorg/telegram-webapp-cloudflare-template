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
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values:
# TELEGRAM_BOT_TOKEN_LOCAL=your_local_bot_token
# CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### 3. Deploy to Cloudflare
```bash
# Deploy worker and pages
npm run deploy:local
```

### 4. Configure Local Webhook
```bash
# Start cloudflared tunnel for local development
npm run tunnel:start

# Set webhook URL to tunnel (for local environment)
npm run webhook:set:local
```

### 5. Test the Template
```bash
# Start development server
npm run dev

# In another terminal, test the bot
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
2. Expected response: "Hello World" message
3. Check logs: `npm run logs:local`

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
# Deploy to preview (gets Cloudflare deployment URL automatically)
npm run deploy:preview

# Set preview webhook to deployment URL
npm run webhook:set:preview

# Test preview bot
```

### Production Environment
```bash
# Deploy to production (gets Cloudflare deployment URL automatically)
npm run deploy:prod

# Set production webhook to deployment URL
npm run webhook:set:prod

# Test production bot
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
npm run webhook:info:local

# View Worker logs
npm run logs:local --tail

# Test API endpoints
npm run test:api:local

# Validate environment
npm run validate:env:local
```

## Development Workflow

### 1. Local Development
- Use cloudflared tunnel for webhook testing
- Real bot token for authentic experience
- Hot reload with Vite for frontend
- Worker development mode for backend

### 2. Testing Changes
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### 3. Deployment Process
```bash
# 1. Validate environment
npm run validate:env:preview

# 2. Deploy to preview
npm run deploy:preview

# 3. Run smoke tests
npm run test:smoke:preview

# 4. Deploy to production (if tests pass)
npm run deploy:prod
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