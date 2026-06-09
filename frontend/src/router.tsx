import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SmartRedirect } from './components/SmartRedirect';
import { LoadingState } from './components/LoadingState';

// Pages are code-split per route. AppLayout, ProtectedRoute, and SmartRedirect
// stay eager: they are structural and tiny, and AppLayout hosts the Suspense
// boundary for every protected page. Public pages get their own boundary below.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const ActivateAccount = lazy(() => import('./pages/ActivateAccount').then((m) => ({ default: m.ActivateAccount })));
const ResendActivation = lazy(() => import('./pages/ResendActivation').then((m) => ({ default: m.ResendActivation })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Pets = lazy(() => import('./pages/Pets').then((m) => ({ default: m.Pets })));
const PetDetail = lazy(() => import('./pages/PetDetail').then((m) => ({ default: m.PetDetail })));
const PetNew = lazy(() => import('./pages/PetNew').then((m) => ({ default: m.PetNew })));
const PetEdit = lazy(() => import('./pages/PetEdit').then((m) => ({ default: m.PetEdit })));
const Catalog = lazy(() => import('./pages/Catalog').then((m) => ({ default: m.Catalog })));
const CompatibilityTestPage = lazy(() => import('./pages/CompatibilityTestPage').then((m) => ({ default: m.CompatibilityTestPage })));
const MyAdoptionRequests = lazy(() => import('./pages/MyAdoptionRequests').then((m) => ({ default: m.MyAdoptionRequests })));
const AdminAdoptionRequests = lazy(() => import('./pages/AdminAdoptionRequests').then((m) => ({ default: m.AdminAdoptionRequests })));
const AdminAdoptionRequestDetail = lazy(() => import('./pages/AdminAdoptionRequestDetail').then((m) => ({ default: m.AdminAdoptionRequestDetail })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdoptionRequestDetail = lazy(() => import('./components/AdoptionRequestDetail').then((m) => ({ default: m.AdoptionRequestDetail })));
const ImmunizationAlerts = lazy(() => import('./pages/ImmunizationAlerts').then((m) => ({ default: m.ImmunizationAlerts })));
const AdminInterviewSlots = lazy(() => import('./pages/AdminInterviewSlots').then((m) => ({ default: m.AdminInterviewSlots })));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter').then((m) => ({ default: m.NotificationCenter })));
const TaskManagement = lazy(() => import('./pages/TaskManagement').then((m) => ({ default: m.TaskManagement })));
const AuditLog = lazy(() => import('./pages/AuditLog').then((m) => ({ default: m.AuditLog })));
const AdminReports = lazy(() => import('./pages/AdminReports').then((m) => ({ default: m.AdminReports })));

// Suspense boundary for public pages (rendered outside AppLayout).
const publicEl = (el: ReactNode) => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><LoadingState /></div>}>
    {el}
  </Suspense>
);

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: publicEl(<Login />) },
  { path: '/register', element: publicEl(<Register />) },
  { path: '/forgot-password', element: publicEl(<ForgotPassword />) },
  { path: '/reset-password', element: publicEl(<ResetPassword />) },
  { path: '/activate', element: publicEl(<ActivateAccount />) },
  { path: '/resend-activation', element: publicEl(<ResendActivation />) },

  // Protected routes
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <SmartRedirect /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'profile', element: <Profile /> },
          { path: 'pets', element: <Pets /> },
          { path: 'pets/:id', element: <PetDetail /> },
          { path: 'notifications', element: <NotificationCenter /> },
          {
            path: 'immunization-alerts',
            element: <ProtectedRoute allowedRoles={['ADMIN', 'VETERINARIAN', 'VOLUNTEER']} />,
            children: [{ index: true, element: <ImmunizationAlerts /> }],
          },
          {
            path: 'tasks',
            element: <ProtectedRoute allowedRoles={['ADMIN', 'VETERINARIAN', 'VOLUNTEER']} />,
            children: [{ index: true, element: <TaskManagement /> }],
          },

          // Adoptante
          {
            path: 'catalog',
            element: <ProtectedRoute allowedRoles={['ADOPTER']} />,
            children: [{ index: true, element: <Catalog /> }],
          },
          {
            path: 'compatibility-test',
            element: <ProtectedRoute allowedRoles={['ADOPTER']} />,
            children: [{ index: true, element: <CompatibilityTestPage /> }],
          },
          {
            path: 'adoption',
            element: <ProtectedRoute allowedRoles={['ADOPTER']} />,
            children: [
              { path: 'my-requests', element: <MyAdoptionRequests /> },
              { path: 'my-requests/:id', element: <AdoptionRequestDetail /> },
            ],
          },

          // Admin / Voluntario
          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={['ADMIN', 'VOLUNTEER']} />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'pets/new', element: <PetNew /> },
              { path: 'pets/:id/edit', element: <PetEdit /> },
              { path: 'adoption-requests', element: <AdminAdoptionRequests /> },
              { path: 'adoption-requests/:id', element: <AdminAdoptionRequestDetail /> },
              { path: 'interview-slots', element: <AdminInterviewSlots /> },
              {
                path: 'users',
                element: <ProtectedRoute allowedRoles={['ADMIN']} />,
                children: [{ index: true, element: <AdminUsers /> }],
              },
              {
                path: 'reports',
                element: <ProtectedRoute allowedRoles={['ADMIN']} />,
                children: [{ index: true, element: <AdminReports /> }],
              },
              {
                path: 'audit',
                element: <ProtectedRoute allowedRoles={['ADMIN']} />,
                children: [{ index: true, element: <AuditLog /> }],
              },
            ],
          },
        ],
      },
    ],
  },
]);
