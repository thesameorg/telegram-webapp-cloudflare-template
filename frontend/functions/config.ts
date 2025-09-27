// Configuration for Pages Functions
// This file is deployed alongside the functions

export const WORKER_URL = "https://twa-cf-tpl-prod.workers.dev"
export const PAGES_URL = "https://twa-cf-tpl.pages.dev"

export const CORS_ORIGINS = [
  PAGES_URL,
  "https://t.me" // Telegram WebApp
]