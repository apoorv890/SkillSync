import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { memo } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider } from './contexts/DashboardContext';
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

  if (isAuthenticated === undefined || (isAuthenticated && !user)) {
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

      {isAuthenticated && isAdmin ? (
        <>
          <Route
            path="/"
            element={
              <ProtectedRoute adminOnly={true}>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute adminOnly={true}>
                <DashboardLayout>
                  <JobsList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-job"
            element={
              <ProtectedRoute adminOnly={true}>
                <DashboardLayout>
                  <CreateJob />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute adminOnly={true}>
                <DashboardLayout>
                  <JobDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute adminOnly={true}>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </>
      ) : (
        <>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <UserLayout>
                  <UserDashboard />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <UserLayout>
                  <JobsList />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute>
                <UserLayout>
                  <JobDetails />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserLayout>
                  <ProfilePage />
                </UserLayout>
              </ProtectedRoute>
            }
          />
        </>
      )}

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
