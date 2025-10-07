import { useEffect, useRef } from "react";
import WebApp from "@twa-dev/sdk";

interface MainButtonOptions {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  textColor?: string;
}

/**
 * Hook to manage Telegram WebApp MainButton
 * Shows a native bottom button in the Telegram interface
 */
export function useTelegramMainButton(options: MainButtonOptions | null) {
  const { text, onClick, disabled, loading, color, textColor } = options || {};
  const onClickRef = useRef(onClick);

  // Keep onClick ref up to date
  useEffect(() => {
    if (onClick) {
      onClickRef.current = onClick;
    }
  }, [onClick]);

  useEffect(() => {
    if (!options) {
      // Hide button if no options provided
      WebApp.MainButton.hide();
      return;
    }

    const mainButton = WebApp.MainButton;

    // Set up the button
    if (text) {
      mainButton.setText(text);
    }

    if (color) {
      mainButton.setParams({ color });
    }

    if (textColor) {
      mainButton.setParams({ text_color: textColor });
    }

    // Handle disabled/loading state
    if (disabled || loading) {
      mainButton.disable();
      if (loading) {
        mainButton.showProgress(false);
      }
    } else {
      mainButton.enable();
      mainButton.hideProgress();
    }

    // Set up click handler
    const handleClick = () => {
      onClickRef.current?.();
    };

    mainButton.onClick(handleClick);
    mainButton.show();

    // Cleanup
    return () => {
      mainButton.offClick(handleClick);
      mainButton.hide();
      mainButton.hideProgress();
    };
  }, [options, text, disabled, loading, color, textColor]);
}
