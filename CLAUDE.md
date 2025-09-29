# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Install all dependencies (backend + frontend)
npm run install

# Start development servers (backend on :8787, frontend on :3000)
npm run dev &

# Stop all development servers
npm run stop
```

### Building & Testing
```bash
# Run full build (typecheck backend, build frontend)
npm run build

# Run all tests (backend + frontend)
npm run test

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Complete verification pipeline
npm run check  # typecheck + lint + test
npm run clean-check  # clean + install + build + typecheck + lint + test
```

### Backend Development
```bash
cd backend
npm run dev          # Start Wrangler dev server on :8787
npm run deploy       # Deploy to Cloudflare Workers
npm test             # Run Vitest tests
npm run typecheck    # TypeScript checking
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite dev server on :5173
npm run build        # Build for production
npm test             # Run Vitest tests
npm run typecheck    # TypeScript checking
```

### Webhook Management
```bash
# Start local development tunnel (ngrok)
npm run tunnel:start

# Check webhook status
npm run tunnel:status

# Stop tunnels
npm run tunnel:stop
```
## Architecture

### Monorepo Structure
- **Root level**: Shared scripts and configuration
- **backend/**: Cloudflare Workers backend using Hono.js
- **frontend/**: React web app with Vite build system

### Backend (Cloudflare Workers)
- **Framework**: Hono.js for HTTP routing
- **Bot Framework**: Grammy for Telegram bot functionality
- **Validation**: Zod schemas for request validation
- **Testing**: Vitest for contract tests
- **Key Files**:
  - `src/index.ts`: Main Hono app with route definitions
  - `src/webhook.ts`: Telegram webhook handler with Grammy bot
  - `src/api/`: API endpoint handlers (health, auth)
  - `src/types/env.ts`: Environment variable type definitions

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Telegram Integration**: @twa-dev/sdk for Telegram Web App features
- **Testing**: Vitest + React Testing Library
- **Key Files**:
  - `src/App.tsx`: Main app component with Telegram theme integration
  - `src/utils/telegram.ts`: Telegram Web App SDK utilities
  - `src/components/SimpleAuthWrapper.tsx`: Authentication wrapper

### Environment Configuration
- **Local**: Uses ngrok/cloudflared tunnels for webhook development
- **Preview**: Deployed on PR creation with separate bot token
- **Production**: Deployed on main branch merge
- **Files**: `.env` (local), `wrangler.toml` (Workers config), GitHub Secrets (CI/CD)

### Cloudflare Services
- **Workers**: Backend API and webhook handler
- **Pages**: Frontend hosting + functions `[[path]]` as workaround for deployed backend url calls
- **KV**: Session storage (binding: SESSIONS)
- **D1**: Database storage (binding: DB)

### Bot Functionality
- **Commands**: `/start` command shows web app button
- **Message Handling**: Non-command messages get helpful response
- **Web App Integration**: Button launches React frontend
- **Security**: Webhook signature validation, separate tokens per environment

### Testing Strategy
- **Contract Tests**: Backend API endpoints and webhook handling
- **Component Tests**: React component rendering and behavior
- **Integration Tests**: End-to-end workflow validation
- **Environment Tests**: Configuration and deployment validation

### Development Workflow
1. Use tunneling scripts for local webhook testing
2. Backend runs on :8787, frontend on :5173
3. Environment variables loaded from `.env`
4. Real bot tokens required for authentic testing
5. Separate development and production bots recommended