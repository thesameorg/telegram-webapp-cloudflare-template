declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
    GA_MEASUREMENT_ID?: string;
  }
}

const GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || window.GA_MEASUREMENT_ID;

export const trackPageView = (path: string) => {
  if (
    typeof window !== "undefined" &&
    window.gtag &&
    GA_MEASUREMENT_ID &&
    GA_MEASUREMENT_ID !== "%VITE_GA_MEASUREMENT_ID%"
  ) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: path,
    });
  }
};

export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
};
