import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import FeedIcon from "./icons/feed.svg";
import ProfileIcon from "./icons/profile.svg";
import PaymentIcon from "./icons/payment.svg";

export default function BottomNavigation() {
  const { user, isAdmin } = useAuth();

  const navItems = [
    {
      path: "/",
      name: "Feed",
      icon: FeedIcon,
    },
    {
      path: user?.id ? `/profile/${user.id}` : "/profile/0",
      name: "Profile",
      icon: ProfileIcon,
    },
  ];

  // Add Payments tab for admins
  if (isAdmin) {
    navItems.push({
      path: "/payments",
      name: "Payments",
      icon: PaymentIcon,
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe">
      <div
        className="flex justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => {
              // Special red styling for Payments tab
              if (item.path === "/payments") {
                return `flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-red-600 dark:text-red-400"
                    : "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                }`;
              }
              // Default styling for other tabs
              return `flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors duration-200 ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`;
            }}
          >
            <img src={item.icon} className="w-5 h-5" alt="" />
            <span className="mt-1">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
