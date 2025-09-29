# Telegram Web App + Bot Template

A complete template for building Telegram Web Apps with integrated bot functionality, deployed on Cloudflare infrastructure.

## 🚀 Features

- **Telegram Bot**: Handles `/start` command with Web App button
- **React Web App**: Modern UI with Telegram Web App SDK integration
- **TypeScript**: Full type safety across backend and frontend
- **Cloudflare Deployment**: Workers + Pages with edge performance
- **Environment Separation**: Local, preview, and production environments
- **Automated CI/CD**: GitHub Actions with deployment and webhook setup
- **Local Development**: ngrok tunnel for real webhook testing
- **Contract Testing**: TDD approach with comprehensive test suite

## 📋 Prerequisites

### Required
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Telegram Bot Token** - Create bots via [@BotFather](https://t.me/botfather)
- **Cloudflare Account** - [Sign up](https://dash.cloudflare.com/sign-up)

### Recommended
- **ngrok** - [Install](https://ngrok.com/download) for local development
- **jq** - [Install](https://jqlang.github.io/jq/download/) for JSON processing

## 🛠️ Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd twa-cf-tpl
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
TELEGRAM_BOT_TOKEN=your_bot_token_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
ENVIRONMENT=local
```

### 3. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 4. Local Development
```bash
# Set up local webhook tunnel
./scripts/webhook-local.sh

# In another terminal, start backend
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev
```

### 5. Test Your Setup
- Send `/start` to your bot in Telegram
- Click "Open Web App" button

## 🏗️ Project Structure

```
├── backend/                 # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts        # Main Hono.js server
│   │   ├── webhook.ts      # Telegram webhook handler
│   │   └── api/            # API endpoints
│   └── tests/              # Contract tests
├── frontend/               # React web app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Telegram SDK integration
│   │   └── App.tsx         # Main app component
│   └── tests/              # Component tests
├── scripts/                # Development scripts
├── .github/workflows/      # CI/CD automation
└── wrangler.toml          # Cloudflare configuration
```

## 🌍 Environment Management

This template supports three environments:

### Local Development
- Uses ngrok tunnel for webhooks
- Real bot token for authentic testing
- Hot reload for both backend and frontend

### Preview (Staging)
- Deployed on PR creation
- Separate bot token prevents production interference
- Full CI/CD pipeline testing

### Production
- Deployed on main branch merge
- Production bot token
- Health checks and monitoring

## 🚀 Deployment

### Automated (Recommended)
1. **Set up GitHub Secrets**:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `TELEGRAM_BOT_TOKEN_PREVIEW`
   - `TELEGRAM_BOT_TOKEN_PROD`

2. **Deploy via GitHub Actions**:
   - Push to `main` → Production deployment
   - Create PR → Preview deployment
   - Webhooks configured automatically

### Manual Deployment
```bash
# Deploy backend
cd backend
npx wrangler deploy

# Deploy frontend
cd frontend
npm run build
# Upload dist/ to Cloudflare Pages

# Set webhook manually
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://your-worker.your-subdomain.workers.dev/webhook"
```

## 📝 Available Scripts

### Backend (`cd backend`)
```bash
npm run dev          # Start development server
npm run deploy       # Deploy to Cloudflare Workers
npm run test         # Run tests
npm run typecheck    # TypeScript checking
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
```

### Root Level
```bash
./scripts/webhook-local.sh     # Start local webhook tunnel
./scripts/webhook-status.sh    # Check webhook status
./scripts/stop-tunnel.sh       # Stop local tunnel
```

## 🧪 Testing

### Run All Tests
```bash
# Backend contract tests
cd backend && npm test

# Frontend component tests
cd frontend && npm test
```

### Test Coverage
- **Contract tests**: API endpoints and webhook handling
- **Component tests**: React component rendering and behavior
- **Integration tests**: End-to-end workflow validation
- **Environment tests**: Configuration and deployment validation

## 🔧 Development Guide

### Adding New Bot Commands
1. **Update webhook handler** (`backend/src/webhook.ts`):
   ```typescript
   if (update.message?.text === '/newcommand') {
     await handleNewCommand(botToken, chatId, firstName)
   }
   ```

2. **Add command handler**:
   ```typescript
   async function handleNewCommand(botToken: string, chatId: number, firstName: string) {
     await sendTelegramMessage(botToken, chatId, 'New command response!')
   }
   ```

3. **Add contract tests**:
   ```typescript
   it('should handle /newcommand', async () => {
     // Test implementation
   })
   ```

### Adding New Web App Pages
1. **Create component** (`frontend/src/components/NewPage.tsx`)
2. **Add routing** (if using React Router)
3. **Update tests** (`frontend/tests/components/NewPage.test.tsx`)
4. **Add API endpoints** if needed

### Environment Variables
Add new environment variables to:
- `.env.example` (with example values)
- `wrangler.toml` (for Workers)
- GitHub Secrets (for production)

## 🛡️ Security

### Bot Token Security
- ✅ Stored in Cloudflare Secrets (runtime)
- ✅ Stored in GitHub Secrets (CI/CD)
- ✅ Never logged or exposed in error messages
- ✅ Separate tokens per environment

### Webhook Validation
- ✅ Request signature validation
- ✅ HTTPS-only endpoints
- ✅ Rate limiting via Cloudflare
- ✅ Input sanitization with Zod schemas

### Best Practices
- Use environment-specific resources
- Rotate tokens periodically
- Monitor for security events
- Keep dependencies updated

## 🔍 Monitoring & Debugging

### Health Checks
```bash
# Check application health
curl https://your-worker.your-subdomain.workers.dev/health

# Check webhook status
./scripts/webhook-status.sh

```

### Logs
```bash
# Cloudflare Workers logs
wrangler tail --env production

# Local development logs
npm run dev
```

### Common Issues

**Bot not responding**:
- Check webhook URL is set correctly
- Verify bot token in Cloudflare Secrets
- Check Worker logs for errors

**Web App not loading**:
- Ensure HTTPS is working
- Check Telegram Web App SDK integration
- Verify CORS settings

**Deployment failures**:
- Validate all environment variables present
- Check Cloudflare API token permissions
- Verify wrangler.toml configuration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and add tests
4. Ensure all tests pass (`npm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hono.js](https://hono.dev/) - Fast, lightweight web framework
- [Telegram Bot API](https://core.telegram.org/bots/api) - Bot platform
- [Telegram Web Apps](https://core.telegram.org/bots/webapps) - Web app integration
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [React](https://reactjs.org/) - UI library
- [Vite](https://vitejs.dev/) - Build tool

---

🚀 **Ready to build your Telegram Web App?** Start with the [Quick Start](#-quick-start) guide above!