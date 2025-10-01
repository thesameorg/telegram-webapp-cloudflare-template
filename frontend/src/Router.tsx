import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import UnifiedProfile from './pages/UnifiedProfile';
import EditProfile from './pages/EditProfile';
import Payments from './pages/Payments';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Feed />,
      },
      {
        path: 'edit-profile',
        element: <EditProfile />,
      },
      {
        path: 'profile/:telegramId',
        element: <UnifiedProfile />,
      },
      {
        path: 'payments',
        element: <Payments />,
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}