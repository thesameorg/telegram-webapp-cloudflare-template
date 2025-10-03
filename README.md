# Telegram Web App + Bot Template

This is a full-stack Telegram Web App + Bot template, including: ⭐️ payments and image handling. Deployed for free on Cloudflare Workers (backend) and Pages (frontend) with D1 database, KV sessions, and R2 storage. 


**Example Bot**: [https://t.me/telefare_bot](https://t.me/telefare_bot)

![App Screenshot](docs/images/app_screenshot.jpg)

📖 **To begin, go to [QUICKSTART.md](docs/QUICKSTART.md)**



## 🚀 Features

### Core Functionality
- **Instagram-like App**: Example is an instagram-like app, go check it out!
- **Telegram Stars Payments**: Uses telegram stars for paid posts 
- **Image Upload & Processing**: Multi-image posts with thumbnails & cropping

### Technical Stack
- **Frontend**: Cloudflare Pages: React + TypeScript + Vite
- **Backend**: [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [Hono Framework](https://hono.dev/)
- **Database**: D1 SQLite with [Drizzle ORM](https://orm.drizzle.team/) & Migrations
- **Storage**: R2 for images, KV for sessions
- **CI/CD**: GitHub Actions deployment pipeline
- **Testing**: Vitest for backend and frontend
- **Multiple Environments**: local bypass, ngrok tunnel, deployed


📖 **Some technical solutions are described at [SOLUTIONS.md](docs/SOLUTIONS.md)**
📖 **Commands are at [COMMANDS.md](docs/COMMANDS.md)**




## 📖 Learn More

- [Telegram WebApps](https://core.telegram.org/bots/webapps)
- 


## 📄 License

MIT
