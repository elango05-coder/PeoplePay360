import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  FileText, 
  Clock, 
  DollarSign, 
  ArrowLeft, 
  Edit, 
  Plus, 
  Briefcase,
  AlertCircle,
  Receipt,
  UserCheck
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { contractService } from '../../services/contractService';
import { attendanceService } from '../../services/attendanceService';
import { timeOffService } from '../../services/timeOffService';
import { payrollService } from '../../services/payrollService';
import { Employee, Contract, AttendanceRecord, TimeOffRequest, Payslip } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmployeeAvatar } from '../../components/ui/EmployeeAvatar';
import { Timeline, TimelineEvent } from '../../components/ui/Timeline';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { PayslipDetailModal } from '../payroll/PayslipDetailModal';
import { ContractModal } from '../contracts/ContractModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  const { error } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<TimeOffRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs: 'overview' | 'employment' | 'contracts' | 'attendance' | 'timeoff' | 'payroll'
  const [activeTab, setActiveTab] = useState<'overview' | 'employment' | 'contracts' | 'attendance' | 'timeoff' | 'payroll'>('overview');

  // Modals
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const loadAllData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [emp, cntList, attList, leaveList, psList] = await Promise.all([
        employeeService.getEmployeeById(id),
        contractService.getContracts({ employeeId: id }),
        attendanceService.getAttendanceRecords({ employeeId: id }),
        timeOffService.getTimeOffRequests({ employeeId: id }),
        payrollService.getPayslips({ employeeId: id }),
      ]);
      setEmployee(emp || null);
      setContracts(cntList);
      setAttendance(attList);
      setLeaveRequests(leaveList);
      setPayslips(psList);
    } catch (err) {
      console.error(err);
      error('Failed to load employee profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  if (isLoading) {
    return <TableSkeleton rows={8} />;
  }

  if (!employee) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Employee not found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested employee record does not exist or was archived.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/employees')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const activeContract = contracts.find((c) => c.status === 'Active');

  // Generate signature People Timeline milestones
  const timelineEvents: TimelineEvent[] = [
    {
      id: 'evt-join',
      date: employee.joiningDate || '2025-01-15',
      title: 'Joined PeoplePay360',
      description: `Enrolled as ${employee.position} in ${employee.department} under ${employee.employeeType} agreement.`,
      type: 'milestone',
      badgeText: 'Onboarding',
      badgeStatus: 'Active',
      metadata: { department: employee.department, type: employee.employeeType }
    },
    ...contracts.map((c) => ({
      id: `evt-contract-${c.id}`,
      date: c.startDate,
      title: `Contract ${c.contractNumber} (${c.status})`,
      description: `${c.salaryStructureName || 'Standard'} structure with monthly wage of ₹${c.wage.toLocaleString('en-IN')}. ${c.endDate ? `Valid until ${c.endDate}` : 'Ongoing agreement'}.`,
      type: 'contract' as const,
      badgeText: `₹${c.wage.toLocaleString('en-IN')}`,
      badgeStatus: c.status,
      metadata: { wage: `₹${c.wage.toLocaleString('en-IN')}/mo`, status: c.status }
    })),
    ...leaveRequests.slice(0, 2).map((l) => ({
      id: `evt-leave-${l.id}`,
      date: l.startDate,
      title: `${l.leaveType} Leave (${l.status})`,
      description: `Requested ${l.duration} day(s) from ${l.startDate} to ${l.endDate}. Reason: ${l.reason || 'Personal'}`,
      type: 'timeoff' as const,
      badgeText: `${l.duration} Day(s)`,
      badgeStatus: l.status,
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`Employee Code: ${employee.code} • ${employee.position} in ${employee.department}`}
        breadcrumbs={[
          { label: 'Workspace', path: '/dashboard' },
          { label: 'People', path: '/employees' },
          { label: `${employee.firstName} ${employee.lastName}` }
        ]}
        badge={<Badge status={employee.status}>{employee.status}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employees')}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
            {canAccess(['hr_manager', 'admin']) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsContractModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                New Agreement
              </Button>
            )}
          </div>
        }
      />

      {/* Employee Profile Master Card & Smart Action Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <EmployeeAvatar name={`${employee.firstName} ${employee.lastName}`} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  {employee.firstName} {employee.lastName}
                </h2>
                <Badge status={employee.status} size="sm">{employee.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.position} &bull; <strong className="text-slate-700">{employee.department}</strong> &bull; {employee.employeeType}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-mono">
                <span>{employee.email}</span>
                <span>&bull;</span>
                <span>{employee.phone}</span>
              </div>
            </div>
          </div>

          {/* Active Contract Quick Card */}
          <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/80 text-right shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 block">
              Active Agreement
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              {activeContract ? `₹${activeContract.wage.toLocaleString('en-IN')}` : 'None'}
            </div>
            <span className="text-[11px] text-slate-500 block">
              {activeContract ? activeContract.contractNumber : 'Awaiting contract creation'}
            </span>
          </div>
        </div>

        {/* Smart Action Buttons with Live Record Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeTab === 'contracts'
                ? 'border-violet-500 bg-violet-50/60 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Contracts</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                {contracts.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeContract ? 'Active agreement running' : 'Historical records'}
            </p>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeTab === 'attendance'
                ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Attendance</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {attendance.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Daily punches & hours</p>
          </button>

          <button
            onClick={() => setActiveTab('timeoff')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeTab === 'timeoff'
                ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Time Off</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {leaveRequests.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Applications & balances</p>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeTab === 'payroll'
                ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Payslips</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {payslips.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Salary vouchers</p>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & People Timeline
          </button>
          <button
            onClick={() => setActiveTab('employment')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'employment'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Employment & Bank Info
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'contracts'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Contracts ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'attendance'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Attendance ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab('timeoff')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'timeoff'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Time Off ({leaveRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'payroll'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payslips ({payslips.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Overview & People Timeline */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* People Timeline (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  People Timeline & Milestone History
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological record of contractual transitions, wage revisions, and service events.
                </p>
              </div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
              <Timeline events={timelineEvents} />
            </div>
          </div>

          {/* Quick Details Sidebar (Span 1) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Quick Highlights
            </h3>
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Joining Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{employee.joiningDate}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Manager</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{employee.managerName || 'Direct to CEO'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Working Schedule</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{employee.workingSchedule || 'Standard 45h/week (Mon-Fri)'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Primary Bank</span>
                <span className="font-semibold text-slate-800 mt-0.5 block font-mono">{employee.bankName || 'HDFC Bank'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Employment & Bank Details */}
      {activeTab === 'employment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-heading pb-2 border-b border-slate-100">
              Employment Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Employee Code</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.code}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Department</span>
                <span className="font-semibold text-slate-800">{employee.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Position</span>
                <span className="font-semibold text-slate-800">{employee.position}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Employment Type</span>
                <span className="font-semibold text-slate-800">{employee.employeeType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date of Joining</span>
                <span className="font-semibold text-slate-800">{employee.joiningDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <Badge status={employee.status} size="sm">{employee.status}</Badge>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-heading pb-2 border-b border-slate-100">
              Banking & Statutory Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Bank Name</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.bankName || 'HDFC Bank'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Account Number</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.accountNumber || '••••••••4819'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">IFSC Code</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.ifscCode || 'HDFC0001234'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">PAN Card</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.panNumber || 'ABCDE1234F'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Contracts Ledger */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Contract Ledger & Historical Agreements
            </h3>
            {canAccess(['hr_manager', 'admin']) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsContractModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Create Agreement
              </Button>
            )}
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
            <Table>
              <Thead>
                <Tr>
                  <Th>Contract ID</Th>
                  <Th>Period</Th>
                  <Th>Salary Structure</Th>
                  <Th>Monthly Wage</Th>
                  <Th>Status</Th>
                  <Th>Nature</Th>
                </Tr>
              </Thead>
              <Tbody>
                {contracts.map((c) => (
                  <Tr key={c.id}>
                    <Td className="font-mono font-medium text-slate-900 text-xs">
                      {c.contractNumber}
                    </Td>
                    <Td className="text-xs text-slate-600">
                      {c.startDate} &rarr; {c.endDate || 'Present'}
                    </Td>
                    <Td className="text-xs text-slate-800">
                      {c.salaryStructureName || 'Standard Structure'}
                    </Td>
                    <Td className="text-xs font-bold text-slate-900 font-mono">
                      ₹{c.wage.toLocaleString('en-IN')}
                    </Td>
                    <Td>
                      <Badge status={c.status} size="sm">{c.status}</Badge>
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {c.status === 'Active' ? (
                        <span className="text-emerald-700 font-medium">Active agreement</span>
                      ) : (
                        <span className="text-slate-400">Historical agreement</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Tab 4: Attendance Records */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Daily Attendance Records
          </h3>
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Check In</Th>
                  <Th>Check Out</Th>
                  <Th>Worked Hours</Th>
                  <Th>Expected</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {attendance.map((att) => (
                  <Tr key={att.id}>
                    <Td className="text-xs font-mono">{att.date}</Td>
                    <Td className="text-xs font-mono">{att.checkIn || '--:--'}</Td>
                    <Td className="text-xs font-mono">{att.checkOut || '--:--'}</Td>
                    <Td className="text-xs font-semibold">{att.workedHours}h</Td>
                    <Td className="text-xs text-slate-500">8.0h</Td>
                    <Td>
                      <Badge status={att.status} size="sm">{att.status}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Tab 5: Time Off Applications */}
      {activeTab === 'timeoff' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Time Off Applications & Allocations
          </h3>
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
            <Table>
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Date Range</Th>
                  <Th>Duration</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leaveRequests.map((l) => (
                  <Tr key={l.id}>
                    <Td className="text-xs font-semibold text-slate-900">{l.leaveType}</Td>
                    <Td className="text-xs text-slate-600">{l.startDate} &rarr; {l.endDate}</Td>
                    <Td className="text-xs font-bold text-slate-900">{l.duration} Day(s)</Td>
                    <Td className="text-xs text-slate-500">{l.reason || '--'}</Td>
                    <Td>
                      <Badge status={l.status} size="sm">{l.status}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Tab 6: Payroll Payslips */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Salary Vouchers & Payslips
          </h3>
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
            <Table>
              <Thead>
                <Tr>
                  <Th>Period</Th>
                  <Th>Gross Salary</Th>
                  <Th>Deductions</Th>
                  <Th>Net Pay</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payslips.map((ps) => (
                  <Tr key={ps.id}>
                    <Td className="text-xs font-semibold text-slate-900">{ps.period}</Td>
                    <Td className="text-xs font-mono">₹{ps.grossSalary.toLocaleString('en-IN')}</Td>
                    <Td className="text-xs font-mono text-rose-600">-₹{ps.totalDeductions.toLocaleString('en-IN')}</Td>
                    <Td className="text-xs font-bold font-mono text-emerald-700">₹{ps.netSalary.toLocaleString('en-IN')}</Td>
                    <Td><Badge status={ps.status} size="sm">{ps.status}</Badge></Td>
                    <Td className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPayslip(ps)}
                      >
                        View Voucher
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Modal: New Contract */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onSaved={async () => {
          await loadAllData();
          setIsContractModalOpen(false);
        }}
        preselectedEmployeeId={employee.id}
      />

      {/* Modal: Payslip Financial Voucher */}
      {selectedPayslip && (
        <PayslipDetailModal
          isOpen={!!selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
          payslip={selectedPayslip}
        />
      )}
    </div>
  );
};
