import { useState } from "react";
import { useTelegram } from "../utils/telegram";
import { config } from "../config";
import { useToast } from "../hooks/use-toast";
import ShareIcon from "./icons/share.svg";

interface ShareButtonProps {
  postId: number;
  className?: string;
  title?: string;
}

/**
 * Share button component that creates a deep link for a post
 * Format: https://t.me/BOT_USERNAME?startapp=post_123
 */
export default function ShareButton({
  postId,
  className = "",
  title = "Share post",
}: ShareButtonProps) {
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
      <img src={ShareIcon} className="w-4 h-4" alt="" />
    </button>
  );
}
