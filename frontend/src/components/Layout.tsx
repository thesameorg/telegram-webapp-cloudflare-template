import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNavigation from "./BottomNavigation";
import AuthRequired from "./AuthRequired";
import LoadingSpinner from "./LoadingSpinner";
import DeepLinkHandler from "./DeepLinkHandler";
import { useAuth } from "../contexts/AuthContext";
import { trackPageView } from "../utils/analytics";

export default function Layout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <AuthRequired />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Deep link handler - processes Telegram start_param after auth */}
      <DeepLinkHandler />

      {/* Main content area */}
      <main className="flex-1 pb-16 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNavigation />
    </div>
  );
}
