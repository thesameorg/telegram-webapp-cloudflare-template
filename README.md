# Telegram Web App + Bot Template

A production-ready template for building Telegram mini apps with payments and rich media. Everything runs on Cloudflare's free tier—no servers, no headaches.

**Try it live**: [https://t.me/telefare_bot](https://t.me/telefare_bot)

![App Screenshot](docs/images/app_screenshot.jpg)

📖 **Ready to build? Start with [QUICKSTART.md](docs/QUICKSTART.md)**



## What's Inside

I built this after getting tired of piecing together Telegram bot tutorials. Here's what you get:

- **Real payments** — Telegram Stars integration that actually works (with webhooks, refunds, the whole deal)
- **Image handling** — Upload, crop, compress. Stored in R2, served fast
- **Example app** — Instagram-style feed to show you how it all fits together
- **Full auth flow** — Sessions, admin roles, the security stuff you don't want to mess up
- **Local dev that works** — Test webhooks locally with ngrok, no deploy-pray-debug cycles

## Tech Stack

Built with tools that scale without costing you money:

- **Frontend**: React + TypeScript on [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- **Backend**: [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [Hono](https://hono.dev/) (like Express but faster)
- **Database**: D1 (SQLite) with [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: R2 for images, KV for sessions
- **Deploy**: GitHub Actions (push to main = live in 2 minutes)
- **Testing**: Vitest for both backend and frontend

Everything's typed, tested, and ready to customize.

📖 **Technical deep-dives in [SOLUTIONS.md](docs/SOLUTIONS.md)**
📖 **All commands in [COMMANDS.md](docs/COMMANDS.md)**

## Architecture

### Monorepo Structure
```
├── backend/          # Cloudflare Worker (Hono)
│   ├── api/         # Route handlers
│   ├── db/          # Schema & migrations (Drizzle)
│   └── webhook.ts   # Telegram bot handler
├── frontend/        # React SPA (Vite)
└── docs/            # Documentation
```

### Key Flows

**Authentication**: Telegram WebApp `initData` → Backend HMAC validation → Session in KV → httpOnly cookie

**Payments**: Invoice creation → Pre-checkout validation → `successful_payment` webhook → Atomic DB update

**Images**: Upload → Compression → Thumbnail generation → R2 storage → Public URLs

## Development

```bash
npm run dev              # Start both servers (backend:8787, frontend:3000)
npm run test             # Run all tests
npm run check            # typecheck + lint + test
npm run db:migrate:local # Apply DB migrations
```

**Local webhook testing**:
```bash
npm run tunnel:start     # Start ngrok
npm run webhook:set      # Point Telegram to tunnel
```

## Environment Setup

**Backend** (`backend/.env`):
```bash
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_ADMIN_ID=your_telegram_id
DEV_AUTH_BYPASS_ENABLED=true  # Optional: skip auth locally
```

**Production** (Cloudflare Worker secrets):
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_ID`
- `PAGES_URL` (optional CORS validation)

Bindings in `wrangler.toml`: `DB` (D1), `SESSIONS` (KV), `IMAGES` (R2)

## Deployment

**Automated** (GitHub Actions):
1. Push to main → Build → Tests → Deploy Worker → Deploy Pages → Set webhook

**Manual**:
```bash
cd backend && npx wrangler deploy
cd ../frontend && npm run build && npx wrangler pages deploy dist
```

## Database Schema

```typescript
Modify schema in `backend/src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate:local`
``` 

## Common Issues

**Port in use**: `npm run stop && npm run dev`

**Webhook not working**: Check `npm run webhook:status`, verify `TELEGRAM_BOT_TOKEN`

**Auth fails locally**: Set `DEV_AUTH_BYPASS_ENABLED=true` in `backend/.env`

**CORS errors**: Set `PAGES_URL` in Worker environment variables



## Security Notes

- HMAC signature validation on all Telegram data
- httpOnly session cookies prevent XSS
- Admin role checked on protected endpoints
- Drizzle ORM prevents SQL injection
- Never commit `.env` files



> [!IMPORTANT]
> When adding a new endpoint, add it to Router.tsx!

## 📖 Learn More

- [Telegram WebApps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)

## 📄 License

MIT
