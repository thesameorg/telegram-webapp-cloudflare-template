import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import MyPosts from './pages/MyPosts';
import Account from './pages/Account';
import UserProfile from './pages/UserProfile';
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
        path: 'my-posts',
        element: <MyPosts />,
      },
      {
        path: 'account',
        element: <Account />,
      },
      {
        path: 'edit-profile',
        element: <EditProfile />,
      },
      {
        path: 'profile/:telegramId',
        element: <UserProfile />,
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}