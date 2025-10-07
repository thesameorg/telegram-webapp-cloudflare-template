/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_URL: string;
  readonly VITE_R2_URL: string;
  readonly VITE_TELEGRAM_BOT_USERNAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
