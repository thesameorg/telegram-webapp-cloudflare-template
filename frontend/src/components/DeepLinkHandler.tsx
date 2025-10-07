import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTelegram } from "../utils/telegram";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

/**
 * DeepLinkHandler - Handles deep linking from Telegram start parameters
 * Format: https://t.me/BOT_USERNAME?startapp=post_123
 *
 * This component MUST be inside the Router context and will process
 * deep links AFTER authentication completes.
 */
export default function DeepLinkHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp, isWebAppReady } = useTelegram();
  const { isLoading: authIsLoading } = useAuth();
  const { showToast } = useToast();
  const deepLinkProcessedRef = useRef(false);

  useEffect(() => {
    // Only run once, after auth completes, on home page
    if (
      deepLinkProcessedRef.current ||
      authIsLoading ||
      location.pathname !== "/"
    ) {
      return;
    }

    // Check if we have a start_param from Telegram
    if (!isWebAppReady || !webApp) {
      return;
    }

    const startParam = webApp.initDataUnsafe?.start_param;

    if (!startParam) {
      return;
    }

    // Mark as processed to prevent re-running
    deepLinkProcessedRef.current = true;

    console.log("[DeepLinkHandler] Processing deep link after auth:", startParam);

    // Parse the start parameter
    // Expected format: post_123
    const postMatch = startParam.match(/^post_(\d+)$/);

    if (postMatch) {
      const postId = postMatch[1];
      console.log(`[DeepLinkHandler] Navigating to post: ${postId}`);

      // Navigate to the post
      navigate(`/post/${postId}`);
    } else {
      // Invalid format - show error and stay on home
      console.warn(`[DeepLinkHandler] Invalid start parameter format: ${startParam}`);
      showToast(`tgStartParam=${startParam} Not found`, "error", 4000);
    }
  }, [
    authIsLoading,
    isWebAppReady,
    webApp,
    location.pathname,
    navigate,
    showToast,
  ]);

  // This component doesn't render anything
  return null;
}
