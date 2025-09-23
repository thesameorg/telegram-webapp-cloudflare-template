# 📋 Technical Specification: Telegram Web App on Cloudflare Stack


## 🏗️ **Architecture Stack**

**Main Components:**

- **Cloudflare Workers** - API and server logic with **Hono.js** framework
- **Cloudflare D1** - main database (SQLite)
- **Cloudflare KV** - caching + CQRS read-models
- **Cloudflare R2** - user files (compressed, no EXIF)
- **Zod** - TypeScript schema validation
- **Drizzle ORM** - for DB ORM
- **Canvas API** - for browser image optimization
---

## Technical Requirements

- HTTPS only
- Responsive design
- Fast loading (recommended under 3 seconds)
- Support for Telegram dark and light themes with theme change detection
- Using telegram web-app js with viewport change detection

- Mandatory calls:
    - `Telegram.WebApp.ready();` // Notifies that app is ready
    - `Telegram.WebApp.expand();` // Expands to full screen
    - Handle `Telegram.WebApp.onEvent('themeChanged', callback)`
    - Handle `Telegram.WebApp.onEvent('viewportChanged', callback)`


### Authentication

- Using telegram web-app js for user authentication (webapp.initData)
- validates initdata signature with bot token + HMAC-SHA256
- gives user JWT token, 24h lifetime


## 🗄️ **Database (D1)**

**Main entities (examples):**

- **users**
- **user_content** - main user content


## KV Usage
- User sessions

## R2 Usage
- Used for storing user-uploaded images



## 🌐 **Frontend (Cloudflare Pages)**

Organized as Cloudflare Pages

### **Technologies:**

- **React + Vite** - main stack
- **Tailwind CSS** - styling
- **@twa-dev/sdk** - Telegram integration
- **TypeScript** - typing


## 🚀 **CI/CD and Environments**

Everything is deployed to Cloudflare Worker + Pages, using github actions workflow. 
### **Only 3 Environments:**

- **Local** - to run on dev machine. 
	- includes all `wrangler` infrastructure
	- does not use remote data
	- has make-scripts to copy data from prod (or previe)
	- uses cloudflared tunnel + script to make bot use correct webhook 
- **Preview** - all other branches.
	- use same cf d1 r2 kv objects
- **Production** - `main` branch

Each environment deploys to its own worker + infrastructure on Cloudflare, has its own telegram bot: 1 for local, 1 for preview, 1 for prod. 
Workflows run tests, and are split into manageable components. 


### **Environment Variables / Secrets:**

##### **GitHub Secrets (for CI/CD):**

```
CLOUDFLARE_API_TOKEN     - for wrangler deploy
CLOUDFLARE_ACCOUNT_ID    - for wrangler deploy
```

##### **Cloudflare Secret Store (runtime secrets):**

```bash
# Set via wrangler secret put
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put JWT_SECRET --env production
# WEBHOOK_SECRET
# 
# .... etc...
```
