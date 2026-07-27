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
import ClientDetails from './pages/Clients/ClientDetails.jsx';
import Categories from './pages/Categories/Categories.jsx';
import Services from './pages/Services/Services.jsx';
import ServiceFormPage from './pages/Services/ServiceFormPage.jsx';
import ServiceDetails from './pages/Services/ServiceDetails.jsx';
import Workers from './pages/Workers/Workers.jsx';
import WorkerDetails from './pages/Workers/WorkerDetails.jsx';
import Employees from './pages/Employees/Employess.jsx';
import Bookings from './pages/Bookings/Bookings.jsx';
import BookingDetails from './pages/Bookings/BookingDetails.jsx';
import Banners from './pages/Banners/Banners.jsx';
import BannerDetails from './pages/Banners/BannerDetails.jsx';
import BannerFormPage from './pages/Banners/BannerFormPage.jsx';
import Announcements from './pages/Announcements/Announcements.jsx';
import AnnouncementDetails from './pages/Announcements/AnnouncementDetails.jsx';
import AnnouncementFormPage from './pages/Announcements/AnnouncementFormPage.jsx';
import Coupons from './pages/Coupons/Coupons.jsx';
import CouponDetails from './pages/Coupons/CouponDetails.jsx';
import CouponFormPage from './pages/Coupons/CouponFormPage.jsx';
import Settings from './pages/Settings/Settings.jsx';
import CompanyInfo from './pages/Settings/CompanyInfo.jsx';
import Roles from './pages/Roles/Roles.jsx';
import MobileNotifications from './pages/Notifications/MobileNotifications.jsx';
import MobileNotificationDetails from './pages/Notifications/MobileNotificationDetails.jsx';
import MobileNotificationFormPage from './pages/Notifications/MobileNotificationFormPage.jsx';
import Reports from './pages/Reports/Reports.jsx';
import LegalDocuments from './pages/LegalDocuments/LegalDocuments.jsx';
import PointsManagement from './pages/Points/PointsManagement.jsx';
import Reviews from './pages/Reviews/Reviews.jsx';
import Drivers from './pages/Drivers/Drivers.jsx';
import DriverFormPage from './pages/Drivers/DriverFormPage.jsx';
import DeparturePoints from './pages/DeparturePoints/DeparturePoints.jsx';
import DeparturePointFormPage from './pages/DeparturePoints/DeparturePointFormPage.jsx';
import ServiceZones from './pages/ServiceZones/ServiceZones.jsx';
import ServiceZoneFormPage from './pages/ServiceZones/ServiceZoneFormPage.jsx';
import TransportDispatch from './pages/Transport/TransportDispatch.jsx';
import TransportGroupDetails from './pages/Transport/TransportGroupDetails.jsx';

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <GuestRoute />,
    children: [
      { path: '', element: <AuthLayout />, children: [{ index: true, element: <LoginPage /> }, { path: 'login', element: <LoginPage /> }] },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children : [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
        {
          path: 'operations',
          element: <Operations />,
        },
        {
          element: <PermissionRoute permission="users.view" />,
          children: [
            { path: 'clients', element: <Clients /> },
            { path: 'clients/:id', element: <ClientDetails /> },
            { path: 'users', element: <Users /> },
          ],
        },
        {
          element: <PermissionRoute permission="categories.view" />,
          children: [
            { path: 'categories', element: <Categories /> },
          ],
        },
        {
          element: <PermissionRoute permission="services.view" />,
          children: [
            { path: 'services', element: <Services /> },
            { path: 'services/create', element: <ServiceFormPage /> },
            { path: 'services/:id', element: <ServiceDetails /> },
            { path: 'services/:id/edit', element: <ServiceFormPage /> },
          ],
        },
        {
          element: <PermissionRoute permission="workers.view" />,
          children: [
            { path: 'workers', element: <Workers /> },
            { path: 'workers/:id', element: <WorkerDetails /> },
          ],
        },
        {
          element: <PermissionRoute permission="reviews.view" />,
          children: [
            { path: 'reviews', element: <Reviews /> },
          ],
        },
        {
          element: <PermissionRoute permission="bookings.view" />,
          children: [
            { path: 'bookings', element: <Bookings /> },
            { path: 'bookings/:id', element: <BookingDetails /> },
          ],
        },
        {
          element: <PermissionRoute permission="banners.view" />,
          children: [
            { path: 'banners', element: <Banners /> },
            { path: 'banners/create', element: <BannerFormPage /> },
            { path: 'banners/:id', element: <BannerDetails /> },
            { path: 'banners/:id/edit', element: <BannerFormPage /> },
          ],
        },
        {
          element: <PermissionRoute permission="announcements.view" />,
          children: [
            { path: 'announcements', element: <Announcements /> },
            { path: 'announcements/create', element: <AnnouncementFormPage /> },
            { path: 'announcements/:id', element: <AnnouncementDetails /> },
            { path: 'announcements/:id/edit', element: <AnnouncementFormPage /> },
          ],
        },
        {
          element: <PermissionRoute permission="notifications.view" />,
          children: [
            { path: 'mobile-notifications', element: <MobileNotifications /> },
            { path: 'mobile-notifications/create', element: <MobileNotificationFormPage /> },
            { path: 'mobile-notifications/:id', element: <MobileNotificationDetails /> },
            { path: 'mobile-notifications/:id/edit', element: <MobileNotificationFormPage /> },
          ],
        },
        {
          element: <PermissionRoute permission="coupons.view" />,
          children: [
            { path: 'coupons', element: <Coupons /> },
            { path: 'coupons/create', element: <CouponFormPage /> },
            { path: 'coupons/:id', element: <CouponDetails /> },
            { path: 'coupons/:id/edit', element: <CouponFormPage /> },
          ],
        },
        {
          element: <PermissionRoute permission="points.view" />,
          children: [
            { path: 'points', element: <PointsManagement /> },
          ],
        },
        {
          element: <PermissionRoute permission="legal_documents.view" />,
          children: [
            { path: 'legal-documents', element: <LegalDocuments /> },
          ],
        },
        {
          element: <PermissionRoute permission="reports.view" />,
          children: [
            { path: 'reports', element: <Reports /> },
          ],
        },
        {
          element: <PermissionRoute permission="employees.view" />,
          children: [
            { path: 'employees', element: <Employees /> },
          ],
        },
        {
          // Location management is gated behind the location.edit permission
          // (super-admin only). Direct URL access redirects to the dashboard.
          element: <PermissionRoute permission="location.edit" />,
          children: [
            { path: 'settings', element: <Settings /> },
            { path: 'settings/company-info', element: <CompanyInfo /> },
          ],
        },
        { path: 'drivers', element: <Drivers /> },
        { path: 'drivers/create', element: <DriverFormPage /> },
        { path: 'drivers/:id/edit', element: <DriverFormPage /> },
        { path: 'departure-points', element: <DeparturePoints /> },
        { path: 'departure-points/create', element: <DeparturePointFormPage /> },
        { path: 'departure-points/:id/edit', element: <DeparturePointFormPage /> },
        { path: 'service-zones', element: <ServiceZones /> },
        { path: 'service-zones/create', element: <ServiceZoneFormPage /> },
        { path: 'service-zones/:id/edit', element: <ServiceZoneFormPage /> },
        { path: 'transport-dispatch', element: <TransportDispatch /> },
        { path: 'transport-dispatch/details', element: <TransportGroupDetails /> },
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