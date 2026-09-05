// ==============================================================================
// PeoplePay360: Payrun & Payslip Management Service
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import { Payrun, PayrunEmployee, Payslip, PayslipLine } from '../types/database.types.js';
import { PayrunValidationResult } from '../types/payroll.types.js';
import { PayrollService } from './payroll.service.js';

export interface CreatePayrunInput {
  name: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  payment_date: string; // YYYY-MM-DD
  created_by?: string | null;
  employee_ids?: string[];
}

export class PayrunService {
  /**
   * Fetch all payruns
   */
  static async getPayruns(): Promise<{ data: Payrun[] | null; error: any }> {
    const { data, error } = await supabase
      .from('payruns')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }

  /**
   * Fetch single payrun with employee entries
   */
  static async getPayrunById(id: string): Promise<{ data: (Payrun & { employees: PayrunEmployee[]; payslips: Payslip[] }) | null; error: any }> {
    const { data, error } = await supabase
      .from('payruns')
      .select('*, employees:payrun_employees(*, employee:employees(*)), payslips(*)')
      .eq('id', id)
      .single();
    return { data, error };
  }

  /**
   * Step 1: Create Payrun and attach selected employees
   */
  static async createPayrun(input: CreatePayrunInput): Promise<{ data: Payrun | null; error: any }> {
    const { data: payrun, error } = await supabase
      .from('payruns')
      .insert({
        name: input.name,
        period_start: input.period_start,
        period_end: input.period_end,
        payment_date: input.payment_date,
        created_by: input.created_by,
        status: 'draft',
      })
      .select()
      .single();

    if (error || !payrun) {
      return { data: null, error };
    }

    // Attach employees
    if (input.employee_ids && input.employee_ids.length > 0) {
      const records = input.employee_ids.map((empId) => ({
        payrun_id: payrun.id,
        employee_id: empId,
        status: 'pending',
      }));

      await supabase.from('payrun_employees').insert(records);
    } else {
      // If no specific employees given, default to all active employees
      const { data: activeEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active');

      if (activeEmployees && activeEmployees.length > 0) {
        const records = activeEmployees.map((emp) => ({
          payrun_id: payrun.id,
          employee_id: emp.id,
          status: 'pending',
        }));
        await supabase.from('payrun_employees').insert(records);
      }
    }

    return { data: payrun, error: null };
  }

  /**
   * Step 2: Compute Payrun
   * Executes payroll calculations for every attached employee
   */
  static async computePayrun(payrunId: string): Promise<{ success: boolean; computedCount: number; error?: any }> {
    // 1. Try DB RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('compute_payrun', {
        p_payrun_id: payrunId,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { success: true, computedCount: rpcRes.computed_count };
      }
    } catch {
      // Fall through to client compute
    }

    // 2. Fetch payrun details
    const { data: payrun, error: fetchErr } = await supabase
      .from('payruns')
      .select('*')
      .eq('id', payrunId)
      .single();

    if (fetchErr || !payrun) {
      return { success: false, computedCount: 0, error: 'Payrun not found' };
    }

    if (payrun.status === 'paid') {
      return { success: false, computedCount: 0, error: 'Paid payruns cannot be recomputed' };
    }

    // Fetch payrun employees
    const { data: payrunEmps } = await supabase
      .from('payrun_employees')
      .select('employee_id')
      .eq('payrun_id', payrunId);

    let computedCount = 0;
    if (payrunEmps) {
      for (const entry of payrunEmps) {
        await PayrollService.computeEmployeePayroll({
          payrunId,
          employeeId: entry.employee_id,
          periodStart: payrun.period_start,
          periodEnd: payrun.period_end,
        });
        computedCount++;
      }
    }

    // Update payrun status to 'computed'
    await supabase
      .from('payruns')
      .update({
        status: 'computed',
        computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payrunId);

    return { success: true, computedCount };
  }

  /**
   * Step 3: Validate Payrun
   * Distinguishes Blocking Errors vs Non-blocking Warnings
   */
  static async validatePayrun(payrunId: string): Promise<PayrunValidationResult> {
    // 1. Try DB RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('validate_payrun', {
        p_payrun_id: payrunId,
      });

      if (!rpcErr && rpcRes) {
        return {
          isValid: rpcRes.success,
          blockingErrors: rpcRes.success ? [] : [{ code: rpcRes.error || 'PAYRUN_VALIDATION_FAILED', message: rpcRes.message || 'Validation failed' }],
          warnings: [],
          summary: {
            totalEmployees: 0,
            validCount: 0,
            errorCount: rpcRes.error_count ?? 0,
            warningCount: rpcRes.warning_count ?? 0,
          },
        };
      }
    } catch {
      // Fall through
    }

    // 2. Fetch employee calculation statuses
    const { data: payrunEmps } = await supabase
      .from('payrun_employees')
      .select('*')
      .eq('payrun_id', payrunId);

    const total = payrunEmps?.length || 0;
    let errorCount = 0;
    let warningCount = 0;
    const blockingErrors: any[] = [];
    const warnings: any[] = [];

    if (payrunEmps) {
      for (const emp of payrunEmps) {
        errorCount += emp.error_count || 0;
        warningCount += emp.warning_count || 0;

        const msgs = (emp.validation_messages as any[]) || [];
        for (const m of msgs) {
          if (m.code?.includes('NO_') || m.code?.includes('NOT_FOUND') || m.code?.includes('ERROR')) {
            blockingErrors.push(m);
          } else {
            warnings.push(m);
          }
        }
      }
    }

    const isValid = errorCount === 0;

    if (isValid) {
      // Update payrun to validated
      await supabase
        .from('payruns')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payrunId);

      // Update payslips to validated
      await supabase
        .from('payslips')
        .update({
          status: 'validated',
          updated_at: new Date().toISOString(),
        })
        .eq('payrun_id', payrunId);
    }

    return {
      isValid,
      blockingErrors,
      warnings,
      summary: {
        totalEmployees: total,
        validCount: total - errorCount,
        errorCount,
        warningCount,
      },
    };
  }

  /**
   * Step 4: Mark Payrun Paid
   */
  static async markPayrunPaid(payrunId: string): Promise<{ success: boolean; error?: any }> {
    // 1. Try DB RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('mark_payrun_paid', {
        p_payrun_id: payrunId,
      });

      if (!rpcErr && rpcRes?.success) {
        return { success: true };
      }
    } catch {
      // Fall through
    }

    const { data: payrun } = await supabase
      .from('payruns')
      .select('status')
      .eq('id', payrunId)
      .single();

    if (!payrun || payrun.status !== 'validated') {
      return { success: false, error: 'Payrun must be in validated status before marking as paid.' };
    }

    await supabase
      .from('payruns')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payrunId);

    await supabase
      .from('payslips')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('payrun_id', payrunId);

    return { success: true };
  }

  // ----------------------------------------------------------------------------
  // Payslips Queries
  // ----------------------------------------------------------------------------
  static async getPayslips(filter?: { payrunId?: string; employeeId?: string }): Promise<{ data: Payslip[] | null; error: any }> {
    let query = supabase.from('payslips').select('*, employee:employees(*), contract:contracts(*)');

    if (filter?.payrunId) query = query.eq('payrun_id', filter.payrunId);
    if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  }

  static async getPayslipById(id: string): Promise<{ data: (Payslip & { lines: PayslipLine[]; employee: any; contract: any }) | null; error: any }> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*, lines:payslip_lines(*), employee:employees(*), contract:contracts(*), salary_structure:salary_structures(*)')
      .eq('id', id)
      .single();

    if (data?.lines) {
      data.lines.sort((a: PayslipLine, b: PayslipLine) => a.sequence - b.sequence);
    }

    return { data, error };
  }
}
