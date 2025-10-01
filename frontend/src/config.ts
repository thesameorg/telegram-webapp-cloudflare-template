// Configuration for frontend application
// API base URL changes based on environment

export const config = {
  // API base URL
  // - Production: Direct to Worker
  // - Development: Empty string (uses Vite proxy to localhost:8787)
  apiBaseUrl: import.meta.env.PROD
    ? 'https://twa-cf-tpl.dksg87.workers.dev'
    : '',
}
