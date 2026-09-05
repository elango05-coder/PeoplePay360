// ==============================================================================
// PeoplePay360: Dashboard Aggregation Service
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import { DashboardMetrics } from '../types/payroll.types.js';

export class DashboardService {
  /**
   * Fetch aggregated dashboard KPIs and metrics
   */
  static async getMetrics(): Promise<{ data: DashboardMetrics | null; error: any }> {
    // 1. Try DB RPC first
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_dashboard_metrics');
      if (!rpcErr && rpcData) {
        return { data: rpcData as DashboardMetrics, error: null };
      }
    } catch {
      // Fall through to client queries
    }

    // 2. Fetch via individual table counts
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        totalEmpRes,
        activeEmpRes,
        pendingLeaveRes,
        leaveTodayRes,
        exceptionsRes,
        pendingValidationRes,
        latestPayrunRes,
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('time_off_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('time_off_requests')
          .select('employee_id')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today),
        supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_date', today)
          .in('status', ['late', 'absent']),
        supabase.from('payruns').select('*', { count: 'exact', head: true }).eq('status', 'computed'),
        supabase.from('payruns').select('*, payslips(*)').order('created_at', { ascending: false }).limit(1),
      ]);

      const latestPayrun = latestPayrunRes.data && latestPayrunRes.data.length > 0 ? latestPayrunRes.data[0] : null;

      let currentPayrunData = null;
      if (latestPayrun) {
        const payslips = latestPayrun.payslips || [];
        const totalGross = payslips.reduce((acc: number, p: any) => acc + Number(p.gross_salary || 0), 0);
        const totalDeductions = payslips.reduce((acc: number, p: any) => acc + Number(p.total_deductions || 0), 0);
        const totalNet = payslips.reduce((acc: number, p: any) => acc + Number(p.net_salary || 0), 0);

        currentPayrunData = {
          id: latestPayrun.id,
          name: latestPayrun.name,
          period_start: latestPayrun.period_start,
          period_end: latestPayrun.period_end,
          status: latestPayrun.status,
          payment_date: latestPayrun.payment_date,
          total_gross: Number(totalGross.toFixed(2)),
          total_deductions: Number(totalDeductions.toFixed(2)),
          total_net: Number(totalNet.toFixed(2)),
        };
      }

      const metrics: DashboardMetrics = {
        total_employees: totalEmpRes.count ?? 0,
        active_employees: activeEmpRes.count ?? 0,
        pending_leave_requests: pendingLeaveRes.count ?? 0,
        employees_on_leave_today: leaveTodayRes.data?.length ?? 0,
        attendance_exceptions_today: exceptionsRes.count ?? 0,
        pending_payroll_validations: pendingValidationRes.count ?? 0,
        current_payrun: currentPayrunData,
      };

      return { data: metrics, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}
