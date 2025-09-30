import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import UnifiedProfile from './pages/UnifiedProfile';
import EditProfile from './pages/EditProfile';

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
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}