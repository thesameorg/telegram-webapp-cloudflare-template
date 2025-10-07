import { useState } from "react";
import { useTelegram } from "../utils/telegram";
import { config } from "../config";
import { useToast } from "../hooks/use-toast";

interface ShareButtonProps {
  postId: number;
  className?: string;
  title?: string;
}

/**
 * Share button component that creates a deep link for a post
 * Format: https://t.me/BOT_USERNAME?startapp=post_123
 */
export default function ShareButton({ postId, className = "", title = "Share post" }: ShareButtonProps) {
  const { webApp } = useTelegram();
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = () => {
    if (!config.telegramBotUsername) {
      showToast("Share feature not configured", "error");
      console.error("[ShareButton] VITE_TELEGRAM_BOT_USERNAME not set");
      return;
    }

    if (!webApp) {
      showToast("Telegram WebApp not available", "error");
      return;
    }

    setIsSharing(true);

    try {
      // Create the deep link
      const deepLink = `https://t.me/${config.telegramBotUsername}?startapp=post_${postId}`;

      console.log("[ShareButton] Sharing post:", postId);
      console.log("[ShareButton] Deep link:", deepLink);

      // Use Telegram's share URL functionality
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}`;

      // Open the share dialog
      webApp.openTelegramLink(shareUrl);

      showToast("Share dialog opened", "success");
    } catch (error) {
      console.error("[ShareButton] Error sharing:", error);
      showToast("Failed to open share dialog", "error");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors disabled:opacity-50 ${className}`}
      title={title}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </button>
  );
}
