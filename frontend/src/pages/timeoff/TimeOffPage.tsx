import React, { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { timeOffService } from '../../services/timeOffService';
import { TimeOffRequest, LeaveBalance, LeaveStatus } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LeaveRequestModal } from './LeaveRequestModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const TimeOffPage: React.FC = () => {
  const { user, canAccess } = useAuth();
  const { success, error } = useToast();

  const isEmployee = user?.role === 'employee';

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<{ id: string; action: 'Approved' | 'Rejected' } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const filter = isEmployee && user?.employeeId
        ? { employeeId: user.employeeId }
        : undefined;

      const targetBalanceEmpId = user?.employeeId || (isEmployee ? 'aaaa1111-1111-1111-1111-111111111111' : 'aaaa1111-1111-1111-1111-111111111111');

      const [reqList, balList] = await Promise.all([
        timeOffService.getTimeOffRequests(filter),
        timeOffService.getLeaveBalances(targetBalanceEmpId)
      ]);
      setRequests(reqList);
      setBalances(balList);
    } catch (err: any) {
      console.error('Failed to load leave records:', err);
      error('Failed to load leave records', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, user?.role, user?.employeeId]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, selectedStatus]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const handleStatusUpdate = async () => {
    if (!actionRequest) return;
    try {
      await timeOffService.updateRequestStatus(
        actionRequest.id,
        actionRequest.action as LeaveStatus,
        user?.name || 'HR Manager'
      );
      success(`Request ${actionRequest.action}`, `The leave application has been marked as ${actionRequest.action}.`);
      setActionRequest(null);
      await fetchData();
    } catch (err: any) {
      console.error('Status Update Failed:', err);
      error('Status Update Failed', err.message || 'Unable to update request status.');
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isEmployee ? 'My Leave & Time Off' : 'Leave Management & Approval Queue'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {isEmployee
              ? 'Submit time-off requests, track approval status, and check your available leave balances.'
              : 'Review, approve, or reject employee leave applications and monitor organization leave allowances.'}
          </p>
        </div>

        <Button
          onClick={() => setIsApplyModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {isEmployee ? 'Apply for Leave' : 'Record Employee Leave'}
        </Button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.filter(b => b.leaveType !== 'Unpaid').map((bal) => (
          <Card key={bal.leaveType} className="border-slate-200">
            <CardContent className="p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                {bal.leaveType} Leave
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{bal.remaining}</span>
                <span className="text-xs text-slate-500">days remaining</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (bal.used / (bal.allocated || 1)) * 100)}%` }}
                  className="h-full bg-brand-500 rounded-full"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                <span>Allocated: {bal.allocated}d</span>
                <span>Used: {bal.used}d</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 block">
              {isEmployee ? 'My Pending Requests' : 'Pending Approvals'}
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{pendingCount}</span>
          </div>
          <Clock className="w-8 h-8 text-amber-500" />
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block">
              {isEmployee ? 'Approved Leaves' : 'Total Approved'}
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{approvedCount}</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 block">
              {isEmployee ? 'Rejected Requests' : 'Total Rejected'}
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{rejectedCount}</span>
          </div>
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <SearchBar
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder={isEmployee ? 'Search my requests by reason...' : 'Search by employee name or reason...'}
        />

        <FilterBar
          label="Status"
          options={[
            { value: 'All', label: 'All Requests' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Rejected', label: 'Rejected' }
          ]}
          selectedValue={selectedStatus}
          onChange={(val) => {
            setSelectedStatus(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title={isEmployee ? 'No leave requests submitted' : 'No leave requests found in queue'}
          description={isEmployee ? 'Click Apply for Leave above to schedule your time off.' : 'All leave applications have been reviewed or match filters.'}
          actionLabel={isEmployee ? 'Apply for Leave' : undefined}
          onAction={isEmployee ? () => setIsApplyModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Leave Type</Th>
                <Th>Period</Th>
                <Th>Duration</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRequests.map((req) => (
                <Tr key={req.id}>
                  <Td>
                    <div>
                      <span className="font-semibold text-slate-900 block leading-tight">
                        {req.employeeName}
                      </span>
                      <span className="text-xs text-slate-400">{req.department}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-medium text-slate-800">{req.leaveType}</span>
                  </Td>
                  <Td className="text-xs text-slate-600 font-medium">
                    {req.startDate} &rarr; {req.endDate}
                  </Td>
                  <Td className="font-semibold text-slate-800">{req.duration} days</Td>
                  <Td className="text-xs text-slate-600 max-w-xs truncate" title={req.reason}>
                    {req.reason}
                  </Td>
                  <Td>
                    <Badge status={req.status} size="sm">
                      {req.status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    {req.status === 'Pending' && canAccess(['hr_manager', 'hr_payroll_manager', 'admin']) ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionRequest({ id: req.id, action: 'Approved' })}
                          className="text-xs text-emerald-700 hover:bg-emerald-50 h-8 px-2.5"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionRequest({ id: req.id, action: 'Rejected' })}
                          className="text-xs text-rose-700 hover:bg-rose-50 h-8 px-2.5"
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {req.reviewedBy ? `Reviewed by ${req.reviewedBy}` : req.status === 'Pending' ? 'Pending Review' : 'Completed'}
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRequests.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Leave Application Modal */}
      <LeaveRequestModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSaved={fetchData}
      />

      {/* Approval Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(actionRequest)}
        onClose={() => setActionRequest(null)}
        onConfirm={handleStatusUpdate}
        title={actionRequest?.action === 'Approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
        message={`Are you sure you want to mark this leave request as ${actionRequest?.action}? The employee will see this update.`}
        confirmLabel={actionRequest?.action === 'Approved' ? 'Approve Application' : 'Reject Application'}
        isDestructive={actionRequest?.action === 'Rejected'}
      />
    </div>
  );
};
