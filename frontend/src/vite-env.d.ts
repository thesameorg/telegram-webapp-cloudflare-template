/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_URL: string;
  readonly VITE_R2_URL: string;
  readonly VITE_TELEGRAM_BOT_USERNAME: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
