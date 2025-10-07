import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTelegram } from "../utils/telegram";
import { useToast } from "./use-toast";

/**
 * Hook to handle deep linking from Telegram start parameters
 * Format: https://t.me/BOT_USERNAME?startapp=post_123
 *
 * This hook only processes the start_param when on the home page ("/")
 * to avoid conflicts with other routes.
 */
export function useDeepLink() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp, isWebAppReady } = useTelegram();
  const { showToast } = useToast();

  useEffect(() => {
    // Only process deep links on the home page
    if (location.pathname !== "/") {
      return;
    }

    if (!isWebAppReady || !webApp) {
      return;
    }

    // Get the start parameter from Telegram WebApp
    const startParam = webApp.initDataUnsafe?.start_param;

    // Debug logging
    console.log("[DeepLink] tgWebAppStartParam:", startParam);

    if (!startParam) {
      return;
    }

    // Parse the start parameter
    // Expected format: post_123
    const postMatch = startParam.match(/^post_(\d+)$/);

    if (postMatch) {
      const postId = postMatch[1];
      console.log(`[DeepLink] Navigating to post: ${postId}`);

      // Navigate to the post
      navigate(`/post/${postId}`);
    } else {
      // Invalid format - show error and stay on home
      console.warn(`[DeepLink] Invalid start parameter format: ${startParam}`);
      showToast(
        `tgStartParam=${startParam} Not found`,
        "error",
        4000
      );
    }
  }, [isWebAppReady, webApp, location.pathname, navigate, showToast]);
}
