import React, { useEffect, useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Edit 
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { AttendanceRecord } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
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

export const AttendancePage: React.FC = () => {
  const { canAccess } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    missingCheckout: 0
  });
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
      const matchesDept = selectedDept === 'All' || r.department === selectedDept;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [records, searchQuery, selectedStatus, selectedDept]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance & Shift Logs</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor daily employee check-ins, biometric regularization, and punctuality.
          </p>
        </div>

        {canAccess(['hr_manager', 'admin']) && (
          <Button
            onClick={() => {
              setEditingRecord(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Manual Entry
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/20">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Present
              </span>
              <span className="text-2xl font-bold text-slate-900">{metrics.present}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/20">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Late Arrival
              </span>
              <span className="text-2xl font-bold text-slate-900">{metrics.late}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/20">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Absent
              </span>
              <span className="text-2xl font-bold text-slate-900">{metrics.absent}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/20">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Missing Checkout
              </span>
              <span className="text-2xl font-bold text-slate-900">{metrics.missingCheckout}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <SearchBar
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search by employee name or code..."
        />

        <div className="flex flex-wrap items-center gap-3">
          <FilterBar
            label="Department"
            options={[
              { value: 'All', label: 'All' },
              { value: 'Engineering', label: 'Engineering' },
              { value: 'Human Resources', label: 'HR' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Operations', label: 'Operations' }
            ]}
            selectedValue={selectedDept}
            onChange={(val) => {
              setSelectedDept(val);
              setCurrentPage(1);
            }}
          />

          <FilterBar
            label="Status"
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'Present', label: 'Present' },
              { value: 'Late', label: 'Late' },
              { value: 'Absent', label: 'Absent' },
              { value: 'Missing Checkout', label: 'Missing Out' },
              { value: 'Corrected', label: 'Corrected' }
            ]}
            selectedValue={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Attendance Table */}
      {isLoading ? (
        <TableSkeleton rows={7} cols={7} />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-6 h-6" />}
          title="No attendance records found"
          description="No logs match your filter criteria."
        />
      ) : (
        <div className="space-y-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Department</Th>
                <Th>Date</Th>
                <Th>Check In</Th>
                <Th>Check Out</Th>
                <Th>Worked Hours</Th>
                <Th>Status</Th>
                <Th>Notes</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRecords.map((rec) => (
                <Tr key={rec.id}>
                  <Td>
                    <div>
                      <span className="font-semibold text-slate-900 block leading-tight">
                        {rec.employeeName}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {rec.employeeCode}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{rec.department}</Td>
                  <Td className="text-slate-700 font-medium">{rec.date}</Td>
                  <Td className="font-mono text-xs font-semibold text-slate-800">{rec.checkIn}</Td>
                  <Td className="font-mono text-xs font-semibold text-slate-800">{rec.checkOut}</Td>
                  <Td className="font-semibold text-slate-900">{rec.workedHours}</Td>
                  <Td>
                    <Badge status={rec.status} size="sm">
                      {rec.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-500 max-w-xs truncate">
                    {rec.notes || '--'}
                  </Td>
                  <Td className="text-right">
                    {canAccess(['hr_manager', 'admin']) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRecord(rec);
                          setIsModalOpen(true);
                        }}
                        className="text-xs"
                        leftIcon={<Edit className="w-3.5 h-3.5 text-slate-500" />}
                      >
                        Regularize
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Attendance Edit/Add Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchAttendance}
        initialData={editingRecord}
      />
    </div>
  );
};
