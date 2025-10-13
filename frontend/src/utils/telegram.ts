import { useState, useEffect } from "react";
import { WebApp } from "@twa-dev/types";

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [isWebAppReady, setIsWebAppReady] = useState(false);

  useEffect(() => {
    const initializeTelegram = () => {
      if (
        globalThis.window !== undefined &&
        globalThis.window.Telegram?.WebApp
      ) {
        const tg = globalThis.window.Telegram.WebApp;
        setWebApp(tg);
        tg.ready();
        tg.expand();
        setIsWebAppReady(true);
      } else {
        setIsWebAppReady(false);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeTelegram);
      return () =>
        document.removeEventListener("DOMContentLoaded", initializeTelegram);
    } else {
      initializeTelegram();
    }
  }, []);

  return { webApp, isWebAppReady };
}
