import { employeeService } from './employeeService';
import { payrollService } from './payrollService';
import { attendanceService } from './attendanceService';

export const reportService = {
  getHeadcountByDepartment: async () => {
    const employees = await employeeService.getEmployees();
    const map: Record<string, number> = {};
    employees.forEach((e) => {
      map[e.department] = (map[e.department] || 0) + 1;
    });
    return Object.entries(map).map(([department, count]) => ({
      department,
      count,
      percentage: Math.round((count / employees.length) * 100)
    }));
  },

  getAttendanceOverview: async () => {
    const metrics = await attendanceService.getAttendanceMetrics();
    return {
      presentRate: metrics.total > 0 ? Math.round((metrics.present / metrics.total) * 100) : 0,
      lateRate: metrics.total > 0 ? Math.round((metrics.late / metrics.total) * 100) : 0,
      absentRate: metrics.total > 0 ? Math.round((metrics.absent / metrics.total) * 100) : 0,
      missingCheckoutRate: metrics.total > 0 ? Math.round((metrics.missingCheckout / metrics.total) * 100) : 0
    };
  },

  getPayrollTrends: async () => {
    const payruns = await payrollService.getPayruns();
    return payruns.map((pr) => ({
      period: `${pr.periodMonth} ${pr.periodYear}`,
      gross: pr.grossTotal,
      deductions: pr.deductionTotal,
      net: pr.netTotal,
      status: pr.status
    }));
  },

  exportReport: async (
    type: 'headcount' | 'attendance' | 'payroll' | 'leave',
    format: 'csv' | 'pdf'
  ): Promise<{ success: boolean; filename: string }> => {
    await new Promise((res) => setTimeout(res, 600));
    return {
      success: true,
      filename: `PeoplePay360_${type}_report_${Date.now()}.${format}`
    };
  }
};
