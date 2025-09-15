// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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
import ResetPassword from "./pages/ResetPassword"; // ✅ added import

// Generalized ProtectedRoute for roles
function ProtectedRoute({
  children,
  allowedRoles = [],
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length && !allowedRoles.includes(userRole ?? "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/reset-password" element={<ResetPassword />} /> {/* ✅ added route */}

          {/* Dashboard accessible by all roles */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Role-based pages */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Project Manager", "Site Engineer", "Client"]}>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/phases"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Project Manager", "Site Engineer", "Client"]}>
                <Phases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Accounts", "Client"]}>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Project Manager", "Client"]}>
                <Materials />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Project Manager", "Client"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"]}>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"]}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin-only pages */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <RoleManagement />
              </ProtectedRoute>
            }
          />

          {/* Client renovation page */}
          <Route
            path="/renovations"
            element={
              <ProtectedRoute allowedRoles={["Client", "Admin", "Project Manager"]}>
                <Renovations />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
