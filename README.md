📖 **For detailed setup instructions, see [QUICKSTART.md](docs/QUICKSTART.md)**


# Telegram Web App + Bot Template

**Live Demo**: [https://telefare-pages.pages.dev/](https://telefare-pages.pages.dev/) | **Bot**: [https://t.me/telefare_bot](https://t.me/telefare_bot)

A full-stack Telegram Web App template with bot integration, payments, and image handling. Deployed on Cloudflare Workers (backend) and Pages (frontend) with D1 database, KV sessions, and R2 storage.

## 🚀 Features

### Core Functionality
- **Telegram Bot Integration**: `/start` and `/repo` commands with Web App button
- **Telegram Stars Payments**: Integrated payment flow with webhook handling
- **Image Upload & Processing**: Multi-image posts with automatic thumbnails (R2 storage)
- **User Profiles**: Customizable profiles with avatars and contact info
- **Social Feed**: Posts with star payments and image galleries

### Technical Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Cloudflare Workers + Hono framework
- **Database**: D1 SQLite with Drizzle ORM
- **Storage**: R2 for images, KV for sessions
- **Auth**: HMAC-validated Telegram initData
- **CI/CD**: GitHub Actions deployment pipeline

### Developer Experience
- **Monorepo Structure**: Organized backend/frontend separation
- **Type Safety**: Full TypeScript coverage
- **Local Development**: ngrok tunnel for real webhook testing
- **Testing**: Vitest for backend and frontend
- **Database Tools**: Drizzle Studio and migration management


## 📋 Prerequisites

### Required
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Telegram Bot Token** - Create bots via [@BotFather](https://t.me/botfather)
- **Cloudflare Account** - [Sign up](https://dash.cloudflare.com/sign-up)
- **Wrangler CLI** - Installed via npm

### Recommended for Local Development
- **ngrok** - [Install](https://ngrok.com/download) for webhook testing
- **jq** - [Install](https://jqlang.github.io/jq/download/) for JSON processing


## 🏗️ Architecture

### Project Structure
```
├── backend/              # Cloudflare Worker (Hono)
│   ├── src/
│   │   ├── api/         # API endpoints (auth, posts, payments, profile, admin)
│   │   ├── db/          # Database schema (Drizzle ORM)
│   │   ├── middleware/  # Auth middleware
│   │   ├── services/    # Business logic
│   │   └── webhook.ts   # Telegram bot webhook handler
│   └── wrangler.toml    # Cloudflare bindings config
├── frontend/            # React SPA
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Route pages
│   │   └── services/    # API client
│   └── vite.config.ts   # Dev proxy to backend
└── scripts/             # Tunnel and webhook management
```

### Data Flow

**Authentication**:
1. Telegram WebApp provides `initData` via SDK
2. Frontend sends to `/api/auth` with HMAC signature
3. Backend validates using `TELEGRAM_BOT_TOKEN`
4. Session stored in KV, cookie returned

**Payments Flow**:
1. User creates post with star amount
2. Frontend requests invoice from `/api/payments/create-invoice`
3. Telegram processes payment
4. Webhook receives `pre_checkout_query` → validates → `successful_payment`
5. Atomic DB update (post + payment) via `db.batch()`
6. Notifications sent to user

**Image Upload**:
1. Frontend crops/compresses image
2. Uploads to `/api/posts/:postId/images` or `/api/profile/me/avatar`
3. Backend generates thumbnail using `browser-image-compression`
4. Stores original + thumbnail in R2
5. Saves keys to D1 `postImages` table


## 🛠️ Common Commands

### Development
```bash
npm run dev              # Start both backend (8787) and frontend (3000)
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run stop             # Kill all dev servers
```

### Testing & Quality
```bash
npm run test             # All tests (backend + frontend)
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run check            # typecheck + lint + test
npm run clean-check      # Clean install + build + check
```

### Database
```bash
npm run db:migrate:local           # Apply migrations locally
cd backend && npm run db:generate  # Generate migration from schema
cd backend && npm run db:studio    # Open Drizzle Studio
```

### Local Telegram Integration
```bash
npm run tunnel:start     # Start ngrok tunnel
npm run tunnel:status    # Check tunnel status
npm run tunnel:stop      # Stop tunnel
npm run webhook:set      # Set Telegram webhook to tunnel
npm run webhook:status   # Check webhook
npm run webhook:clear    # Clear webhook
```


## 🚢 Deployment

Automated via GitHub Actions:
1. `1-build-test.yml` - Validation
2. `2-deploy-worker.yml` - Backend deployment
3. `3-deploy-pages.yml` - Frontend deployment
4. `4-setup-webhook.yml` - Webhook configuration

### Environment Variables

**Local** (`.env` in `backend/`):
- `TELEGRAM_BOT_TOKEN` - Bot API token
- `TELEGRAM_ADMIN_ID` - Admin Telegram ID
- `DEV_AUTH_BYPASS_ENABLED` - Enable mock auth (optional)

**Production** (Worker secrets):
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_ID`
- `PAGES_URL` - Frontend URL for CORS

**Cloudflare Bindings** (defined in deployment):
- `SESSIONS` (KV) - Session storage
- `DB` (D1) - SQLite database
- `IMAGES` (R2) - Image bucket


## 📚 API Endpoints

### Public
- `GET /api/health` - Health check

### Authenticated
- `POST /api/auth` - Create session
- `GET /api/posts` - Get feed
- `POST /api/posts` - Create post
- `POST /api/posts/:id/images` - Upload images
- `GET /api/profile/me` - Get own profile
- `PUT /api/profile/me` - Update profile
- `POST /api/profile/me/avatar` - Upload avatar
- `POST /api/payments/create-invoice` - Generate payment
- `GET /api/payments` - Payment history

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/ban` - Ban user


## 📝 Database Schema

- **`posts`** - User posts with optional star payments
- **`payments`** - Telegram Stars payment records
- **`userProfiles`** - User profiles with avatars
- **`postImages`** - Image metadata for R2 objects


## 🔧 Configuration

### Backend Port
Backend runs on port `8787`. Frontend Vite dev server proxies API requests.

### Image Limits
- Max 10 images per post
- Thumbnails: 800x800px
- R2 keys: `{userId}/{uuid}.{ext}` and `{userId}/thumb_{uuid}.{ext}`

### Auth Bypass (Local Only)
Set `DEV_AUTH_BYPASS_ENABLED=true` in `.env` to use mock authentication.


## 📖 Learn More

- [QUICKSTART.md](docs/QUICKSTART.md) - Step-by-step setup guide
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApps](https://core.telegram.org/bots/webapps)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)


## 📄 License

MIT
