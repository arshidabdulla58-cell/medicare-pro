import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { LoadingState } from './components/common/QueryState';
import { AuthSessionBootstrap } from './components/auth/AuthSessionBootstrap';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './features/auth/auth-store';

const HomePage = lazy(() => import('./pages/public/HomePage').then((module) => ({ default: module.HomePage })));
const AboutPage = lazy(() => import('./pages/public/AboutPage').then((module) => ({ default: module.AboutPage })));
const DepartmentsPage = lazy(() => import('./pages/public/DepartmentsPage').then((module) => ({ default: module.DepartmentsPage })));
const DoctorsPage = lazy(() => import('./pages/public/DoctorsPage').then((module) => ({ default: module.DoctorsPage })));
const ServicesPage = lazy(() => import('./pages/public/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const ContactPage = lazy(() => import('./pages/public/ContactPage').then((module) => ({ default: module.ContactPage })));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const StaffWorkspacePage = lazy(() => import('./pages/operations/StaffWorkspacePage').then((module) => ({ default: module.StaffWorkspacePage })));
const PatientAppointmentsPage = lazy(() => import('./pages/patient/PatientAppointmentsPage').then((module) => ({ default: module.PatientAppointmentsPage })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthSessionBootstrap />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="login" element={<Suspense fallback={<LoadingState label="Loading sign in" />}><LoginPage /></Suspense>} />
          <Route path="register" element={<Suspense fallback={<LoadingState label="Loading registration" />}><RegisterPage /></Suspense>} />
          <Route path="forgot-password" element={<Suspense fallback={<LoadingState label="Loading password reset" />}><ForgotPasswordPage /></Suspense>} />
          <Route path="reset-password" element={<Suspense fallback={<LoadingState label="Loading password reset" />}><ResetPasswordPage /></Suspense>} />
          <Route index element={<Suspense fallback={<LoadingState label="Loading page" />}><HomePage /></Suspense>} />
          <Route path="about" element={<Suspense fallback={<LoadingState label="Loading page" />}><AboutPage /></Suspense>} />
          <Route path="departments" element={<Suspense fallback={<LoadingState label="Loading page" />}><DepartmentsPage /></Suspense>} />
          <Route path="doctors" element={<Suspense fallback={<LoadingState label="Loading page" />}><DoctorsPage /></Suspense>} />
          <Route path="services" element={<Suspense fallback={<LoadingState label="Loading page" />}><ServicesPage /></Suspense>} />
          <Route path="contact" element={<Suspense fallback={<LoadingState label="Loading page" />}><ContactPage /></Suspense>} />
          <Route path="my-appointments" element={<Suspense fallback={<LoadingState label="Loading your appointments" />}><PatientAppointmentsRoute /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<LoadingState label="Loading page" />}><NotFoundPage /></Suspense>} />
        </Route>
        <Route path="workspace" element={<Suspense fallback={<LoadingState label="Loading staff workspace" />}><StaffWorkspaceRoute /></Suspense>} />
      </Routes>
    </BrowserRouter>
  );
}

function StaffWorkspaceRoute() {
  const { authReady, user } = useAuthStore();
  const location = useLocation();
  if (!authReady) return <LoadingState label="Restoring your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(user.role)) return <Navigate to="/" replace />;
  return <StaffWorkspacePage />;
}

function PatientAppointmentsRoute() {
  const { authReady, user } = useAuthStore();
  const location = useLocation();
  if (!authReady) return <LoadingState label="Restoring your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== 'PATIENT') return <Navigate to={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'RECEPTIONIST' ? '/workspace' : '/'} replace />;
  return <PatientAppointmentsPage />;
}
