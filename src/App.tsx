import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { LoginForm } from "./components/Auth/LoginForm";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { Expenses } from "./pages/Expenses";
import { Materials } from "./pages/Materials";
import { Reports } from "./pages/Reports";
import { Phases } from "./pages/Phases";
import { Users } from "./pages/Users";
import { Documents } from "./pages/Documents";
import { RoleManagement } from "./pages/RoleManagement";
import { Profile } from "./pages/Profile";
import { Renovations } from "./pages/Renovations";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import { AdminPayment } from "./pages/AdminPayment";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import { SharedProject } from './pages/SharedProject';
import { Settings } from './pages/Settings';
import { Calendar } from './pages/Calender';
import { UserFirstLogin } from './pages/UserFirstLogin';
import { DynamicDashboard } from './pages/DynamicDashboard';
import { DashboardBuilder } from './pages/DashboardBuilder';

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-secondary">Loading...</p>
      </div>
    </div>
  );
}

// Generalized ProtectedRoute for roles
function ProtectedRoute({
  children,
  requiredPermission,
}: {
  children: React.ReactNode;
  requiredPermission?: string;
}) {
  const { user, loading, permissions, userRole } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;

  // Admin always has access
  if (userRole === 'Admin') {
    return <>{children}</>;
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// App Routes Component
function AppRoutes() {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/support" element={<Support />} />
      
      {/* Shared project page - accessible without authentication */}
      <Route path="/shared/:shareId" element={<SharedProject />} />

      {/* User first login - match email link URL */}
      <Route path="/user-setup" element={<UserFirstLogin />} />
      <Route path="/first-login" element={<UserFirstLogin />} />

      {/* Dashboard - NOW USES DynamicDashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {userRole === 'Admin' ? <Dashboard /> : <DynamicDashboard />}
          </ProtectedRoute>
        }
      />

      {/* Dashboard Builder - Admin only */}
      <Route
        path="/dashboard-builder"
        element={
          <ProtectedRoute requiredPermission="view_roles">
            <DashboardBuilder />
          </ProtectedRoute>
        }
      />

      {/* Admin dashboard - Admin only */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute requiredPermission="view_roles">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Permission-based pages */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredPermission="view_projects">
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/phases"
        element={
          <ProtectedRoute requiredPermission="view_phases">
            <Phases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute requiredPermission="view_expenses">
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/materials"
        element={
          <ProtectedRoute requiredPermission="view_materials">
            <Materials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredPermission="view_reports">
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute requiredPermission="view_documents">
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredPermission="view_settings">
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute requiredPermission="view_calendar">
            <Calendar />
          </ProtectedRoute>
        }
      />

      {/* Permission-based management pages */}
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredPermission="view_users">
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute requiredPermission="view_roles">
            <RoleManagement />
          </ProtectedRoute>
        }
      />

      {/* Renovation page */}
      <Route
        path="/renovations"
        element={
          <ProtectedRoute>
            <Renovations />
          </ProtectedRoute>
        }
      />

      {/* Payment page */}
      <Route
        path="/admin/payment"
        element={
          <ProtectedRoute>
            <AdminPayment />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <Router>
            <AppRoutes />
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;