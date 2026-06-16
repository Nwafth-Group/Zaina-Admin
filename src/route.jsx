import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Operations from './pages/Operations.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import ProtectedRoute from './component/ProtectedRoute.jsx';
import GuestRoute from './component/GuestRoute.jsx';
import Users from './pages/Users/Users.jsx';
import Clients from './pages/Clients/Clients.jsx';
import Categories from './pages/Categories/Categories.jsx';
import Services from './pages/Services/Services.jsx';
import Workers from './pages/Workers/Workers.jsx';
import Employees from './pages/Employees/Employess.jsx';
import Bookings from './pages/Bookings/Bookings.jsx';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children : [
      {
        path: '/auth',
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
          {
            path: 'login',
            element: <LoginPage />,
          },
        ],
      },
    ]
  },
   
  {
    element: <ProtectedRoute />,
    children : [
      {
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
        {
          path: 'clients',
          element: <Clients />,
        },
        {
          path: 'users', // يعني المسار /operations
          element: <Users />,
        },
        {
          path: 'categories', // يعني المسار /operations
          element: <Categories />,
        },
        {
          path: 'services', // يعني المسار /operations
          element: <Services />,
        },
        {
          path: 'workers', // يعني المسار /operations
          element: <Workers />,
        },
        {
          path: 'employees', // يعني المسار /operations
          element: <Employees />,
        },
        {
          path: 'bookings',
          element: <Bookings />,
        },
      ],
      }
    ]
    // مسارات لوحة التحكم (التي تتطلب تسجيل دخول لاحقاً)
  },
  {
    // في حال دخل اليوزر رابط غير موجود (صفحة 404)
    path: '*',
    element: <div className="p-10 text-center text-2xl text-red-500">الصفحة غير موجودة 404</div>
  }
]);