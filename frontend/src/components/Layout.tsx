import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import SimpleAuthWrapper from './SimpleAuthWrapper';

export default function Layout() {
  return (
    <SimpleAuthWrapper>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Main content area */}
        <main className="flex-1 pb-16 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom navigation */}
        <BottomNavigation />
      </div>
    </SimpleAuthWrapper>
  );
}