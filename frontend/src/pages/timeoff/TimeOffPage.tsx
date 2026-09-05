import React, { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Layers, 
  CheckCircle2, 
  PieChart, 
  FileText,
  CalendarCheck
} from 'lucide-react';
import { timeOffService } from '../../services/timeOffService';
import { TimeOffRequest, LeaveBalance, LeaveType, LeaveStatus } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { LeaveRequestModal } from './LeaveRequestModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const TimeOffPage: React.FC = () => {
  const { user, role, canAccess } = useAuth();
  const { success, error } = useToast();

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'allocations' | 'types'>('requests');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTimeOffData = async () => {
    setIsLoading(true);
    try {
      const empId = role === 'employee' ? user?.employeeId : undefined;
      const [reqList, balList] = await Promise.all([
        timeOffService.getTimeOffRequests(empId ? { employeeId: empId } : undefined),
        timeOffService.getLeaveBalances(empId || 'emp-001')
      ]);
      setRequests(reqList);
      setBalances(balList);
    } catch (err) {
      console.error(err);
      error('Failed to load leave records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeOffData();
  }, [role, user]);

  const handleStatusUpdate = async (id: string, newStatus: LeaveStatus) => {
    setActionLoadingId(id);
    try {
      await timeOffService.updateRequestStatus(id, newStatus, user?.name || 'HR Manager');
      success(
        newStatus === 'Approved' ? 'Leave Request Approved' : 'Leave Request Refused',
        `The leave application has been marked as ${newStatus.toLowerCase()}.`
      );
      await fetchTimeOffData();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
      const matchesType = selectedType === 'All' || r.leaveType === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchQuery, selectedStatus, selectedType]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Time Off & Leave Management"
        description="Employee leave balances, absence requests, manager approval queue, and statutory time-off allocations."
        breadcrumbs={[
          { label: 'Workspace', path: '/dashboard' },
          { label: 'Time Off' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Apply for Time Off
          </Button>
        }
      />

      {/* Leave Balance Meters Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {balances.map((bal) => {
          const pct = Math.round((bal.remaining / (bal.allocated || 1)) * 100);

          return (
            <div
              key={bal.leaveType}
              className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 font-heading">
                    {bal.leaveType} Leave
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {bal.remaining} / {bal.allocated} Left
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                  {bal.remaining} <span className="text-xs font-normal text-slate-500">Days</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {bal.used} days utilized this financial year
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Structured Sub-Tabs: Requests | Allocations | Types */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'requests'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leave Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'allocations'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Balance Allocations
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'types'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leave Policies & Types
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
            <div className="w-full sm:w-72">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by employee or reason..."
              />
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <FilterBar
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Pending', label: 'Pending Approval' },
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Rejected', label: 'Refused' },
                ]}
                value={selectedStatus}
                onChange={setSelectedStatus}
                placeholder="Status"
              />
              <FilterBar
                options={[
                  { value: 'All', label: 'All Leave Types' },
                  { value: 'Annual', label: 'Annual' },
                  { value: 'Casual', label: 'Casual' },
                  { value: 'Sick', label: 'Sick' },
                  { value: 'Unpaid', label: 'Unpaid' },
                ]}
                value={selectedType}
                onChange={setSelectedType}
                placeholder="Type"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="No time off requests found"
              description="No applications match current filters."
              actionLabel="Apply for Leave"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Leave Type</Th>
                    <Th>Duration & Period</Th>
                    <Th>Reason</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Approval Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedRequests.map((req) => (
                    <Tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <Td>
                        <div>
                          <span className="font-bold text-slate-900 text-xs font-heading block">
                            {req.employeeName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {req.department}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs font-semibold text-slate-800">
                          {req.leaveType}
                        </span>
                      </Td>
                      <Td>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {req.duration} Day(s)
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {req.startDate} &rarr; {req.endDate}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-xs text-slate-600 max-w-xs truncate">
                        {req.reason || 'Personal leave'}
                      </Td>
                      <Td>
                        <Badge status={req.status} size="sm">{req.status}</Badge>
                      </Td>
                      <Td className="text-right">
                        {canAccess(['hr_manager', 'admin']) && req.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="accent"
                              size="sm"
                              isLoading={actionLoadingId === req.id}
                              onClick={() => handleStatusUpdate(req.id, 'Approved')}
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50 border-rose-200"
                              isLoading={actionLoadingId === req.id}
                              onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                              leftIcon={<X className="w-3.5 h-3.5" />}
                            >
                              Refuse
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {req.reviewedBy ? `By ${req.reviewedBy}` : 'Locked'}
                          </span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              {totalPages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Showing {paginatedRequests.length} of {filteredRequests.length} requests
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
        </div>
      )}

      {/* Tab 2: Allocations */}
      {activeTab === 'allocations' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Balance Allocation Math & Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Clear breakdown of annual quotas, historical deductions, and remaining entitlements.
            </p>
          </div>
          <Table>
            <Thead>
              <Tr>
                <Th>Time Off Type</Th>
                <Th>Total Allocated</Th>
                <Th>Used Days</Th>
                <Th>Remaining Entitlement</Th>
                <Th>Accrual Policy</Th>
              </Tr>
            </Thead>
            <Tbody>
              {balances.map((b) => (
                <Tr key={b.leaveType}>
                  <Td className="text-xs font-bold text-slate-900">{b.leaveType} Leave</Td>
                  <Td className="text-xs font-mono font-semibold">{b.allocated} Days</Td>
                  <Td className="text-xs font-mono text-amber-700">{b.used} Days</Td>
                  <Td className="text-xs font-mono font-bold text-emerald-700">{b.remaining} Days</Td>
                  <Td className="text-xs text-slate-500">Annual recurring credit on Jan 01</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      {/* Tab 3: Time Off Types */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle">
            <h4 className="text-xs font-bold text-slate-900 font-heading">Annual Vacation Leave</h4>
            <p className="text-xs text-slate-500 mt-1">Paid statutory leave allocated yearly. Requires 3-day advance notice.</p>
            <span className="inline-block mt-3 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Paid Entitlement
            </span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle">
            <h4 className="text-xs font-bold text-slate-900 font-heading">Casual & Emergency Leave</h4>
            <p className="text-xs text-slate-500 mt-1">Short-term emergency absences with immediate manager authorization.</p>
            <span className="inline-block mt-3 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Paid Entitlement
            </span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle">
            <h4 className="text-xs font-bold text-slate-900 font-heading">Unpaid Leave (LWP)</h4>
            <p className="text-xs text-slate-500 mt-1">Absences beyond allocated quotas. Triggers automated daily salary deduction during payroll computation.</p>
            <span className="inline-block mt-3 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Payroll Deduction
            </span>
          </div>
        </div>
      )}

      {/* Modal: New Leave Request */}
      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await fetchTimeOffData();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
