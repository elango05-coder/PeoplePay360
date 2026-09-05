import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layouts/AppLayout';
import { RoleGuard } from './routes/RoleGuard';

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

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Application Shell */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Employees Module */}
              <Route
                path="employees"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <EmployeeListPage />
                  </RoleGuard>
                }
              />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />

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

              {/* Attendance Module */}
              <Route path="attendance" element={<AttendancePage />} />

              {/* Time Off Module */}
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

              {/* Fallbacks */}
              <Route path="unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
