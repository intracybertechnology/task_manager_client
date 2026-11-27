import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSkeleton } from '../components/ui/feedback';

import LoginPage from '../features/auth/LoginPage';
import ChangePasswordPage from '../features/auth/ChangePasswordPage';
import AppLayout from '../components/layout/AppLayout';

// Employee
import MyTasksPage from '../features/employee/MyTasksPage';
import DailyWorklogPage from '../features/employee/DailyWorklogPage';
import SubmittedReportsPage from '../features/employee/SubmittedReportsPage';

// Manager & Admin Tasks
import ManagerDashboardPage from '../features/manager/ManagerDashboardPage';
import ManagerTasksPage from '../features/manager/ManagerTasksPage';
import ManagerWorklogsPage from '../features/manager/ManagerWorklogsPage';
import ManagerDailyWorklogPage from '../features/manager/ManagerDailyWorklogPage';

// Admin
import AdminDashboardPage from '../features/admin/AdminDashboardPage';
import AdminUsersPage from '../features/admin/AdminUsersPage';
import AdminDepartmentsProjectsPage from '../features/admin/AdminDepartmentsProjectsPage';
import AdminWorklogsPage from '../features/admin/AdminWorklogsPage';
import AdminAuditLogsPage from '../features/admin/AdminAuditLogsPage';
import AdminSubmissionTimelinePage from '../features/admin/AdminSubmissionTimelinePage';
import AdminUserOverviewPage from '../features/admin/AdminUserOverviewPage';
import AdminAttendancePage from '../features/admin/AdminAttendancePage';
import AdminCategoriesPage from '../features/admin/AdminCategoriesPage';
import RecurringTemplatesPage from '../features/admin/RecurringTemplatesPage';
import AdminMissedTasksPage from '../features/admin/AdminMissedTasksPage';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/employee/tasks" replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/employee/tasks" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Main Authenticated Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleHomeRedirect />} />

        {/* Shared: every signed-in role can change their own password */}
        <Route path="change-password" element={<ChangePasswordPage />} />

        {/* Employee Routes */}
        <Route
          path="employee/tasks"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <MyTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="employee/worklog"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <DailyWorklogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="employee/history"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <SubmittedReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Manager Routes */}
        <Route
          path="manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <ManagerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/tasks"
          element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <ManagerTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/worklog"
          element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <ManagerDailyWorklogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="manager/worklogs"
          element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <ManagerWorklogsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/tasks"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ManagerTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/departments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDepartmentsProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/worklogs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminWorklogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/submission-timeline"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminSubmissionTimelinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/attendance"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/missed"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminMissedTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/recurring"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RecurringTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/categories"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users/:userId/overview"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminUserOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
