import React, { useEffect, useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Edit,
  Filter,
  Calendar,
  AlertCircle,
  LogIn,
  LogOut,
  Timer
} from 'lucide-react';
import { attendanceService, getLocalDateString, formatTime } from '../../services/attendanceService';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { AttendanceModal } from './AttendanceModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AttendancePage: React.FC = () => {
  const { user, role, canAccess } = useAuth();
  const { success, error } = useToast();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [metrics, setMetrics] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    missingCheckout: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);

  // View state: 'today' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const todayStr = getLocalDateString();
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const empId = user?.employeeId || (role === 'employee' ? 'aaaa1111-1111-1111-1111-111111111111' : undefined);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const isEmployeeRole = role === 'employee';
      const [list, stats, todayRec] = await Promise.all([
        attendanceService.getAttendanceRecords(isEmployeeRole && empId ? { employeeId: empId } : undefined),
        attendanceService.getAttendanceMetrics(isEmployeeRole && empId ? { employeeId: empId } : undefined),
        empId ? attendanceService.getTodayAttendance(empId, todayStr) : Promise.resolve(null)
      ]);
      setRecords(list);
      setMetrics(stats);
      setTodayRecord(todayRec);
    } catch (err) {
      console.error(err);
      error('Failed to load attendance logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [role, user]);

  const isCheckedInToday = Boolean(
    todayRecord && todayRecord.checkIn && todayRecord.checkIn !== '--:--'
  );

  const isShiftCompleted = Boolean(
    todayRecord && todayRecord.checkOut && todayRecord.checkOut !== '--:--'
  );

  const handleCheckIn = async () => {
    if (!empId) {
      error('Check-In Error', 'Employee profile could not be found.');
      return;
    }
    setIsPunching(true);
    try {
      const rec = await attendanceService.checkIn(empId, user?.name, user?.department);
      setTodayRecord(rec);
      success('Check-In Recorded', `Your shift check-in was logged at ${rec.checkIn}.`);
      await fetchAttendance();
    } catch (err: any) {
      error('Check-In Error', err?.message || 'Unable to record check-in. Please try again.');
    } finally {
      setIsPunching(false);
    }
  };

  const handleCheckOut = async () => {
    if (!empId) {
      error('Check-Out Error', 'Employee profile could not be found.');
      return;
    }
    setIsPunching(true);
    try {
      const rec = await attendanceService.checkOut(empId);
      setTodayRecord(rec);
      success('Check-Out Recorded', `Your shift check-out was logged at ${rec.checkOut}.`);
      await fetchAttendance();
    } catch (err: any) {
      error('Check-Out Error', err?.message || 'Unable to record check-out. Please try again.');
    } finally {
      setIsPunching(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'All' || r.department === selectedDept;

      let matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;

      // Exceptions Only filter: isolates Late, Missing Checkout, and Absent
      if (exceptionsOnly) {
        const isException = r.status === 'Late' || r.status === 'Missing Checkout' || r.status === 'Absent';
        return matchesSearch && matchesDept && isException;
      }

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [records, searchQuery, selectedStatus, selectedDept, exceptionsOnly]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance & Shift Operations"
        description="Daily biometric punches, punctuality tracking, overtime verification, and shift exception regularization."
        breadcrumbs={[
          { label: 'Workspace', path: '/dashboard' },
          { label: 'Attendance' }
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            {/* Quick Check-in/Check-out Action Button */}
            {!isCheckedInToday && !isShiftCompleted ? (
              <Button
                variant="accent"
                size="sm"
                onClick={handleCheckIn}
                isLoading={isPunching}
                leftIcon={<LogIn className="w-3.5 h-3.5 text-white" />}
              >
                Check In Shift
              </Button>
            ) : isCheckedInToday && !isShiftCompleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckOut}
                isLoading={isPunching}
                leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-600" />}
              >
                Check Out Shift
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Checked Out ({todayRecord?.checkOut})</span>
              </div>
            )}

            {canAccess(['hr_manager', 'admin']) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingRecord(null);
                  setIsModalOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Log Entry
              </Button>
            )}
          </div>
        }
      />

      {/* Daily Attendance Session Banner */}
      <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-emerald-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Daily Shift Session &bull; {todayFormatted}
              </span>
              {isShiftCompleted ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                  Shift Completed
                </span>
              ) : isCheckedInToday ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                  Clocked In &bull; In Progress
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                  Not Checked In
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white font-heading mt-1">
              {isShiftCompleted
                ? `Clocked Out at ${todayRecord?.checkOut} (${todayRecord?.workedHours || '8.0h'} worked)`
                : isCheckedInToday
                ? `Clocked In at ${todayRecord?.checkIn} &bull; Shift active`
                : `You have not checked in for today`}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Standard 8.0h shift allocation &bull; 24-hour session resets automatically at calendar midnight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center">
          {!isCheckedInToday && !isShiftCompleted && (
            <Button
              variant="accent"
              size="md"
              onClick={handleCheckIn}
              isLoading={isPunching}
              leftIcon={<LogIn className="w-4 h-4 text-white" />}
              className="shadow-lg shadow-emerald-900/40 font-semibold"
            >
              Check In Now
            </Button>
          )}

          {isCheckedInToday && !isShiftCompleted && (
            <Button
              variant="outline"
              size="md"
              onClick={handleCheckOut}
              isLoading={isPunching}
              leftIcon={<LogOut className="w-4 h-4 text-rose-400" />}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-lg font-semibold"
            >
              Check Out Shift
            </Button>
          )}

          {isShiftCompleted && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Shift Finished</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Strip with Exceptions Triage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Scheduled Today
          </span>
          <div className="text-xl font-bold text-slate-900 font-heading mt-1">
            {metrics.total || records.length}
          </div>
          <span className="text-[11px] text-slate-400">100% Shift Allocation</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            On Time
          </span>
          <div className="text-xl font-bold text-emerald-800 font-heading mt-1">
            {metrics.present}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Standard Hours</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Late Arrivals
          </span>
          <div className="text-xl font-bold text-amber-800 font-heading mt-1">
            {metrics.late}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Beyond grace period</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Missing Checkouts
          </span>
          <div className="text-xl font-bold text-rose-800 font-heading mt-1">
            {metrics.missingCheckout}
          </div>
          <span className="text-[11px] text-rose-700 font-medium">Requires supervisor fix</span>
        </div>
      </div>

      {/* Filter & View Range Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center flex-wrap gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                timeRange === 'week' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                timeRange === 'month' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Exceptions Toggle */}
          <button
            onClick={() => setExceptionsOnly(!exceptionsOnly)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
              exceptionsOnly
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Exceptions ({metrics.late + metrics.missingCheckout + metrics.absent})</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="w-full md:w-56">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search staff or code..."
            />
          </div>
          <FilterBar
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Present', label: 'Present' },
              { value: 'Late', label: 'Late Arrival' },
              { value: 'Missing Checkout', label: 'Missing Checkout' },
              { value: 'Absent', label: 'Absent' },
              { value: 'Overtime', label: 'Overtime' },
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Status"
          />
        </div>
      </div>

      {/* Attendance Records Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title={exceptionsOnly ? 'No attendance exceptions found' : 'No attendance records'}
          description="All shift punches are normalized or no records match current filters."
          actionLabel={exceptionsOnly ? 'Show All Records' : 'Clear Filters'}
          onAction={() => {
            setExceptionsOnly(false);
            setSearchQuery('');
            setSelectedStatus('All');
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Check In</Th>
                <Th>Check Out</Th>
                <Th>Worked Hours</Th>
                <Th>Expected</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRecords.map((r) => {
                const isToday = r.date === todayStr;
                const hoursDisplay = r.workedHours
                  ? r.workedHours.endsWith('h')
                    ? r.workedHours
                    : `${r.workedHours}h`
                  : '0.0h';

                return (
                  <Tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <Td>
                      <div>
                        <span className="font-bold text-slate-900 text-xs font-heading block">
                          {r.employeeName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {r.employeeCode} &bull; {r.department}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-xs font-mono text-slate-700">
                      <span className={isToday ? 'font-bold text-violet-700' : ''}>
                        {r.date} {isToday && '(Today)'}
                      </span>
                    </Td>
                    <Td className="text-xs font-mono font-medium text-slate-900">
                      {r.checkIn || '--:--'}
                    </Td>
                    <Td className="text-xs font-mono font-medium text-slate-900">
                      {r.checkOut && r.checkOut !== '--:--' ? (
                        r.checkOut
                      ) : isToday ? (
                        <span className="text-emerald-600 font-semibold">Shift Active</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">Missing Checkout</span>
                      )}
                    </Td>
                    <Td className="text-xs font-bold font-mono text-slate-800">
                      {hoursDisplay}
                    </Td>
                    <Td className="text-xs text-slate-500 font-mono">8.0h</Td>
                    <Td>
                      <Badge status={r.status} size="sm">{r.status}</Badge>
                    </Td>
                    <Td className="text-right">
                      {canAccess(['hr_manager', 'admin']) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRecord(r);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500 hover:text-slate-800" />
                        </Button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {paginatedRecords.length} of {filteredRecords.length} entries
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Attendance Adjustment Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await fetchAttendance();
          setIsModalOpen(false);
        }}
        initialData={editingRecord}
      />
    </div>
  );
};
