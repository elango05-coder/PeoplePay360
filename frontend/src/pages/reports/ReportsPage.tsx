import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Building2, 
  Clock, 
  Calendar, 
  DollarSign, 
  FileSpreadsheet, 
  FileCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  reportService, 
  HeadcountReportResult, 
  PayrollReportResult, 
  AttendanceReportResult, 
  LeaveReportResult 
} from '../../services/reportService';
import { formatTime } from '../../services/attendanceService';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { FilterBar } from '../../components/common/FilterBar';
import { useToast } from '../../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();

  const [activeReportTab, setActiveReportTab] = useState<'headcount' | 'attendance' | 'payroll' | 'leave'>('headcount');

  // Filter States
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Data States
  const [headcountResult, setHeadcountResult] = useState<HeadcountReportResult>({
    summary: [],
    employees: [],
    totalEmployees: 0
  });
  const [payrollResult, setPayrollResult] = useState<PayrollReportResult>({
    trends: [],
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0
  });
  const [attendanceResult, setAttendanceResult] = useState<AttendanceReportResult>({
    overview: {
      presentRate: 0,
      lateRate: 0,
      absentRate: 0,
      missingCheckoutRate: 0,
      totalShifts: 0
    },
    records: []
  });
  const [leaveResult, setLeaveResult] = useState<LeaveReportResult>({
    overview: {
      annualLeaveUtilization: 24,
      sickLeaveUtilization: 12,
      approvalRate: 0,
      totalRequests: 0,
      approvedRequests: 0
    },
    requests: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Departments list for filter
  const departments = [
    { value: 'All', label: 'All Departments' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Operations', label: 'Operations' }
  ];

  // Statuses list for filter
  const statuses = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'On Leave', label: 'On Leave' },
    { value: 'Terminated', label: 'Terminated' }
  ];

  useEffect(() => {
    let mounted = true;

    async function loadReportMetrics() {
      setIsLoading(true);
      try {
        const [hc, pr, att, lv] = await Promise.all([
          reportService.getHeadcountReport(selectedDepartment, selectedStatus),
          reportService.getPayrollReport(selectedStatus),
          reportService.getAttendanceReport(selectedDepartment, selectedStatus),
          reportService.getLeaveReport(selectedDepartment, selectedStatus)
        ]);

        if (mounted) {
          setHeadcountResult(hc);
          setPayrollResult(pr);
          setAttendanceResult(att);
          setLeaveResult(lv);
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
        if (mounted) {
          error('Error', 'Unable to load report metrics. Please try again.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadReportMetrics();

    return () => {
      mounted = false;
    };
  }, [selectedDepartment, selectedStatus]);

  // Determine if current visible report has zero matching records
  const isCurrentReportEmpty = (() => {
    switch (activeReportTab) {
      case 'headcount':
        return headcountResult.summary.length === 0;
      case 'payroll':
        return payrollResult.trends.length === 0;
      case 'attendance':
        return attendanceResult.records.length === 0;
      case 'leave':
        return leaveResult.requests.length === 0;
      default:
        return false;
    }
  })();

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (isLoading) {
      error('Please wait', 'Please wait for the report data to load.');
      return;
    }

    if (isCurrentReportEmpty) {
      error('Export Error', 'No data available for the selected filters.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await reportService.exportReport(
        activeReportTab,
        format,
        {
          headcount: headcountResult,
          payroll: payrollResult,
          attendance: attendanceResult,
          leave: leaveResult
        },
        {
          department: selectedDepartment,
          status: selectedStatus
        }
      );
      success('Report Exported', `${res.filename} downloaded successfully.`);
    } catch (err: unknown) {
      console.error('Report export failure:', err);
      const errMsg = format === 'csv'
        ? 'Unable to export CSV. Please try again.'
        : 'Unable to generate PDF. Please try again.';
      error('Export Failed', errMsg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics & Compliance Reports"
        description="Departmental headcount distributions, shift punctuality coverage, and longitudinal payroll cost trends."
        breadcrumbs={[
          { label: 'Insights', path: '/reports' },
          { label: 'Reports & Analytics' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              isLoading={isExporting}
              disabled={isLoading || isCurrentReportEmpty}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExport('pdf')}
              isLoading={isExporting}
              disabled={isLoading || isCurrentReportEmpty}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center flex-wrap gap-2">
          <FilterBar
            options={departments}
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            placeholder="Department"
            label="Department"
          />
          <FilterBar
            options={statuses}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Status"
            label="Status"
          />
        </div>
        {(selectedDepartment !== 'All' || selectedStatus !== 'All') && (
          <button
            onClick={() => {
              setSelectedDepartment('All');
              setSelectedStatus('All');
            }}
            className="text-xs font-semibold text-[#8b008b] hover:underline self-end sm:self-center"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveReportTab('headcount')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'headcount'
                ? 'border-[#8b008b] text-[#8b008b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Headcount Distribution
          </button>
          <button
            onClick={() => setActiveReportTab('payroll')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'payroll'
                ? 'border-[#8b008b] text-[#8b008b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payroll Cost Trends
          </button>
          <button
            onClick={() => setActiveReportTab('attendance')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'attendance'
                ? 'border-[#8b008b] text-[#8b008b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Attendance Coverage
          </button>
          <button
            onClick={() => setActiveReportTab('leave')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'leave'
                ? 'border-[#8b008b] text-[#8b008b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leave Utilization
          </button>
        </nav>
      </div>

      {/* Loading Skeleton View */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-subtle space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#8b008b] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Loading report metrics...</p>
        </div>
      ) : isCurrentReportEmpty ? (
        /* Empty State */
        <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-subtle space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No data available for the selected filters.</p>
          <p className="text-xs text-slate-500">
            No records matched {selectedDepartment !== 'All' ? `Department "${selectedDepartment}"` : ''}
            {selectedDepartment !== 'All' && selectedStatus !== 'All' ? ' and ' : ''}
            {selectedStatus !== 'All' ? `Status "${selectedStatus}"` : ''}.
          </p>
          <button
            onClick={() => {
              setSelectedDepartment('All');
              setSelectedStatus('All');
            }}
            className="mt-3 inline-block px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Report 1: Headcount Distribution */}
          {activeReportTab === 'headcount' && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Departmental Staff Allocation
                </h3>
                <span className="text-xs font-mono font-medium text-slate-500">
                  {headcountResult.totalEmployees} Total Staff
                </span>
              </div>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Department</Th>
                    <Th>Active Headcount</Th>
                    <Th>Organization Share</Th>
                    <Th>Distribution Bar</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {headcountResult.summary.map((d) => (
                    <Tr key={d.department}>
                      <Td className="text-xs font-bold text-slate-900">{d.department}</Td>
                      <Td className="text-xs font-mono font-semibold">{d.count} Members</Td>
                      <Td className="text-xs font-mono font-bold text-[#8b008b]">{d.percentage}%</Td>
                      <Td className="w-1/3">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${d.percentage}%` }}
                            className="h-full bg-[#8b008b] rounded-full transition-all duration-300"
                          />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}

          {/* Report 2: Payroll Trends */}
          {activeReportTab === 'payroll' && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Quarterly Disbursal Summary
                </h3>
                <span className="text-xs font-mono font-medium text-slate-500">
                  Net Disbursed: ₹{payrollResult.totalNet.toLocaleString('en-IN')}
                </span>
              </div>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Payroll Cycle</Th>
                    <Th>Staff Count</Th>
                    <Th>Gross Payroll</Th>
                    <Th>Deductions</Th>
                    <Th>Net Disbursal</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {payrollResult.trends.map((p, idx) => (
                    <Tr key={idx}>
                      <Td className="text-xs font-bold text-slate-900">{p.period}</Td>
                      <Td className="text-xs font-mono">{p.employeeCount} Staff</Td>
                      <Td className="text-xs font-mono font-semibold">₹{p.gross.toLocaleString('en-IN')}</Td>
                      <Td className="text-xs font-mono text-rose-600">-₹{p.deductions.toLocaleString('en-IN')}</Td>
                      <Td className="text-xs font-mono font-bold text-emerald-700">₹{p.net.toLocaleString('en-IN')}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}

          {/* Report 3: Attendance Coverage */}
          {activeReportTab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Present Rate</span>
                  <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
                    {attendanceResult.overview.presentRate}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Punctual on-shift punches</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Late Rate</span>
                  <div className="text-2xl font-bold font-mono text-amber-800 mt-1">
                    {attendanceResult.overview.lateRate}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Grace period overrun</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Absence Rate</span>
                  <div className="text-2xl font-bold font-mono text-rose-800 mt-1">
                    {attendanceResult.overview.absentRate}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Approved and unexcused leaves</p>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Attendance Records Coverage
                </h3>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Employee</Th>
                      <Th>Department</Th>
                      <Th>Date</Th>
                      <Th>Check In</Th>
                      <Th>Check Out</Th>
                      <Th>Working Hours</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {attendanceResult.records.slice(0, 15).map((r) => (
                      <Tr key={r.id}>
                        <Td className="text-xs font-bold text-slate-900">{r.employeeName || 'Staff'}</Td>
                        <Td className="text-xs text-slate-600">{r.department || 'Operations'}</Td>
                        <Td className="text-xs font-mono">{r.date}</Td>
                        <Td className="text-xs font-mono">{formatTime(r.checkIn)}</Td>
                        <Td className="text-xs font-mono">{formatTime(r.checkOut)}</Td>
                        <Td className="text-xs font-mono">{r.workedHours ? `${r.workedHours}h` : '--'}</Td>
                        <Td>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            r.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.status === 'Late'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {r.status}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            </div>
          )}

          {/* Report 4: Leave Utilization */}
          {activeReportTab === 'leave' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Annual Leave Utilization</span>
                  <div className="text-3xl font-black text-[#8b008b] mt-2">
                    {leaveResult.overview.annualLeaveUtilization}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Average days used per employee</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sick Leave Utilization</span>
                  <div className="text-3xl font-black text-emerald-600 mt-2">
                    {leaveResult.overview.sickLeaveUtilization}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Medical leaves taken</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approval Rate</span>
                  <div className="text-3xl font-black text-[#8b008b] mt-2">
                    {leaveResult.overview.approvalRate}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{leaveResult.overview.approvedRequests} of {leaveResult.overview.totalRequests} requests approved</p>
                </div>
              </div>

              {/* Leave Table */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Time Off Requests Summary
                </h3>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Employee</Th>
                      <Th>Department</Th>
                      <Th>Type</Th>
                      <Th>Period</Th>
                      <Th>Days</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {leaveResult.requests.map((req) => (
                      <Tr key={req.id}>
                        <Td className="text-xs font-bold text-slate-900">{req.employeeName || 'Staff'}</Td>
                        <Td className="text-xs text-slate-600">{req.department || 'Operations'}</Td>
                        <Td className="text-xs font-medium text-slate-700">{req.leaveType}</Td>
                        <Td className="text-xs font-mono text-slate-500">{req.startDate} to {req.endDate}</Td>
                        <Td className="text-xs font-mono font-bold">{req.duration}d</Td>
                        <Td>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            req.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : req.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {req.status}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
