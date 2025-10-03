import { Outlet } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import AuthRequired from "./AuthRequired";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

export default function Layout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <AuthRequired />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Main content area */}
      <main className="flex-1 pb-16 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNavigation />
    </div>
  );
}
