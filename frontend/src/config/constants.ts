// Build-time configuration constants
// These values are injected during the build process from environment variables

export const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://twa-cf-tpl-prod.workers.dev"
export const PAGES_URL = import.meta.env.VITE_PAGES_URL || "https://twa-cf-tpl.pages.dev"

// Additional configuration
export const API_TIMEOUT = 10000 // 10 seconds
export const CORS_ORIGINS = [
  PAGES_URL,
  "https://t.me" // Telegram WebApp
]