import { useState, useEffect } from "react";

function calculateTimeLeft(expiresAt: number | null | undefined): string {
  if (!expiresAt) {
    return "N/A";
  }

  const now = Date.now();
  const timeLeftMs = expiresAt - now;

  if (timeLeftMs > 0) {
    const minutes = Math.floor(timeLeftMs / 60000);
    const seconds = Math.floor((timeLeftMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  return "Expired";
}

export function useCountdown(expiresAt: number | null | undefined) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(expiresAt));

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const updateTimeLeft = () => {
      setTimeLeft(calculateTimeLeft(expiresAt));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}
