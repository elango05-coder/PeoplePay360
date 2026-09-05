import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Building2, 
  Clock, 
  Calendar, 
  DollarSign, 
  FileSpreadsheet, 
  FileCheck 
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();

  const [activeReportTab, setActiveReportTab] = useState<'headcount' | 'attendance' | 'payroll' | 'leave'>('headcount');
  const [selectedDept, setSelectedDept] = useState('All');
  const [headcountData, setHeadcountData] = useState<{ department: string; count: number; percentage: number }[]>([]);
  const [attendanceOverview, setAttendanceOverview] = useState({
    presentRate: 85,
    lateRate: 10,
    absentRate: 5,
    missingCheckoutRate: 0
  });
  const [payrollTrends, setPayrollTrends] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadReportMetrics() {
      try {
        const [hc, att, pr] = await Promise.all([
          reportService.getHeadcountByDepartment(),
          reportService.getAttendanceOverview(),
          reportService.getPayrollTrends()
        ]);
        setHeadcountData(hc);
        setAttendanceOverview(att);
        setPayrollTrends(pr);
      } catch (err) {
        console.error(err);
      }
    }
    loadReportMetrics();
  }, []);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      const res = await reportService.exportReport(activeReportTab, format);
      success('Report Exported', `${res.filename} generated successfully.`);
    } catch (err) {
      console.error(err);
      error('Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Analytics & Operational Reports</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Generate executive compliance summaries, headcount ratios, and payroll cost trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            isLoading={isExporting}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport('pdf')}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: 'headcount', label: 'Headcount & Departments', icon: <Building2 className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance & Punctuality', icon: <Clock className="w-4 h-4" /> },
          { id: 'payroll', label: 'Payroll Cost & Taxation', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'leave', label: 'Leave Utilization', icon: <Calendar className="w-4 h-4" /> }
        ].map((tab) => {
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-colors border ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report View 1: Headcount */}
      {activeReportTab === 'headcount' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Headcount Distribution</CardTitle>
              <CardDescription>Active personnel across organizational divisions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {headcountData.map((d) => (
                <div key={d.department} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                    <span>{d.department}</span>
                    <span>{d.count} Employees ({d.percentage}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${d.percentage}%` }}
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workforce Breakdown Summary</CardTitle>
              <CardDescription>Status and tenure distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Department</Th>
                    <Th>Active Staff</Th>
                    <Th>Ratio</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {headcountData.map((d) => (
                    <Tr key={d.department}>
                      <Td className="font-semibold text-slate-900">{d.department}</Td>
                      <Td className="font-bold text-slate-800">{d.count}</Td>
                      <Td className="text-slate-600 font-mono text-xs">{d.percentage}%</Td>
                      <Td>
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                          Optimal Capacity
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report View 2: Attendance */}
      {activeReportTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Punctuality Ratios</CardTitle>
              <CardDescription>Shift compliance rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <span className="text-xs font-semibold text-emerald-800 block">On-Time Attendance</span>
                  <span className="text-3xl font-black text-emerald-700 mt-1 block">
                    {attendanceOverview.presentRate}%
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                  <span className="text-xs font-semibold text-amber-800 block">Late Punch-ins</span>
                  <span className="text-3xl font-black text-amber-700 mt-1 block">
                    {attendanceOverview.lateRate}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">Key Compliance Findings:</p>
                <p>&bull; 92% of staff punch in within standard grace period (15 mins).</p>
                <p>&bull; Missing checkout occurrences regularized within 24 hours.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Absence & Correction Rates</CardTitle>
              <CardDescription>Monthly variance tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-600">Total Working Days in Month:</span>
                <span className="font-bold text-slate-900">22 Days</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-600">Average Punctuality Rating:</span>
                <span className="font-bold text-emerald-600">96.4% Compliance</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-600">Total Biometric Regularizations:</span>
                <span className="font-bold text-slate-900">3 Adjustments Approved</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report View 3: Payroll Costs */}
      {activeReportTab === 'payroll' && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Payroll Disbursal Trends</CardTitle>
            <CardDescription>Summary of gross expenditure and tax deductions per cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <Thead>
                <Tr>
                  <Th>Payroll Cycle</Th>
                  <Th>Gross Salary (₹)</Th>
                  <Th>Total Deductions (₹)</Th>
                  <Th>Net Disbursed (₹)</Th>
                  <Th>Final Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payrollTrends.map((trend, i) => (
                  <Tr key={i}>
                    <Td className="font-semibold text-slate-900">{trend.period}</Td>
                    <Td className="font-medium text-slate-800">₹{trend.gross.toLocaleString('en-IN')}</Td>
                    <Td className="text-rose-600">₹{trend.deductions.toLocaleString('en-IN')}</Td>
                    <Td className="font-bold text-emerald-600">₹{trend.net.toLocaleString('en-IN')}</Td>
                    <Td>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {trend.status}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Report View 4: Leave Utilization */}
      {activeReportTab === 'leave' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-5 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Annual Leave Utilization</span>
              <div className="text-3xl font-black text-brand-600 mt-2">24%</div>
              <p className="text-xs text-slate-400 mt-1">Average 4.2 days used per employee</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sick Leave Utilization</span>
              <div className="text-3xl font-black text-emerald-600 mt-2">12%</div>
              <p className="text-xs text-slate-400 mt-1">Average 1.4 days used per employee</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approval Rate</span>
              <div className="text-3xl font-black text-purple-600 mt-2">91%</div>
              <p className="text-xs text-slate-400 mt-1">9 out of 10 requests approved</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
