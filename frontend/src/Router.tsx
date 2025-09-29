import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import MyPosts from './pages/MyPosts';
import Account from './pages/Account';

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
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}