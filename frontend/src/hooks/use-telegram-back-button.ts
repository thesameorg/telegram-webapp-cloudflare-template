import { useEffect, useRef } from "react";
import WebApp from "@twa-dev/sdk";

/**
 * Hook to manage Telegram WebApp BackButton
 * Shows a native back button in the Telegram header
 */
export function useTelegramBackButton(onBack: (() => void) | null) {
  const onBackRef = useRef(onBack);

  // Keep onBack ref up to date
  useEffect(() => {
    if (onBack) {
      onBackRef.current = onBack;
    }
  }, [onBack]);

  useEffect(() => {
    if (!onBack) {
      // Hide button if no handler provided
      WebApp.BackButton.hide();
      return;
    }

    const backButton = WebApp.BackButton;

    // Set up click handler
    const handleClick = () => {
      onBackRef.current?.();
    };

    backButton.onClick(handleClick);
    backButton.show();

    // Cleanup
    return () => {
      backButton.offClick(handleClick);
      backButton.hide();
    };
  }, [onBack]);
}
