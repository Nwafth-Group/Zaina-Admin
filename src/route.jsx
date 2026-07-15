import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Operations from './pages/Operations.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import ProtectedRoute from './component/ProtectedRoute.jsx';
import PermissionRoute from './component/PermissionRoute.jsx';
import GuestRoute from './component/GuestRoute.jsx';
import Users from './pages/Users/Users.jsx';
import Clients from './pages/Clients/Clients.jsx';
import Categories from './pages/Categories/Categories.jsx';
import Services from './pages/Services/Services.jsx';
import Workers from './pages/Workers/Workers.jsx';
import Employees from './pages/Employees/Employess.jsx';
import Bookings from './pages/Bookings/Bookings.jsx';
import Banners from './pages/Banners/Banners.jsx';
import Announcements from './pages/Announcements/Announcements.jsx';
import Coupons from './pages/Coupons/Coupons.jsx';
import Settings from './pages/Settings/Settings.jsx';
import Countries from './pages/Settings/Countries.jsx';
import Cities from './pages/Settings/Cities.jsx';
import Areas from './pages/Settings/Areas.jsx';
import CompanyInfo from './pages/Settings/CompanyInfo.jsx';
import Roles from './pages/Roles/Roles.jsx';
import MobileNotifications from './pages/Notifications/MobileNotifications.jsx';
import Reports from './pages/Reports/Reports.jsx';
import LegalDocuments from './pages/LegalDocuments/LegalDocuments.jsx';
import PointsManagement from './pages/Points/PointsManagement.jsx';

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
        {
          path: 'banners',
          element: <Banners />,
        },
        {
          path: 'announcements',
          element: <Announcements />,
        },
        {
          path: 'mobile-notifications',
          element: <MobileNotifications />,
        },
        {
          path: 'coupons',
          element: <Coupons />,
        },
        {
          path: 'points',
          element: <PointsManagement />,
        },
        {
          path: 'legal-documents',
          element: <LegalDocuments />,
        },
        {
          path: 'reports',
          element: <Reports />,
        },
        {
          // Location management is gated behind the location.edit permission
          // (super-admin only). Direct URL access redirects to the dashboard.
          element: <PermissionRoute permission="location.edit" />,
          children: [
            { path: 'settings', element: <Settings /> },
            { path: 'settings/countries', element: <Countries /> },
            { path: 'settings/cities', element: <Cities /> },
            { path: 'settings/areas', element: <Areas /> },
            { path: 'settings/company-info', element: <CompanyInfo /> },
          ],
        },
        {
          element: <PermissionRoute permission="roles.view" />,
          children: [
            { path: 'roles', element: <Roles /> },
          ],
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
],
// ===> التعديل الجديد يبدأ من هنا <===
{
  basename: '/admin' // هذا السطر بيحكي للرياكت إن كل مشروعك بيبدأ من مجلد /admin
}

);