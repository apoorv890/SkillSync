import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { memo, type ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { useAuth } from './hooks/useAuth';
import { Toaster } from './components/ui/sonner';
import type { ProtectedRouteProps } from './types';

import { DashboardLayout } from './components/admin-dashboard/dashboard-layout';
import { DashboardPage } from './components/admin-dashboard/dashboard-page';
import { UserLayout } from './components/layouts/UserLayout';
import JobsList from './components/JobsList';
import CreateJob from './components/CreateJob';
import JobDetails from './components/JobDetails';
import AuthPage from './pages/AuthPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import UserDashboard from './components/dashboard/UserDashboard';
import ProfilePage from './pages/ProfilePage';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const ProtectedRoute = memo(({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const Layout = isAdmin ? DashboardLayout : UserLayout;
  const forRole = (adminEl: ReactNode, userEl: ReactNode) =>
    isAdmin ? adminEl : userEl;

  if (isAuthenticated && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>{forRole(<DashboardPage />, <UserDashboard />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <Layout><JobsList /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-job"
        element={
          <ProtectedRoute adminOnly={true}>
            <DashboardLayout><CreateJob /></DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <ProtectedRoute>
            <Layout><JobDetails /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout><ProfilePage /></Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <AuthProvider>
          <DashboardProvider>
            <AppRoutes />
            <Toaster />
          </DashboardProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
