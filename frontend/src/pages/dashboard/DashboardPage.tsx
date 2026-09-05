import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Building2,
  FileCheck,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeService } from '../../services/employeeService';
import { attendanceService } from '../../services/attendanceService';
import { timeOffService } from '../../services/timeOffService';
import { payrollService } from '../../services/payrollService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Employee, Payrun, TimeOffRequest } from '../../types';

export const DashboardPage: React.FC = () => {
  const { user, role, canAccess } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<TimeOffRequest[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    missingCheckout: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [empList, prList, leaves, attMetrics] = await Promise.all([
          employeeService.getEmployees(),
          payrollService.getPayruns(),
          timeOffService.getTimeOffRequests(),
          attendanceService.getAttendanceMetrics()
        ]);
        setEmployees(empList);
        setPayruns(prList);
        setLeaveRequests(leaves);
        setAttendanceStats(attMetrics);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending').length;
  const currentPayrun = payruns[0] || null;

  // Department counts for distribution
  const deptMap: Record<string, number> = {};
  employees.forEach((e) => {
    deptMap[e.department] = (deptMap[e.department] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-brand-200 mb-3 border border-white/10">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'Administrator'}
            </h2>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              PeoplePay360 is currently operating under standard business schedule. Here is the operational summary for your organization.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {canAccess(['hr_manager', 'admin']) && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => navigate('/employees')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Manage Employees
              </Button>
            )}
            {canAccess(['hr_payroll_user', 'hr_payroll_manager', 'admin']) && (
              <Button
                variant="primary"
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white border-none shadow-md shadow-brand-500/30"
                onClick={() => navigate('/payroll')}
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Open Payroll Run
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Employees */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Headcount
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {employees.length}
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                {activeEmployees} Active
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Across {Object.keys(deptMap).length} functional departments
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Attendance Today */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Present Today
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {attendanceStats.present}
              </span>
              <span className="text-xs text-slate-500">
                of {attendanceStats.total || employees.length} scheduled
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-600 font-medium">
              {attendanceStats.late} late arrivals &bull; {attendanceStats.missingCheckout} missing checkout
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Leaves */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Leaves
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {pendingLeaves}
              </span>
              <span className="text-xs text-amber-600 font-medium">
                Requires Review
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {leaveRequests.filter((l) => l.status === 'Approved').length} approved this month
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Current Net Payroll */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Net Payroll
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                ₹{currentPayrun ? currentPayrun.netTotal.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">{currentPayrun?.periodMonth} {currentPayrun?.periodYear}</span>
              <Badge status={currentPayrun?.status} size="sm">
                {currentPayrun?.status || 'Draft'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Attendance Breakdown & Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Live Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Attendance Status</CardTitle>
              <CardDescription>Shift punctuality and attendance check-in metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
              View Logs
            </Button>
          </CardHeader>
          <CardContent>
            {/* Visual Attendance Bar */}
            <div className="space-y-4">
              <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden">
                <div
                  style={{ width: `${(attendanceStats.present / (attendanceStats.total || 1)) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title="Present"
                />
                <div
                  style={{ width: `${(attendanceStats.late / (attendanceStats.total || 1)) * 100}%` }}
                  className="bg-amber-500 transition-all duration-500"
                  title="Late"
                />
                <div
                  style={{ width: `${(attendanceStats.absent / (attendanceStats.total || 1)) * 100}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title="Absent"
                />
                <div
                  style={{ width: `${(attendanceStats.missingCheckout / (attendanceStats.total || 1)) * 100}%` }}
                  className="bg-purple-500 transition-all duration-500"
                  title="Missing Checkout"
                />
              </div>

              {/* Status Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Present
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{attendanceStats.present}</p>
                  <p className="text-[11px] text-slate-500">On-time punches</p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                  <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Late
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{attendanceStats.late}</p>
                  <p className="text-[11px] text-slate-500">Grace period delay</p>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50">
                  <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Absent
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{attendanceStats.absent}</p>
                  <p className="text-[11px] text-slate-500">Approved / unexcused</p>
                </div>

                <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50">
                  <div className="flex items-center gap-2 text-purple-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Missing Out
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{attendanceStats.missingCheckout}</p>
                  <p className="text-[11px] text-slate-500">Pending checkout</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Headcount Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              Departments
            </CardTitle>
            <CardDescription>Employee distribution by unit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {Object.entries(deptMap).map(([dept, count]) => {
              const pct = Math.round((count / (employees.length || 1)) * 100);
              return (
                <div key={dept}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{dept}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-brand-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Payroll Operations Summary & Recent Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Cycle Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                Payroll Cycle Breakdown
              </CardTitle>
              <CardDescription>
                {currentPayrun?.name || 'Current Month Payrun'}
              </CardDescription>
            </div>
            {currentPayrun && (
              <Badge status={currentPayrun.status}>{currentPayrun.status}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {currentPayrun ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Gross Payroll
                    </span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      ₹{currentPayrun.grossTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Deductions
                    </span>
                    <span className="text-base sm:text-lg font-bold text-rose-600">
                      ₹{currentPayrun.deductionTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Net Disbursal
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-600">
                      ₹{currentPayrun.netTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Applied Structure: <strong className="text-slate-800">{currentPayrun.salaryStructureName}</strong></span>
                  <span>Covering <strong className="text-slate-800">{currentPayrun.employeeCount}</strong> Employees</span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => navigate('/payroll')}
                  >
                    View Payruns & Payslips
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active payrun found.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Action Items (Leaves) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600" />
                Pending Leave Approvals
              </CardTitle>
              <CardDescription>Recent time-off requests awaiting manager review</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/time-off')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaveRequests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {req.employeeName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {req.leaveType} Leave &bull; {req.duration} days ({req.startDate} to {req.endDate})
                    </p>
                  </div>
                  <Badge status={req.status} size="sm">
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
