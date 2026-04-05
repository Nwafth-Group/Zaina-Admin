import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Operations from './pages/Operations.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    // مسارات لوحة التحكم (التي تتطلب تسجيل دخول لاحقاً)
    path: '/',
    element: <AdminLayout />,
    children: [
      {
        index: true, // يعني لما نفتح / رح يفتح الـ Dashboard
        element: <Dashboard />,
      },
      {
        path: 'operations', // يعني المسار /operations
        element: <Operations />,
      },
    ],
  },
  {
    // في حال دخل اليوزر رابط غير موجود (صفحة 404)
    path: '*',
    element: <div className="p-10 text-center text-2xl text-red-500">الصفحة غير موجودة 404</div>
  }
]);