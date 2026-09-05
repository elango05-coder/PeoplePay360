import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ChevronRight, 
  CalendarCheck, 
  BadgeAlert,
  Building2,
  TrendingUp,
  LogIn,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { employeeService } from '../../services/employeeService';
import { attendanceService, getLocalDateString, formatTime } from '../../services/attendanceService';
import { timeOffService } from '../../services/timeOffService';
import { payrollService } from '../../services/payrollService';
import { contractService } from '../../services/contractService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Employee, Payrun, TimeOffRequest, Contract, AttendanceRecord, UserRole } from '../../types';

interface DashboardPageProps {
  forcedRole?: UserRole;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ forcedRole }) => {
  const { user, role, canAccess } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const effectiveRole = forcedRole || role;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<TimeOffRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isPunching, setIsPunching] = useState(false);
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
      setIsLoading(true);
      try {
        if (effectiveRole === 'employee') {
          const empId = user?.employeeId;
          const todayStr = getLocalDateString();
          const [leaves, attRecords, todayAtt] = await Promise.all([
            timeOffService.getTimeOffRequests(empId ? { employeeId: empId } : undefined),
            attendanceService.getAttendanceRecords(empId ? { employeeId: empId } : undefined),
            empId ? attendanceService.getTodayAttendance(empId, todayStr) : Promise.resolve(null)
          ]);
          setLeaveRequests(leaves);
          setAttendanceRecords(attRecords);
          setTodayRecord(todayAtt);
        } else {
          const [empList, prList, leaves, attMetrics, cntList, attRecords] = await Promise.all([
            employeeService.getEmployees(),
            payrollService.getPayruns(),
            timeOffService.getTimeOffRequests(),
            attendanceService.getAttendanceMetrics(),
            contractService.getContracts(),
            attendanceService.getAttendanceRecords()
          ]);
          setEmployees(empList);
          setPayruns(prList);
          setLeaveRequests(leaves);
          setAttendanceStats(attMetrics);
          setContracts(cntList);
          setAttendanceRecords(attRecords);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [effectiveRole, user]);

  const handleDashboardCheckIn = async () => {
    if (!user?.employeeId) {
      error('Employee session profile not found.');
      return;
    }
    try {
      setIsPunching(true);
      const rec = await attendanceService.checkIn(user.employeeId, user.name, user.department);
      setTodayRecord(rec);
      success(`Checked in successfully at ${formatTime(rec.checkIn)}`);
      const updated = await attendanceService.getAttendanceRecords({ employeeId: user.employeeId });
      setAttendanceRecords(updated);
    } catch (err: any) {
      error(err?.message || 'Check-in failed');
    } finally {
      setIsPunching(false);
    }
  };

  const handleDashboardCheckOut = async () => {
    if (!user?.employeeId) {
      error('Employee session profile not found.');
      return;
    }
    try {
      setIsPunching(true);
      const rec = await attendanceService.checkOut(user.employeeId);
      setTodayRecord(rec);
      success(`Checked out successfully at ${formatTime(rec.checkOut)} (${rec.workedHours}h)`);
      const updated = await attendanceService.getAttendanceRecords({ employeeId: user.employeeId });
      setAttendanceRecords(updated);
    } catch (err: any) {
      error(err?.message || 'Check-out failed');
    } finally {
      setIsPunching(false);
    }
  };

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending');
  const currentPayrun = payruns[0] || null;

  const attendanceExceptionsCount = attendanceStats.late + attendanceStats.missingCheckout + attendanceStats.absent;
  const activeContracts = contracts.filter((c) => c.status === 'Active');

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Dedicated Employee Self-Service Dashboard
  if (effectiveRole === 'employee') {
    const myLeaves = leaveRequests.filter((l) => !user?.employeeId || l.employeeId === user.employeeId);
    const hasCheckedIn = Boolean(todayRecord?.checkIn);
    const hasCheckedOut = Boolean(todayRecord?.checkOut);

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {todayFormatted}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              Good morning, {user?.name?.split(' ')[0] || 'Rahul'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Your self-service portal for attendance punches, leave balances, and payslips.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {!hasCheckedIn ? (
              <Button
                variant="accent"
                size="sm"
                onClick={handleDashboardCheckIn}
                isLoading={isPunching}
                leftIcon={<LogIn className="w-3.5 h-3.5" />}
              >
                Check In Shift
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDashboardCheckOut}
                isLoading={isPunching}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                leftIcon={<LogOut className="w-3.5 h-3.5 text-amber-600" />}
              >
                Check Out Shift
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/attendance')}
                leftIcon={<Clock className="w-3.5 h-3.5 text-emerald-600" />}
              >
                View Attendance
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/time-off')}
              leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-600" />}
            >
              Apply for Leave
            </Button>
          </div>
        </div>

        {/* Employee Snapshot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white/95 border-slate-200/80 shadow-subtle">
            <CardContent className="p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Shift Status Today
              </span>
              <div className="flex items-center justify-between mt-2">
                <div className="text-lg font-bold text-slate-900">
                  {!hasCheckedIn ? 'Not Checked In' : !hasCheckedOut ? 'Clocked In' : 'Shift Completed'}
                </div>
                {!hasCheckedIn ? (
                  <Badge variant="warning" size="sm">Pending</Badge>
                ) : !hasCheckedOut ? (
                  <Badge variant="success" size="sm">Active</Badge>
                ) : (
                  <Badge variant="violet" size="sm">Done</Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {!hasCheckedIn && 'No punch recorded yet today • 8.0h expected'}
                {hasCheckedIn && !hasCheckedOut && `Clocked in at ${formatTime(todayRecord?.checkIn)} • In Progress`}
                {hasCheckedOut && `${formatTime(todayRecord?.checkIn)} - ${formatTime(todayRecord?.checkOut)} • ${todayRecord?.workedHours || 8}h worked`}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {!hasCheckedIn ? 'Session waiting' : !hasCheckedOut ? 'Currently active' : 'Saved to database'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/attendance')}
                  className="text-xs font-semibold text-violet-700 hover:text-violet-800 flex items-center gap-0.5"
                >
                  Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 border-slate-200/80 shadow-subtle">
            <CardContent className="p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Available Leave
              </span>
              <div className="flex items-center justify-between mt-2">
                <div className="text-lg font-bold text-slate-900">23 Days</div>
                <Badge variant="violet" size="sm">Allocated</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">9 Casual, 14 Annual remaining</p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 border-slate-200/80 shadow-subtle">
            <CardContent className="p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Latest Disbursal
              </span>
              <div className="flex items-center justify-between mt-2">
                <div className="text-lg font-bold font-mono text-emerald-700">₹70,400</div>
                <Badge variant="success" size="sm">Paid</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">August 2026 &bull; View voucher</p>
            </CardContent>
          </Card>
        </div>

        {/* My Leave Requests Table */}
        <Card className="bg-white border-slate-200/80 shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 font-heading">
              Recent Time-Off Applications
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/time-off')}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {myLeaves.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No leave requests filed yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myLeaves.slice(0, 3).map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{req.leaveType}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {req.startDate} to {req.endDate} &bull; {req.duration} Day(s)
                      </p>
                    </div>
                    <Badge status={req.status} size="sm">{req.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Administrative / HR / Payroll Manager Workspace Dashboard
  return (
    <div className="space-y-6">
      {/* Top Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {todayFormatted}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
            Good morning, {user?.name || (effectiveRole === 'admin' ? 'Administrator' : effectiveRole === 'hr_manager' ? 'HR Manager' : 'Payroll Manager')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {effectiveRole === 'admin' && 'Enterprise Administration Portal. Full organizational control and governance.'}
            {effectiveRole === 'hr_manager' && 'Human Resources Operations. Employee directory, absence approvals, and staff attendance.'}
            {(effectiveRole === 'hr_payroll_manager' || effectiveRole === 'hr_payroll_user') && 'Payroll Operations & Disbursals. Salary calculation batches, structures, and payslips.'}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {(effectiveRole === 'hr_manager' || effectiveRole === 'admin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employees')}
              leftIcon={<Users className="w-3.5 h-3.5 text-violet-700" />}
            >
              Directory
            </Button>
          )}
          {(effectiveRole === 'hr_payroll_manager' || effectiveRole === 'hr_payroll_user' || effectiveRole === 'admin') && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => navigate('/payroll')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Active Payrun
            </Button>
          )}
          {effectiveRole === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/users')}
              leftIcon={<Building2 className="w-3.5 h-3.5 text-slate-700" />}
            >
              System Users
            </Button>
          )}
        </div>
      </div>

      {/* SECTION 1: TODAY'S ATTENTION (Odoo-inspired operational triage) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
            Today's Attention
          </h2>
          <span className="text-[11px] text-slate-500">Actionable operational queues</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Attendance Exceptions */}
          <div
            onClick={() => navigate('/attendance')}
            className="group cursor-pointer bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-amber-400 hover:shadow-card transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Attendance Exceptions
              </span>
              <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-slate-900 font-heading">
                {attendanceExceptionsCount}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {attendanceStats.late} late arrival, {attendanceStats.missingCheckout} missing checkout
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-700 font-medium">
              <span>Review attendance log</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Leave Approvals */}
          <div
            onClick={() => navigate('/time-off')}
            className="group cursor-pointer bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-emerald-400 hover:shadow-card transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Leave Approvals
              </span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <CalendarCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-slate-900 font-heading">
                {pendingLeaves.length}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {pendingLeaves.length > 0 ? `${pendingLeaves[0]?.employeeName} awaiting approval` : 'No pending requests'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
              <span>Open approval queue</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Payroll Warnings */}
          <div
            onClick={() => navigate('/payroll')}
            className="group cursor-pointer bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-violet-400 hover:shadow-card transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Payroll Warnings
              </span>
              <div className="w-6 h-6 rounded-md bg-violet-50 border border-violet-200 text-violet-700 flex items-center justify-center">
                <BadgeAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-slate-900 font-heading">
                {(currentPayrun as any)?.warningsCount || 2}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Unpaid leave deductions & hours
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-violet-700 font-medium">
              <span>Review compute batch</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Active Contracts */}
          <div
            onClick={() => navigate('/contracts')}
            className="group cursor-pointer bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-slate-300 hover:shadow-card transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Contracts
              </span>
              <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-slate-900 font-heading">
                {activeContracts.length}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Active agreements in scope
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
              <span>View contract ledger</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PEOPLE SNAPSHOT */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
            People Snapshot
          </h2>
          <span className="text-[11px] text-slate-500">Headcount & daily attendance status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
            <span className="text-[11px] font-medium text-slate-600 block">Total Staff</span>
            <div className="text-xl font-bold text-slate-900 font-heading mt-1">
              {employees.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">100% Onboarded</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
            <span className="text-[11px] font-medium text-slate-600 block">Present Today</span>
            <div className="text-xl font-bold text-slate-900 font-heading mt-1">
              {attendanceStats.present || 3}
            </div>
            <span className="text-[11px] text-slate-500">Logged on shift</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
            <span className="text-[11px] font-medium text-slate-600 block">On Leave</span>
            <div className="text-xl font-bold text-slate-900 font-heading mt-1">
              1
            </div>
            <span className="text-[11px] text-violet-700">Approved time off</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
            <span className="text-[11px] font-medium text-slate-600 block">Exceptions</span>
            <div className="text-xl font-bold text-slate-900 font-heading mt-1">
              {attendanceExceptionsCount}
            </div>
            <span className="text-[11px] text-amber-700 font-medium">Needs supervisor sign-off</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: PAYROLL OVERVIEW & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Overview Card (Span 2) */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
              Payroll Overview
            </h2>
            <span className="text-[11px] text-slate-500">Active cycle financials</span>
          </div>

          <Card className="bg-white border-slate-200/80 shadow-subtle">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 font-heading">
                  {currentPayrun?.name || 'September 2026 Monthly Payrun'}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Period: {currentPayrun?.periodMonth || 'September'} {currentPayrun?.periodYear || 2026}
                </p>
              </div>
              <Badge status={currentPayrun?.status || 'Validated'} size="sm">
                {currentPayrun?.status || 'Validated'}
              </Badge>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-600 block">Gross Payroll</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                    ₹{currentPayrun?.grossTotal?.toLocaleString('en-IN') || '2,28,600'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-600 block">Deductions</span>
                  <span className="text-base sm:text-lg font-bold text-rose-700 font-mono mt-0.5 block">
                    -₹{currentPayrun?.deductionTotal?.toLocaleString('en-IN') || '20,500'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-600 block">Net Disbursal</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-800 font-mono mt-0.5 block">
                    ₹{currentPayrun?.netTotal?.toLocaleString('en-IN') || '2,08,100'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-600 block">In-Scope Staff</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-heading mt-0.5 block">
                    {currentPayrun?.employeeCount || 4} Employees
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-600" />
                  <span className="text-xs text-slate-600">
                    {(currentPayrun as any)?.warningsCount || 2} warnings require operational review prior to disbursement
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/payroll')}
                >
                  Inspect Payroll Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Feed (Span 1) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
              Recent Activity
            </h2>
            <span className="text-[11px] text-slate-500">Live operational ledger</span>
          </div>

          <Card className="bg-white border-slate-200/80 shadow-subtle">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="p-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Rahul Sharma</span>
                    <span className="text-[10px] text-slate-400">Sep 05</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Contract CNT-2026-002 active at ₹50,000/mo.
                  </p>
                </div>

                <div className="p-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Priya Patel</span>
                    <span className="text-[10px] text-slate-400">Sep 04</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Casual leave approved (2 days). Balance decremented.
                  </p>
                </div>

                <div className="p-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Vikram Malhotra</span>
                    <span className="text-[10px] text-slate-400">Sep 03</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    September Payrun moved to Validated state.
                  </p>
                </div>

                <div className="p-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Arjun Singh</span>
                    <span className="text-[10px] text-slate-400">Sep 02</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Attendance verified. Normal shift clocked.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
