declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackPageView = (path: string) => {
  window.gtag?.("config", import.meta.env.VITE_GA_MEASUREMENT_ID, {
    page_path: path,
  });
};

export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>,
) => {
  window.gtag?.("event", eventName, params);
};
