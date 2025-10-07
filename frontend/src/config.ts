// Configuration for frontend application
// API base URL changes based on environment

export const config = {
  // API base URL
  // - Production: Direct to Worker (VITE_WORKER_URL should be set during build)
  // - Development: Empty string (uses Vite proxy to localhost:8787)
  apiBaseUrl: import.meta.env.PROD ? import.meta.env.VITE_WORKER_URL || "" : "",

  // Telegram Bot Username (without @)
  // Used for deep linking: https://t.me/{botUsername}?startapp=post_{postId}
  telegramBotUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "",
};

// Warning: Log if VITE_WORKER_URL is missing in production
if (import.meta.env.PROD && !config.apiBaseUrl) {
  console.warn("VITE_WORKER_URL not set - API calls may fail in production");
}

// Warning: Log if VITE_TELEGRAM_BOT_USERNAME is missing
if (!config.telegramBotUsername) {
  console.warn("VITE_TELEGRAM_BOT_USERNAME not set - sharing functionality will not work");
}
