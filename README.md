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




> [!IMPORTANT]
> When adding a new endpoint, add it ot Router.tsx!

--- 

## 📖 Learn More

- [Telegram WebApps](https://core.telegram.org/bots/webapps)



## 📄 License

MIT
