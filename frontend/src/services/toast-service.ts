import type { ToastType } from "../components/Toast";

type ToastListener = (
  message: string,
  type: ToastType,
  duration?: number,
) => void;

/**
 * Global toast notification service
 * Can be used from anywhere in the app, including outside React components
 */
class ToastService {
  private readonly listeners: Set<ToastListener> = new Set();

  /**
   * Subscribe to toast notifications (used by ToastProvider)
   */
  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Show a toast notification
   */
  show(message: string, type: ToastType = "info", duration?: number) {
    this.listeners.forEach((listener) => listener(message, type, duration));
  }

  /**
   * Convenience methods
   */
  success(message: string, duration?: number) {
    this.show(message, "success", duration);
  }

  error(message: string, duration?: number) {
    this.show(message, "error", duration);
  }

  info(message: string, duration?: number) {
    this.show(message, "info", duration);
  }
}

// Singleton instance
export const toastService = new ToastService();
