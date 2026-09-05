import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleGuard } from './routes/RoleGuard';
import { getDashboardPath } from './services/authService';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeeListPage } from './pages/employees/EmployeeListPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { ContractListPage } from './pages/contracts/ContractListPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { TimeOffPage } from './pages/timeoff/TimeOffPage';
import { SalaryStructurePage } from './pages/salary/SalaryStructurePage';
import { PayrollDashboardPage } from './pages/payroll/PayrollDashboardPage';
import { PayslipListPage } from './pages/payroll/PayslipListPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SchedulesPage } from './pages/schedules/SchedulesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { UnauthorizedPage } from './pages/unauthorized/UnauthorizedPage';

// Automatic role-based root redirector
const DashboardRedirect: React.FC = () => {
  const { role } = useAuth();
  return <Navigate to={getDashboardPath(role)} replace />;
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardRedirect />} />
              <Route path="dashboard" element={<DashboardRedirect />} />

              {/* 1. Employee Role Endpoints */}
              <Route
                path="employee"
                element={<Navigate to="/employee/dashboard" replace />}
              />
              <Route
                path="employee/dashboard"
                element={
                  <RoleGuard allowedRoles={['employee']}>
                    <DashboardPage forcedRole="employee" />
                  </RoleGuard>
                }
              />

              {/* 2. HR Manager Role Endpoints */}
              <Route
                path="hr-manager"
                element={<Navigate to="/hr-manager/dashboard" replace />}
              />
              <Route
                path="hr-manager/dashboard"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'admin']}>
                    <DashboardPage forcedRole="hr_manager" />
                  </RoleGuard>
                }
              />

              {/* 3. HR Payroll Role Endpoints */}
              <Route
                path="hr-payroll"
                element={<Navigate to="/hr-payroll/dashboard" replace />}
              />
              <Route
                path="hr-payroll/dashboard"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_manager', 'hr_payroll_user', 'admin']}>
                    <DashboardPage forcedRole="hr_payroll_manager" />
                  </RoleGuard>
                }
              />

              {/* 4. Admin Role Endpoints */}
              <Route
                path="admin"
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route
                path="admin/dashboard"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <DashboardPage forcedRole="admin" />
                  </RoleGuard>
                }
              />

              {/* Employees Module */}
              <Route
                path="employees"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <EmployeeListPage />
                  </RoleGuard>
                }
              />
              <Route
                path="employees/:id"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <EmployeeDetailPage />
                  </RoleGuard>
                }
              />

              {/* Contracts Module */}
              <Route
                path="contracts"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <ContractListPage />
                  </RoleGuard>
                }
              />
              <Route path="contracts/:id" element={<Navigate to="/contracts" replace />} />

              {/* Working Schedules Module */}
              <Route
                path="schedules"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_manager', 'admin']}>
                    <SchedulesPage />
                  </RoleGuard>
                }
              />

              {/* Attendance Module (Authenticated; Employee Data Isolated) */}
              <Route path="attendance" element={<AttendancePage />} />

              {/* Time Off Module (Authenticated; Employee Data Isolated) */}
              <Route path="time-off" element={<TimeOffPage />} />

              {/* Salary Structure Module */}
              <Route
                path="salary"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_manager', 'admin']}>
                    <SalaryStructurePage />
                  </RoleGuard>
                }
              />

              {/* Payroll Module */}
              <Route
                path="payroll"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <PayrollDashboardPage />
                  </RoleGuard>
                }
              />
              <Route path="payroll/payruns" element={<Navigate to="/payroll" replace />} />
              <Route path="payroll/payslips" element={<PayslipListPage />} />

              {/* Reports Module */}
              <Route
                path="reports"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_manager', 'admin']}>
                    <ReportsPage />
                  </RoleGuard>
                }
              />

              {/* Administration - Users */}
              <Route
                path="admin/users"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AdminUsersPage />
                  </RoleGuard>
                }
              />

              {/* Unauthorized & Catch-all */}
              <Route path="unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<DashboardRedirect />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
