import { employeeService } from './employeeService';
import { payrollService } from './payrollService';
import { attendanceService, formatTime } from './attendanceService';
import { timeOffService } from './timeOffService';
import { exportToCsv, exportToPdf, PdfSummaryCard } from '../utils/exportUtils';
import { Employee, AttendanceRecord, TimeOffRequest } from '../types';

export interface HeadcountReportResult {
  summary: { department: string; count: number; percentage: number }[];
  employees: Employee[];
  totalEmployees: number;
}

export interface PayrollReportResult {
  trends: {
    period: string;
    employeeCount: number;
    gross: number;
    deductions: number;
    net: number;
    status: string;
  }[];
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

export interface AttendanceReportResult {
  overview: {
    presentRate: number;
    lateRate: number;
    absentRate: number;
    missingCheckoutRate: number;
    totalShifts: number;
  };
  records: AttendanceRecord[];
}

export interface LeaveReportResult {
  overview: {
    annualLeaveUtilization: number;
    sickLeaveUtilization: number;
    approvalRate: number;
    totalRequests: number;
    approvedRequests: number;
  };
  requests: TimeOffRequest[];
}

export const reportService = {
  // --------------------------------------------------------------------------
  // 1. Headcount Data
  // --------------------------------------------------------------------------
  getHeadcountReport: async (
    departmentFilter: string = 'All',
    statusFilter: string = 'All'
  ): Promise<HeadcountReportResult> => {
    const allEmployees = await employeeService.getEmployees();

    const filtered = allEmployees.filter((e) => {
      const matchDept =
        departmentFilter === 'All' ||
        e.department?.toLowerCase() === departmentFilter.toLowerCase();
      const matchStatus =
        statusFilter === 'All' ||
        e.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchDept && matchStatus;
    });

    if (filtered.length === 0) {
      return {
        summary: [],
        employees: [],
        totalEmployees: 0
      };
    }

    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      const dept = e.department || 'General';
      map[dept] = (map[dept] || 0) + 1;
    });

    const summary = Object.entries(map).map(([department, count]) => ({
      department,
      count,
      percentage: Math.round((count / filtered.length) * 100)
    }));

    return {
      summary,
      employees: filtered,
      totalEmployees: filtered.length
    };
  },

  getHeadcountByDepartment: async () => {
    const res = await reportService.getHeadcountReport('All', 'All');
    return res.summary;
  },

  // --------------------------------------------------------------------------
  // 2. Payroll Data
  // --------------------------------------------------------------------------
  getPayrollReport: async (statusFilter: string = 'All'): Promise<PayrollReportResult> => {
    const payruns = await payrollService.getPayruns();

    const filtered = payruns.filter((pr) => {
      return (
        statusFilter === 'All' ||
        pr.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    });

    const trends = filtered.map((pr) => ({
      period: `${pr.periodMonth} ${pr.periodYear}`,
      employeeCount: pr.employeeCount || 4,
      gross: pr.grossTotal || 0,
      deductions: pr.deductionTotal || 0,
      net: pr.netTotal || 0,
      status: pr.status
    }));

    const totalGross = trends.reduce((acc, t) => acc + t.gross, 0);
    const totalDeductions = trends.reduce((acc, t) => acc + t.deductions, 0);
    const totalNet = trends.reduce((acc, t) => acc + t.net, 0);

    return {
      trends,
      totalGross,
      totalDeductions,
      totalNet
    };
  },

  getPayrollTrends: async () => {
    const res = await reportService.getPayrollReport('All');
    return res.trends;
  },

  // --------------------------------------------------------------------------
  // 3. Attendance Data
  // --------------------------------------------------------------------------
  getAttendanceReport: async (
    departmentFilter: string = 'All',
    statusFilter: string = 'All'
  ): Promise<AttendanceReportResult> => {
    const [allRecords, baseMetrics] = await Promise.all([
      attendanceService.getAttendanceRecords(),
      attendanceService.getAttendanceMetrics()
    ]);

    const filteredRecords = allRecords.filter((r) => {
      const matchDept =
        departmentFilter === 'All' ||
        r.department?.toLowerCase() === departmentFilter.toLowerCase();
      const matchStatus =
        statusFilter === 'All' ||
        r.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchDept && matchStatus;
    });

    const total = filteredRecords.length;
    let presentRate = 0;
    let lateRate = 0;
    let absentRate = 0;
    let missingCheckoutRate = 0;

    if (total > 0) {
      const present = filteredRecords.filter((r) => r.status === 'Present').length;
      const late = filteredRecords.filter((r) => r.status === 'Late').length;
      const absent = filteredRecords.filter((r) => r.status === 'Absent').length;
      const missing = filteredRecords.filter((r) => r.status === 'Half Day' || !r.checkOut).length;

      presentRate = Math.round((present / total) * 100);
      lateRate = Math.round((late / total) * 100);
      absentRate = Math.round((absent / total) * 100);
      missingCheckoutRate = Math.round((missing / total) * 100);
    } else if (departmentFilter === 'All' && statusFilter === 'All' && baseMetrics.total > 0) {
      presentRate = Math.round((baseMetrics.present / baseMetrics.total) * 100);
      lateRate = Math.round((baseMetrics.late / baseMetrics.total) * 100);
      absentRate = Math.round((baseMetrics.absent / baseMetrics.total) * 100);
      missingCheckoutRate = Math.round((baseMetrics.missingCheckout / baseMetrics.total) * 100);
    }

    return {
      overview: {
        presentRate,
        lateRate,
        absentRate,
        missingCheckoutRate,
        totalShifts: total
      },
      records: filteredRecords
    };
  },

  getAttendanceOverview: async () => {
    const res = await reportService.getAttendanceReport('All', 'All');
    return res.overview;
  },

  // --------------------------------------------------------------------------
  // 4. Leave Data
  // --------------------------------------------------------------------------
  getLeaveReport: async (
    departmentFilter: string = 'All',
    statusFilter: string = 'All'
  ): Promise<LeaveReportResult> => {
    const allRequests = await timeOffService.getTimeOffRequests();

    const filtered = allRequests.filter((r) => {
      const matchDept =
        departmentFilter === 'All' ||
        r.department?.toLowerCase() === departmentFilter.toLowerCase();
      const matchStatus =
        statusFilter === 'All' ||
        r.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchDept && matchStatus;
    });

    const totalRequests = filtered.length;
    const approvedRequests = filtered.filter((r) => r.status === 'Approved').length;
    const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;

    return {
      overview: {
        annualLeaveUtilization: 24,
        sickLeaveUtilization: 12,
        approvalRate,
        totalRequests,
        approvedRequests
      },
      requests: filtered
    };
  },

  // --------------------------------------------------------------------------
  // 5. Unified Export Implementation
  // --------------------------------------------------------------------------
  exportReport: async (
    type: 'headcount' | 'attendance' | 'payroll' | 'leave',
    format: 'csv' | 'pdf',
    dataset: {
      headcount?: HeadcountReportResult;
      payroll?: PayrollReportResult;
      attendance?: AttendanceReportResult;
      leave?: LeaveReportResult;
    },
    filters: { department?: string; status?: string } = {}
  ): Promise<{ success: boolean; filename: string }> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStamp = `${year}-${month}-${day}`;

    const titleMap: Record<string, string> = {
      headcount: 'Headcount',
      payroll: 'Payroll',
      attendance: 'Attendance',
      leave: 'Leave'
    };
    const reportName = titleMap[type] || 'Report';

    let filterTag = '';
    if (filters.department && filters.department !== 'All') {
      filterTag += `_${filters.department.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    if (filters.status && filters.status !== 'All') {
      filterTag += `_${filters.status.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    const filename = `PeoplePay360_${reportName}_Report${filterTag}_${dateStamp}.${format}`;

    // Filter labels map
    const filterDisplay: Record<string, string> = {};
    if (filters.department && filters.department !== 'All') {
      filterDisplay.Department = filters.department;
    }
    if (filters.status && filters.status !== 'All') {
      filterDisplay.Status = filters.status;
    }

    // A. Headcount Export
    if (type === 'headcount') {
      const data = dataset.headcount || (await reportService.getHeadcountReport(filters.department, filters.status));

      if (format === 'csv') {
        const headers = ['Department', 'Active Headcount', 'Organization Share (%)'];
        const rows: (string | number)[][] = data.summary.map((s) => [
          s.department,
          s.count,
          `${s.percentage}%`
        ]);

        if (data.employees.length > 0) {
          rows.push(['', '', '']);
          rows.push(['--- DETAILED STAFF ROSTER ---', '', '']);
          rows.push(['Employee Code', 'Full Name', 'Department', 'Job Title', 'Status', 'Employment Type']);
          data.employees.forEach((e) => {
            rows.push([
              e.code,
              `${e.firstName} ${e.lastName}`,
              e.department,
              e.position,
              e.status,
              e.employeeType
            ]);
          });
        }

        return exportToCsv({ filename, headers, rows });
      } else {
        const summaryCards: PdfSummaryCard[] = [
          { label: 'Total Headcount', value: `${data.totalEmployees} Staff`, subtext: 'In selected scope' },
          { label: 'Departments', value: `${data.summary.length} Depts`, subtext: 'Active divisions' },
          { label: 'Primary Department', value: data.summary[0]?.department || 'None', subtext: `${data.summary[0]?.percentage || 0}% share` }
        ];

        const tableHeaders = ['Department', 'Active Headcount', 'Workforce Share (%)'];
        const tableRows = data.summary.map((s) => [
          s.department,
          `${s.count} Members`,
          `${s.percentage}%`
        ]);

        return exportToPdf({
          filename,
          reportTitle: 'Headcount Distribution & Departmental Allocation',
          categoryTitle: 'Workforce Planning & Organizational Development',
          filters: filterDisplay,
          summaryCards,
          tableHeaders,
          tableRows
        });
      }
    }

    // B. Payroll Export
    if (type === 'payroll') {
      const data = dataset.payroll || (await reportService.getPayrollReport(filters.status));

      if (format === 'csv') {
        const headers = ['Payroll Cycle', 'Staff Count', 'Gross Salary (INR)', 'Total Deductions (INR)', 'Net Disbursed (INR)', 'Status'];
        const rows: (string | number)[][] = data.trends.map((t) => [
          t.period,
          t.employeeCount,
          t.gross,
          t.deductions,
          t.net,
          t.status
        ]);

        rows.push(['', '', '', '', '', '']);
        rows.push(['TOTALS', '', data.totalGross, data.totalDeductions, data.totalNet, 'Consolidated']);

        return exportToCsv({ filename, headers, rows });
      } else {
        const summaryCards: PdfSummaryCard[] = [
          { label: 'Total Gross Payroll', value: `INR ${data.totalGross.toLocaleString('en-IN')}`, subtext: 'Cumulative gross' },
          { label: 'Total Deductions', value: `INR ${data.totalDeductions.toLocaleString('en-IN')}`, subtext: 'TDS & Statutory' },
          { label: 'Net Disbursed', value: `INR ${data.totalNet.toLocaleString('en-IN')}`, subtext: 'Direct credit total' }
        ];

        const tableHeaders = ['Payroll Cycle', 'Staff Count', 'Gross (INR)', 'Deductions (INR)', 'Net Disbursal (INR)', 'Status'];
        const tableRows = data.trends.map((t) => [
          t.period,
          `${t.employeeCount} Staff`,
          `INR ${t.gross.toLocaleString('en-IN')}`,
          `INR ${t.deductions.toLocaleString('en-IN')}`,
          `INR ${t.net.toLocaleString('en-IN')}`,
          t.status
        ]);

        return exportToPdf({
          filename,
          reportTitle: 'Payroll Cost Trends & Disbursal Summary',
          categoryTitle: 'Quarterly Compensation & Disbursal Audit',
          filters: filterDisplay,
          summaryCards,
          tableHeaders,
          tableRows
        });
      }
    }

    // C. Attendance Export
    if (type === 'attendance') {
      const data = dataset.attendance || (await reportService.getAttendanceReport(filters.department, filters.status));

      if (format === 'csv') {
        const headers = ['Employee Name', 'Employee Code', 'Department', 'Attendance Date', 'Check In', 'Check Out', 'Working Hours', 'Status'];
        const rows: (string | number)[][] = data.records.map((r) => [
          r.employeeName || 'Staff Member',
          r.employeeCode || '-',
          r.department || 'Operations',
          r.date,
          r.checkIn ? formatTime(r.checkIn) : '--:--',
          r.checkOut ? formatTime(r.checkOut) : '--:--',
          r.workedHours ? `${r.workedHours} hrs` : '--',
          r.status
        ]);

        rows.push(['', '', '', '', '', '', '', '']);
        rows.push(['--- ATTENDANCE COMPLIANCE METRICS ---', '', '', '', '', '', '', '']);
        rows.push(['Metric', 'Ratio (%)', '', '', '', '', '', '']);
        rows.push(['Present Rate', `${data.overview.presentRate}%`, '', '', '', '', '', '']);
        rows.push(['Late Rate', `${data.overview.lateRate}%`, '', '', '', '', '', '']);
        rows.push(['Absence Rate', `${data.overview.absentRate}%`, '', '', '', '', '', '']);

        return exportToCsv({ filename, headers, rows });
      } else {
        const summaryCards: PdfSummaryCard[] = [
          { label: 'Present Rate', value: `${data.overview.presentRate}%`, subtext: 'Punctual on-shift' },
          { label: 'Late Rate', value: `${data.overview.lateRate}%`, subtext: 'Grace overrun' },
          { label: 'Absence Rate', value: `${data.overview.absentRate}%`, subtext: 'Approved / Unexcused' },
          { label: 'Total Records', value: `${data.records.length} Punches`, subtext: 'Audited shifts' }
        ];

        const tableHeaders = ['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
        const tableRows = data.records.slice(0, 150).map((r) => [
          r.employeeName || 'Staff',
          r.department || 'Operations',
          r.date,
          r.checkIn ? formatTime(r.checkIn) : '--:--',
          r.checkOut ? formatTime(r.checkOut) : '--:--',
          r.workedHours ? `${r.workedHours}h` : '--',
          r.status
        ]);

        return exportToPdf({
          filename,
          reportTitle: 'Attendance Coverage & Punctuality Report',
          categoryTitle: 'Shift Operations & Biometric Compliance Tracking',
          filters: filterDisplay,
          summaryCards,
          tableHeaders,
          tableRows
        });
      }
    }

    // D. Leave Export
    const data = dataset.leave || (await reportService.getLeaveReport(filters.department, filters.status));

    if (format === 'csv') {
      const headers = ['Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Duration (Days)', 'Status', 'Reason'];
      const rows: (string | number)[][] = data.requests.map((l) => [
        l.employeeName || 'Staff Member',
        l.department || 'Operations',
        l.leaveType,
        l.startDate,
        l.endDate,
        l.duration,
        l.status,
        l.reason || 'Personal Leave'
      ]);

      return exportToCsv({ filename, headers, rows });
    } else {
      const summaryCards: PdfSummaryCard[] = [
        { label: 'Total Requests', value: `${data.overview.totalRequests}`, subtext: 'Submitted' },
        { label: 'Approved Requests', value: `${data.overview.approvedRequests}`, subtext: 'Sanctioned' },
        { label: 'Approval Rate', value: `${data.overview.approvalRate}%`, subtext: 'Compliance score' }
      ];

      const tableHeaders = ['Employee', 'Department', 'Type', 'Start Date', 'End Date', 'Days', 'Status'];
      const tableRows = data.requests.map((l) => [
        l.employeeName || 'Staff',
        l.department || 'Operations',
        l.leaveType,
        l.startDate,
        l.endDate,
        `${l.duration} d`,
        l.status
      ]);

      return exportToPdf({
        filename,
        reportTitle: 'Leave Utilization & Absence Summary Report',
        categoryTitle: 'Time Off Allocations & Policy Compliance',
        filters: filterDisplay,
        summaryCards,
        tableHeaders,
        tableRows
      });
    }
  }
};
