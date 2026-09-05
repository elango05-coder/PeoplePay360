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
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();

  const [activeReportTab, setActiveReportTab] = useState<'headcount' | 'attendance' | 'payroll' | 'leave'>('headcount');
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
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExport('pdf')}
              isLoading={isExporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Sub-Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveReportTab('headcount')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'headcount'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Headcount Distribution
          </button>
          <button
            onClick={() => setActiveReportTab('payroll')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'payroll'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payroll Cost Trends
          </button>
          <button
            onClick={() => setActiveReportTab('attendance')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeReportTab === 'attendance'
                ? 'border-violet-600 text-violet-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Attendance Coverage
          </button>
        </nav>
      </div>

      {/* Report 1: Headcount Distribution */}
      {activeReportTab === 'headcount' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Departmental Staff Allocation
          </h3>
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
              {headcountData.map((d) => (
                <Tr key={d.department}>
                  <Td className="text-xs font-bold text-slate-900">{d.department}</Td>
                  <Td className="text-xs font-mono font-semibold">{d.count} Members</Td>
                  <Td className="text-xs font-mono font-bold text-violet-800">{d.percentage}%</Td>
                  <Td className="w-1/3">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${d.percentage}%` }}
                        className="h-full bg-violet-600 rounded-full"
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
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            Quarterly Disbursal Summary
          </h3>
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
              {payrollTrends.map((p, idx) => (
                <Tr key={idx}>
                  <Td className="text-xs font-bold text-slate-900">{p.period}</Td>
                  <Td className="text-xs font-mono">{p.employeeCount || 4} Staff</Td>
                  <Td className="text-xs font-mono font-semibold">₹{(p.gross || 228000).toLocaleString('en-IN')}</Td>
                  <Td className="text-xs font-mono text-rose-600">-₹{(p.deductions || 20500).toLocaleString('en-IN')}</Td>
                  <Td className="text-xs font-mono font-bold text-emerald-800">₹{(p.net || 207500).toLocaleString('en-IN')}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      {/* Report 3: Attendance Coverage */}
      {activeReportTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle">
            <span className="text-xs font-semibold text-slate-500 uppercase">Present Rate</span>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">{attendanceOverview.presentRate}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Punctual on-shift punches</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle">
            <span className="text-xs font-semibold text-slate-500 uppercase">Late Rate</span>
            <div className="text-2xl font-bold font-mono text-amber-800 mt-1">{attendanceOverview.lateRate}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Grace period overrun</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-subtle">
            <span className="text-xs font-semibold text-slate-500 uppercase">Absence Rate</span>
            <div className="text-2xl font-bold font-mono text-rose-800 mt-1">{attendanceOverview.absentRate}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved and unexcused leaves</p>
          </div>
        </div>
      )}
    </div>
  );
};
