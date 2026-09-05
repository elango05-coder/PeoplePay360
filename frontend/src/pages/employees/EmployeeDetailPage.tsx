import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar, 
  CreditCard, 
  FileText, 
  Clock, 
  Plus
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { contractService } from '../../services/contractService';
import { attendanceService } from '../../services/attendanceService';
import { timeOffService } from '../../services/timeOffService';
import { payrollService } from '../../services/payrollService';
import { Employee, Contract, AttendanceRecord, TimeOffRequest, LeaveBalance, Payslip } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { ContractModal } from '../contracts/ContractModal';
import { PayslipDetailModal } from '../payroll/PayslipDetailModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useToast();
  const { canAccess } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<TimeOffRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const loadAllData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const emp = await employeeService.getEmployeeById(id);
      if (!emp) {
        error('Employee not found');
        navigate('/employees');
        return;
      }
      setEmployee(emp);

      const [cntList, attList, reqList, balList, psList] = await Promise.all([
        contractService.getContracts({ employeeId: id }),
        attendanceService.getAttendanceRecords({ employeeId: id }),
        timeOffService.getTimeOffRequests({ employeeId: id }),
        timeOffService.getLeaveBalances(id),
        payrollService.getPayslips({ employeeId: id })
      ]);

      setContracts(cntList);
      setAttendance(attList);
      setLeaveRequests(reqList);
      setLeaveBalances(balList);
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

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Loading employee profile...
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'contracts', label: 'Contracts', count: contracts.length, icon: <FileText className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', count: attendance.length, icon: <Clock className="w-4 h-4" /> },
    { id: 'timeoff', label: 'Time Off', count: leaveRequests.length, icon: <Calendar className="w-4 h-4" /> },
    { id: 'payroll', label: 'Payslips', count: payslips.length, icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate('/employees')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </button>

      {/* Profile Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={employee.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={`${employee.firstName} ${employee.lastName}`}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-brand-100 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                  {employee.firstName} {employee.lastName}
                </h2>
                <Badge status={employee.status}>{employee.status}</Badge>
              </div>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {employee.position} &bull; {employee.department}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {employee.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {employee.phone}
                </span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  {employee.code}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Joined <strong>{employee.joiningDate}</strong>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 pt-2">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Job & Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                Employment & Shift Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-800">{employee.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Job Position</span>
                <span className="font-semibold text-slate-800">{employee.position}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Employment Type</span>
                <span className="font-semibold text-slate-800">{employee.employeeType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Reporting Manager</span>
                <span className="font-semibold text-slate-800">{employee.managerName || 'None assigned'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Working Schedule</span>
                <span className="font-semibold text-slate-800">{employee.workingSchedule || 'Standard 9:00 AM - 6:00 PM'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Date of Birth</span>
                <span className="font-semibold text-slate-800">{employee.dob}</span>
              </div>
            </CardContent>
          </Card>

          {/* Statutory Banking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-600" />
                Statutory Banking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Bank Name</span>
                <span className="font-semibold text-slate-800">{employee.bankName || 'HDFC Bank'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Account Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  {employee.accountNumber ? `•••• •••• ${employee.accountNumber.slice(-4)}` : '5010023498112'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">IFSC Code</span>
                <span className="font-mono font-semibold text-slate-800">{employee.ifscCode || 'HDFC0001234'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">PAN Number</span>
                <span className="font-mono font-semibold text-slate-800">{employee.panNumber || 'ABCDE1234F'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Payroll Routing</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  Direct Bank Transfer (NEFT/RTGS)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Contracts (CRITICAL CONCEPT: Employee can have multiple contracts) */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Employment Contract History</h3>
              <p className="text-xs text-slate-500">
                Historical progression of contracts, compensation revisions, and terms for this employee.
              </p>
            </div>
            {canAccess(['hr_manager', 'admin']) && (
              <Button
                size="sm"
                onClick={() => setIsContractModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Contract Revision
              </Button>
            )}
          </div>

          {contracts.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No contracts logged"
              description="No employment agreements have been recorded for this employee."
              actionLabel="Create Contract"
              onAction={() => setIsContractModalOpen(true)}
            />
          ) : (
            <div className="space-y-4">
              {contracts.map((cnt, idx) => {
                const isActive = cnt.status === 'Active';
                return (
                  <div
                    key={cnt.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-brand-300 bg-brand-50/30 ring-1 ring-brand-200'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {cnt.contractNumber}
                          </span>
                          <Badge status={cnt.status}>{cnt.status}</Badge>
                          {isActive && (
                            <span className="text-[11px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                              Current Active Contract
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {cnt.jobPosition} &bull; {cnt.department}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Period: {cnt.startDate} &rarr; {cnt.endDate || 'Present'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                          Contract Wage
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-slate-900">
                          ₹{cnt.wage.toLocaleString('en-IN')}{' '}
                          <span className="text-xs text-slate-500 font-normal">/ month</span>
                        </span>
                        <p className="text-xs text-brand-600 font-medium mt-0.5">
                          {cnt.salaryStructureName}
                        </p>
                      </div>
                    </div>

                    {cnt.terms && (
                      <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 italic">
                        &ldquo;{cnt.terms}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Attendance */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Log</CardTitle>
            <CardDescription>Punches and worked duration for this employee</CardDescription>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records logged yet.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Check In</Th>
                    <Th>Check Out</Th>
                    <Th>Worked Hours</Th>
                    <Th>Status</Th>
                    <Th>Notes</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {attendance.map((att) => (
                    <Tr key={att.id}>
                      <Td className="font-medium text-slate-900">{att.date}</Td>
                      <Td>{att.checkIn}</Td>
                      <Td>{att.checkOut}</Td>
                      <Td className="font-semibold text-slate-800">{att.workedHours}</Td>
                      <Td>
                        <Badge status={att.status} size="sm">
                          {att.status}
                        </Badge>
                      </Td>
                      <Td className="text-xs text-slate-500">{att.notes || '--'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Time Off */}
      {activeTab === 'timeoff' && (
        <div className="space-y-6">
          {/* Leave Balances Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {leaveBalances.map((bal) => (
              <div key={bal.leaveType} className="p-4 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  {bal.leaveType} Leave
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{bal.remaining}</span>
                  <span className="text-xs text-slate-500">/ {bal.allocated} days left</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    style={{ width: `${(bal.used / bal.allocated) * 100}%` }}
                    className="h-full bg-brand-500 rounded-full"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {bal.used} days utilized
                </span>
              </div>
            ))}
          </div>

          {/* Leave Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Application History</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No leave requests submitted.</p>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Leave Type</Th>
                      <Th>Start Date</Th>
                      <Th>End Date</Th>
                      <Th>Days</Th>
                      <Th>Reason</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {leaveRequests.map((req) => (
                      <Tr key={req.id}>
                        <Td className="font-semibold text-slate-800">{req.leaveType}</Td>
                        <Td>{req.startDate}</Td>
                        <Td>{req.endDate}</Td>
                        <Td>{req.duration} days</Td>
                        <Td className="text-xs text-slate-600 max-w-xs truncate">{req.reason}</Td>
                        <Td>
                          <Badge status={req.status} size="sm">
                            {req.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Payroll & Payslips */}
      {activeTab === 'payroll' && (
        <Card>
          <CardHeader>
            <CardTitle>Payslips & Compensation Summary</CardTitle>
            <CardDescription>Processed pay slips issued to this employee</CardDescription>
          </CardHeader>
          <CardContent>
            {payslips.length === 0 ? (
              <p className="text-sm text-slate-500">No payslips generated yet for this employee.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Period</Th>
                    <Th>Payrun Name</Th>
                    <Th>Gross Earnings</Th>
                    <Th>Deductions</Th>
                    <Th>Net Disbursal</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {payslips.map((ps) => (
                    <Tr key={ps.id}>
                      <Td className="font-semibold text-slate-900">{ps.period}</Td>
                      <Td className="text-slate-600">{ps.payrunName}</Td>
                      <Td className="font-medium text-slate-800">₹{ps.grossSalary.toLocaleString('en-IN')}</Td>
                      <Td className="text-rose-600">₹{ps.totalDeductions.toLocaleString('en-IN')}</Td>
                      <Td className="font-bold text-emerald-600">₹{ps.netSalary.toLocaleString('en-IN')}</Td>
                      <Td>
                        <Badge status={ps.status} size="sm">
                          {ps.status}
                        </Badge>
                      </Td>
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract Add Modal */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onSaved={loadAllData}
        preselectedEmployeeId={employee.id}
      />

      {/* Payslip Voucher Modal */}
      <PayslipDetailModal
        isOpen={Boolean(selectedPayslip)}
        onClose={() => setSelectedPayslip(null)}
        payslip={selectedPayslip}
      />
    </div>
  );
};
