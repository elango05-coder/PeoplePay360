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
import { attendanceService } from '../../services/attendanceService';
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
  const { user, canAccess } = useAuth();
  const { success, error } = useToast();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    missingCheckout: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // View state: 'today' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  // Check In/Out Widget state
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [checkInTime, setCheckInTime] = useState('09:00 AM');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const [list, stats] = await Promise.all([
        attendanceService.getAttendanceRecords(),
        attendanceService.getAttendanceMetrics()
      ]);
      setRecords(list);
      setMetrics(stats);
    } catch (err) {
      console.error(err);
      error('Failed to load attendance logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handlePunchToggle = async () => {
    try {
      if (isCheckedIn) {
        setIsCheckedIn(false);
        success('Checked Out', 'Your shift check-out was recorded at 06:00 PM.');
      } else {
        setIsCheckedIn(true);
        setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        success('Checked In', 'Your attendance punch was recorded.');
      }
      await fetchAttendance();
    } catch (err) {
      error('Punch failed');
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
            {/* Quick Check-in/Check-out Widget */}
            <Button
              variant={isCheckedIn ? 'outline' : 'accent'}
              size="sm"
              onClick={handlePunchToggle}
              leftIcon={isCheckedIn ? <LogOut className="w-3.5 h-3.5 text-rose-600" /> : <LogIn className="w-3.5 h-3.5 text-emerald-600" />}
            >
              {isCheckedIn ? 'Clock Out Shift' : 'Clock In Shift'}
            </Button>

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

          {/* Exceptions Only Toggle (Crucial for Scenario 2 / Priya Patel) */}
          <button
            onClick={() => setExceptionsOnly(!exceptionsOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              exceptionsOnly
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${exceptionsOnly ? 'text-amber-700' : 'text-slate-400'}`} />
            <span>Exceptions Only ({metrics.late + metrics.missingCheckout + metrics.absent})</span>
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <div className="w-full sm:w-60">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search employee..."
            />
          </div>
          <FilterBar
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Present', label: 'Present' },
              { value: 'Late', label: 'Late' },
              { value: 'Missing Checkout', label: 'Missing Checkout' },
              { value: 'Absent', label: 'Absent' },
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
              {paginatedRecords.map((r) => (
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
                  <Td className="text-xs font-mono text-slate-700">{r.date}</Td>
                  <Td className="text-xs font-mono font-medium text-slate-900">
                    {r.checkIn || '--:--'}
                  </Td>
                  <Td className="text-xs font-mono font-medium text-slate-900">
                    {r.checkOut || (
                      <span className="text-rose-600 font-semibold">Missing Checkout</span>
                    )}
                  </Td>
                  <Td className="text-xs font-bold font-mono text-slate-800">
                    {r.workedHours ? `${r.workedHours}h` : '0h'}
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
                        title="Regularize / Edit Entry"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {paginatedRecords.length} of {filteredRecords.length} records
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

      {/* Attendance Edit / Regularization Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await fetchAttendance();
          setIsModalOpen(false);
        }}
        initialData={editingRecord || undefined}
      />
    </div>
  );
};
