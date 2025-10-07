# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack Telegram Web App template with bot integration, deployed on Cloudflare Workers (backend) and Pages (frontend). Uses React + TypeScript frontend with Hono backend, D1 SQLite database, KV sessions, and R2 image storage.

## Architecture

### Monorepo Structure

- **Root**: Orchestration scripts and shared tooling
- **Backend** (`backend/`): Cloudflare Worker (Hono framework)
  - API endpoints (`src/api/`)
  - Telegram webhook handler (`src/webhook.ts`)
  - Database schema (`src/db/schema.ts` - Drizzle ORM)
  - Service layer (`src/services/`)
- **Frontend** (`frontend/`): React SPA
  - Uses Vite dev proxy to backend (localhost:8787)
  - Telegram WebApp SDK integration (`@twa-dev/sdk`)
  - API client (`src/services/api.ts`)

### Key Flows

**Authentication**:

1. Telegram WebApp sends `initData` via `window.Telegram.WebApp.initData`
2. Frontend POSTs to `/api/auth` with initData
3. Backend validates HMAC signature using `TELEGRAM_BOT_TOKEN`
4. Session stored in KV (SESSIONS binding), cookie returned
5. Middleware (`telegram-auth.ts`, `admin-auth.ts`) validates subsequent requests

**Telegram Webhook** (`src/webhook.ts`):

- Bot commands: `/start`, `/repo`
- Telegram Payments: `pre_checkout_query` → validates payment → `successful_payment` → updates DB atomically → notifications
- Refunds: `refunded_payment` → reverts post premium status

**Database** (D1 SQLite):

- `posts` - user posts with optional star payments
- `payments` - Telegram Stars payment records
- `userProfiles` - user profiles with avatar & contact info
- `postImages` - image metadata (R2 keys for originals + thumbnails)
- `comments` - post comments with hide/unhide functionality

**Image Flow**:

1. Frontend uploads to `/api/posts/:postId/images` or `/api/profile/me/avatar`
2. Backend receives multipart form, uses `browser-image-compression` for thumbnails
3. Stores in R2 bucket (IMAGES binding), saves keys to D1
4. Local dev serves via `/r2/*` endpoint; production uses R2 public domain

### Environment Strategy

**Local Development**:

- Backend: `wrangler dev --local --port 8787` (from `backend/`)
- Frontend: `vite` on port 3000 (proxies API to 8787)
- Database: `.wrangler/state/v3/d1` (local D1)
- Auth bypass available: `DEV_AUTH_BYPASS_ENABLED=true` in `.env`

**Production**:

- Worker: Deployed via `wrangler deploy` (uses `wrangler.toml` bindings)
- Pages: Built frontend deployed to Cloudflare Pages
- Worker URL passed as `VITE_WORKER_URL` during frontend build
- CORS validation uses `PAGES_URL` env var

## Common Commands

### Development

```bash
npm run dev              # Start both backend (8787) and frontend (3000)
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run stop             # Kill all dev servers
```

### Testing & Quality

```bash
npm run test             # Run all tests (backend + frontend)
npm test:backend         # Backend tests only (vitest)
npm test:frontend        # Frontend tests only (vitest)
npm run typecheck        # TypeScript check (both)
npm run lint             # ESLint (both)
npm run check            # typecheck + lint + test
npm run clean-check      # clean + install + build + check
```

### Database

```bash
npm run db:migrate:local           # Apply migrations to local D1
cd backend && npm run db:generate  # Generate migration from schema changes
cd backend && npm run db:studio    # Open Drizzle Studio (GUI for viewing DB)
cd backend && npm run db:push      # Push schema changes directly (dev only)
```

### Local Telegram Integration

```bash
npm run tunnel:start     # Start ngrok tunnel (requires ngrok auth)
npm run tunnel:status    # Check tunnel status
npm run tunnel:stop      # Stop tunnel
npm run webhook:set      # Set Telegram webhook to tunnel URL
npm run webhook:status   # Check webhook status
npm run webhook:clear    # Clear webhook
```

### Deployment

See `.github/workflows/` for CI/CD pipeline:

1. `1-build-test.yml` - Validation
2. `2-deploy-worker.yml` - Deploy backend
3. `3-deploy-pages.yml` - Deploy frontend
4. `4-setup-webhook.yml` - Configure webhook

## Important Notes

### Authentication

- All API endpoints (except `/api/health`) require authentication via middleware
- Session cookies are httpOnly, validated against KV store
- Admin endpoints use `admin-auth.ts` middleware (checks `telegramId === TELEGRAM_ADMIN_ID`)
- Regular endpoints use `telegram-auth.ts` middleware (validates session)
- Dev bypass: Creates mock user when `DEV_AUTH_BYPASS_ENABLED=true`

### Payment Flow

- Uses Telegram Stars API
- Atomic updates via `db.batch()` to ensure post + payment consistency
- Idempotency via `telegram_payment_charge_id`
- Webhook handlers MUST be registered before generic message handler in `webhook.ts`

### Image Handling

- Max 10 images per post
- Frontend crops images before upload (`react-easy-crop`)
- Backend generates thumbnails (max 800x800)
- R2 keys: `{userId}/{uuid}.{ext}` and `{userId}/thumb_{uuid}.{ext}`

### Frontend Routing

- React Router v7 with client-side routing
- Main routes: `/` (Feed), `/post/:postId` (PostPage), `/profile/:telegramId` (UnifiedProfile), `/edit-profile`, `/payments`
- Layout component wraps all routes with DeepLinkHandler for Telegram start parameters
- Bottom navigation for mobile UX
- IMPORTANT: When adding a new endpoint, add it to `Router.tsx`!

### Environment Variables

Required in `.env` (local) or Worker secrets (production):

- `TELEGRAM_BOT_TOKEN` - Bot API token
- `TELEGRAM_ADMIN_ID` - Admin user Telegram ID
- `PAGES_URL` - Frontend URL for CORS (optional, defaults to wildcard)
- `DEV_AUTH_BYPASS_ENABLED` - Enable mock auth (local only)

Wrangler bindings in `wrangler.toml`:

- `SESSIONS` (KV) - Session storage
- `DB` (D1) - Main database
- `IMAGES` (R2) - Image storage

## Critical Implementation Details

- Run & fix `npm run check` to find possible lint, type, test flaws

### Adding New API Endpoints

1. Create handler in `backend/src/api/*.ts`
2. Add route to `backend/src/index.ts`
3. Apply authentication middleware (`telegram-auth.ts` or `admin-auth.ts`)
4. Add corresponding route to `frontend/src/Router.tsx` if needed

### Database Schema Changes

1. Modify `backend/src/db/schema.ts`
2. Run `cd backend && npm run db:generate` to create migration
3. Review generated migration in `backend/drizzle/migrations/`
4. Apply locally: `npm run db:migrate:local`
5. Production migrations run automatically via `wrangler.toml` `migrations_dir` setting

### Comments System

- Comments stored in `comments` table with cascade delete on parent post
- Admin can hide/unhide comments (sets `isHidden` flag)
- Comment count cached in `posts.commentCount` for performance
- Notification sent to post author when new comment is created

### Deep Linking

- Telegram start parameters handled by `DeepLinkHandler` component
- Format: `https://t.me/bot_name?start=post_123` navigates to `/post/123`
- `ShareButton` component generates share links with deep link support
