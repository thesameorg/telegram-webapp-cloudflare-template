/**
 * @deprecated This hook has been moved to DeepLinkHandler component to ensure deep linking
 * only happens AFTER authentication completes and within proper Router context.
 * This prevents race conditions between auth flow and navigation.
 *
 * Deep linking is now handled automatically by DeepLinkHandler in Layout - no need to call this hook.
 *
 * If you need to use deep linking:
 * - Remove all useDeepLink() calls from your components
 * - Deep linking works automatically via DeepLinkHandler component
 *
 * Format: https://t.me/BOT_USERNAME?startapp=post_123
 */
export function useDeepLink() {
  console.warn(
    "[useDeepLink] This hook is deprecated. Deep linking is now handled by DeepLinkHandler component."
  );
  // No-op - functionality moved to DeepLinkHandler component
}
