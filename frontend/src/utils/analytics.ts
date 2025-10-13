declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
  var gtag: ((...args: unknown[]) => void) | undefined;
}

export const trackPageView = (path: string) => {
  globalThis.gtag?.("config", import.meta.env.VITE_GA_MEASUREMENT_ID, {
    page_path: path,
  });
};

export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>,
) => {
  globalThis.gtag?.("event", eventName, params);
};
