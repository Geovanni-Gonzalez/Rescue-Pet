import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SmartRedirect } from './components/SmartRedirect';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ActivateAccount } from './pages/ActivateAccount';
import { ResendActivation } from './pages/ResendActivation';
import { Profile } from './pages/Profile';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { Pets } from './pages/Pets';
import { PetDetail } from './pages/PetDetail';
import { PetNew } from './pages/PetNew';
import { PetEdit } from './pages/PetEdit';
import { Catalog } from './pages/Catalog';
import { CompatibilityTestPage } from './pages/CompatibilityTestPage';
import { MyAdoptionRequests } from './pages/MyAdoptionRequests';
import { AdminAdoptionRequests } from './pages/AdminAdoptionRequests';
import { AdminAdoptionRequestDetail } from './pages/AdminAdoptionRequestDetail';
import { AdminUsers } from './pages/AdminUsers';
import { AdoptionRequestDetail } from './components/AdoptionRequestDetail';
import { ImmunizationAlerts } from './pages/ImmunizationAlerts';
import { AdminInterviewSlots } from './pages/AdminInterviewSlots';
import { NotificationCenter } from './pages/NotificationCenter';
import { TaskManagement } from './pages/TaskManagement';
import { AuditLog } from './pages/AuditLog';
import { AdminReports } from './pages/AdminReports';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/activate', element: <ActivateAccount /> },
  { path: '/resend-activation', element: <ResendActivation /> },

  // Protected routes
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <SmartRedirect /> },
          { path: 'dashboard', element: <PlaceholderPage title="Panel Principal" /> },
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
              { index: true, element: <PlaceholderPage title="Administración del Sistema" /> },
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
