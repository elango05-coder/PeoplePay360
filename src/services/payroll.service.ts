// ==============================================================================
// PeoplePay360: The Central Payroll Engine
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import {
  Attendance,
  Contract,
  Employee,
  SalaryRule,
  SalaryStructure,
  TimeOffRequest,
} from '../types/database.types.js';
import {
  CalculationError,
  CalculationWarning,
  GeneratedPayslipLine,
  PayrollCalculationInput,
  PayrollCalculationResult,
} from '../types/payroll.types.js';
import { ContractService } from './contract.service.js';

export interface PureCalculationContext {
  employee: Employee;
  contracts: Contract[];
  salaryStructures: Map<string, SalaryStructure>;
  salaryRules: Map<string, SalaryRule[]>;
  attendance: Attendance[];
  approvedTimeOff: (TimeOffRequest & { is_paid?: boolean })[];
  periodStart: string;
  periodEnd: string;
}

export class PayrollService {
  /**
   * PURE DETERMINISTIC PAYROLL CALCULATION ENGINE
   * Implements Steps 1 to 10.
   * Can be executed both in-memory and against database data.
   */
  static calculatePayrollPure(ctx: PureCalculationContext): PayrollCalculationResult {
    const warnings: CalculationWarning[] = [];
    const errors: CalculationError[] = [];
    const lines: GeneratedPayslipLine[] = [];

    // --------------------------------------------------------------------------
    // Step 1: Verify employee
    // --------------------------------------------------------------------------
    if (!ctx.employee) {
      errors.push({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee does not exist.' });
      return this.emptyResult(errors, warnings);
    }

    if (ctx.employee.status !== 'active') {
      warnings.push({
        code: 'INACTIVE_EMPLOYEE',
        message: `Employee is marked as ${ctx.employee.status}.`,
      });
    }

    if (!ctx.employee.bank_account_number) {
      warnings.push({
        code: 'MISSING_BANK_DETAILS',
        message: 'Employee has no bank account details on file.',
      });
    }

    // --------------------------------------------------------------------------
    // Step 2: Find applicable contract for the period
    // CRITICAL: Must select the contract covering the period, NOT just latest!
    // --------------------------------------------------------------------------
    const contract = ContractService.resolveContractFromList(
      ctx.contracts.filter((c) => c.employee_id === ctx.employee.id),
      ctx.periodStart,
      ctx.periodEnd
    );

    if (!contract) {
      errors.push({
        code: 'NO_APPLICABLE_CONTRACT',
        message: `No active contract found applicable for period ${ctx.periodStart} to ${ctx.periodEnd}.`,
      });
      return this.emptyResult(errors, warnings);
    }

    // --------------------------------------------------------------------------
    // Step 3: Find assigned salary structure
    // --------------------------------------------------------------------------
    const salaryStructure = ctx.salaryStructures.get(contract.salary_structure_id);
    if (!salaryStructure || !salaryStructure.is_active) {
      errors.push({
        code: 'NO_SALARY_STRUCTURE',
        message: `Assigned salary structure (${contract.salary_structure_id}) is missing or inactive.`,
      });
      return this.emptyResult(errors, warnings, ctx.employee, contract);
    }

    // --------------------------------------------------------------------------
    // Step 4: Get salary rules ordered by sequence ASC
    // --------------------------------------------------------------------------
    const rawRules = ctx.salaryRules.get(salaryStructure.id) || [];
    const rules = [...rawRules]
      .filter((r) => r.is_active)
      .sort((a, b) => a.sequence - b.sequence);

    if (rules.length === 0) {
      errors.push({
        code: 'NO_SALARY_RULES',
        message: `Salary structure "${salaryStructure.name}" has no active salary rules.`,
      });
      return this.emptyResult(errors, warnings, ctx.employee, contract, salaryStructure);
    }

    // --------------------------------------------------------------------------
    // Step 5: Process Attendance & Exceptions
    // --------------------------------------------------------------------------
    const periodAttendance = ctx.attendance.filter(
      (a) =>
        a.employee_id === ctx.employee.id &&
        a.attendance_date >= ctx.periodStart &&
        a.attendance_date <= ctx.periodEnd
    );

    let lateCount = 0;
    let missingCheckoutCount = 0;

    for (const att of periodAttendance) {
      if (att.status === 'late') lateCount++;
      if (att.check_in && !att.check_out) missingCheckoutCount++;
    }

    if (missingCheckoutCount > 0) {
      warnings.push({
        code: 'MISSING_CHECKOUT',
        message: `${missingCheckoutCount} attendance record(s) with missing check-out detected.`,
      });
    }

    if (lateCount > 0) {
      warnings.push({
        code: 'LATE_ATTENDANCE',
        message: `${lateCount} late arrival(s) recorded during this pay period.`,
      });
    }

    // --------------------------------------------------------------------------
    // Step 6: Process Approved Leave (Paid vs Unpaid)
    // --------------------------------------------------------------------------
    const approvedLeaves = ctx.approvedTimeOff.filter(
      (t) =>
        t.employee_id === ctx.employee.id &&
        t.status === 'approved' &&
        t.start_date <= ctx.periodEnd &&
        t.end_date >= ctx.periodStart
    );

    let unpaidLeaveDays = 0;
    for (const req of approvedLeaves) {
      if (req.is_paid === false) {
        unpaidLeaveDays += req.number_of_days;
      }
    }

    // --------------------------------------------------------------------------
    // Step 7: Calculate Components (Basic, Rules, Formulas)
    // --------------------------------------------------------------------------
    const basicSalary = contract.wage;
    let totalAllowances = 0;
    let totalDeductions = 0;

    // Period days for daily pro-rata rate
    const pStart = new Date(ctx.periodStart);
    const pEnd = new Date(ctx.periodEnd);
    const daysInPeriod = Math.max(
      1,
      Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const dailyRate = Number((basicSalary / daysInPeriod).toFixed(2));

    // Base Basic Salary Line
    lines.push({
      salaryRuleId: null,
      code: 'BASIC',
      name: 'Basic Salary',
      category: 'basic',
      sequence: 1,
      amount: basicSalary,
    });

    // Execute Rules in Sequence ASC
    for (const rule of rules) {
      let amount = 0;

      if (rule.computation_type === 'fixed') {
        amount = Number(rule.value || 0);
      } else if (rule.computation_type === 'percentage') {
        // Percentage of basic salary
        amount = Number(((basicSalary * (rule.percentage || 0)) / 100).toFixed(2));
      } else if (rule.computation_type === 'formula') {
        amount = this.evaluateFormula(rule.formula, basicSalary, rule.value);
      }

      if (rule.category === 'allowance') {
        totalAllowances += amount;
      } else if (rule.category === 'deduction') {
        totalDeductions += amount;
      }

      lines.push({
        salaryRuleId: rule.id,
        code: rule.code,
        name: rule.name,
        category: rule.category,
        sequence: rule.sequence,
        amount,
      });
    }

    // Apply Unpaid Leave Deduction if any
    if (unpaidLeaveDays > 0) {
      const unpaidDeduction = Number((unpaidLeaveDays * dailyRate).toFixed(2));
      totalDeductions += unpaidDeduction;

      lines.push({
        salaryRuleId: null,
        code: 'UNPAID_LEAVE',
        name: `Unpaid Leave Deduction (${unpaidLeaveDays} days)`,
        category: 'deduction',
        sequence: 95,
        amount: unpaidDeduction,
      });

      warnings.push({
        code: 'UNPAID_LEAVE_DEDUCTION',
        message: `${unpaidLeaveDays} day(s) of unpaid leave deducted (₹${unpaidDeduction}).`,
      });
    }

    // --------------------------------------------------------------------------
    // Step 8: Calculate Totals (Gross & Net)
    // --------------------------------------------------------------------------
    const grossSalary = Number((basicSalary + totalAllowances).toFixed(2));
    const netSalary = Number((grossSalary - totalDeductions).toFixed(2));

    if (netSalary < 0) {
      warnings.push({
        code: 'UNUSUAL_SALARY_VALUE',
        message: `Net salary calculated to a negative amount (₹${netSalary}). Review deductions.`,
      });
    }

    // --------------------------------------------------------------------------
    // Step 10: Return Result
    // --------------------------------------------------------------------------
    return {
      success: errors.length === 0,
      employee: ctx.employee,
      contract,
      salaryStructure,
      lines,
      basicSalary,
      totalAllowances: Number(totalAllowances.toFixed(2)),
      grossSalary,
      totalDeductions: Number(totalDeductions.toFixed(2)),
      netSalary,
      warnings,
      errors,
    };
  }

  /**
   * Helper: evaluate standardized payroll formulas
   */
  private static evaluateFormula(formula: string | null, basic: number, fallbackValue = 0): number {
    if (!formula) return fallbackValue;
    const clean = formula.replace(/\s+/g, '').toUpperCase();

    if (clean === 'BASIC*0.40' || clean === 'BASIC*0.4') {
      return Number((basic * 0.4).toFixed(2));
    }
    if (clean === 'BASIC*0.50' || clean === 'BASIC*0.5') {
      return Number((basic * 0.5).toFixed(2));
    }
    if (clean === 'BASIC*0.12') {
      return Number((basic * 0.12).toFixed(2));
    }
    if (clean === 'BASIC*0.10' || clean === 'BASIC*0.1') {
      return Number((basic * 0.1).toFixed(2));
    }

    return fallbackValue;
  }

  private static emptyResult(
    errors: CalculationError[],
    warnings: CalculationWarning[],
    employee?: Employee,
    contract?: Contract,
    salaryStructure?: SalaryStructure
  ): PayrollCalculationResult {
    return {
      success: false,
      employee,
      contract,
      salaryStructure,
      lines: [],
      basicSalary: 0,
      totalAllowances: 0,
      grossSalary: 0,
      totalDeductions: 0,
      netSalary: 0,
      warnings,
      errors,
    };
  }

  /**
   * Database-backed calculation for a single employee in a payrun
   */
  static async computeEmployeePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    // 1. Try DB RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('compute_employee_payroll', {
        p_payrun_id: input.payrunId,
        p_employee_id: input.employeeId,
        p_period_start: input.periodStart,
        p_period_end: input.periodEnd,
      });

      if (!rpcErr && rpcRes) {
        return {
          success: rpcRes.success,
          basicSalary: rpcRes.basic_salary ?? 0,
          totalAllowances: (rpcRes.gross_salary ?? 0) - (rpcRes.basic_salary ?? 0),
          grossSalary: rpcRes.gross_salary ?? 0,
          totalDeductions: rpcRes.deductions ?? 0,
          netSalary: rpcRes.net_salary ?? 0,
          lines: [],
          warnings: rpcRes.warnings || [],
          errors: rpcRes.errors || [],
        };
      }
    } catch {
      // Fall through to query-driven computation
    }

    // 2. Fetch context from Supabase tables
    const [empRes, contractRes, structureRes, attendanceRes, leaveRes] = await Promise.all([
      supabase.from('employees').select('*').eq('id', input.employeeId).single(),
      ContractService.getApplicableContract(input.employeeId, input.periodStart, input.periodEnd),
      supabase.from('salary_structures').select('*, rules:salary_rules(*)'),
      supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', input.employeeId)
        .gte('attendance_date', input.periodStart)
        .lte('attendance_date', input.periodEnd),
      supabase
        .from('time_off_requests')
        .select('*, time_off_type:time_off_types(*)')
        .eq('employee_id', input.employeeId)
        .eq('status', 'approved'),
    ]);

    const structuresMap = new Map<string, SalaryStructure>();
    const rulesMap = new Map<string, SalaryRule[]>();

    if (structureRes.data) {
      for (const st of structureRes.data) {
        structuresMap.set(st.id, st);
        rulesMap.set(st.id, st.rules || []);
      }
    }

    const approvedLeaves = (leaveRes.data || []).map((l: any) => ({
      ...l,
      is_paid: l.time_off_type?.is_paid ?? true,
    }));

    const result = this.calculatePayrollPure({
      employee: empRes.data as Employee,
      contracts: contractRes.data ? [contractRes.data] : [],
      salaryStructures: structuresMap,
      salaryRules: rulesMap,
      attendance: (attendanceRes.data as Attendance[]) || [],
      approvedTimeOff: approvedLeaves,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    // If calculation succeeded, persist draft payslip
    if (result.success && result.contract && result.salaryStructure) {
      await this.persistPayslip(input.payrunId, input.employeeId, result, input.periodStart, input.periodEnd);
    }

    return result;
  }

  /**
   * Persist payslip and lines to database
   */
  private static async persistPayslip(
    payrunId: string,
    employeeId: string,
    result: PayrollCalculationResult,
    periodStart: string,
    periodEnd: string
  ): Promise<void> {
    // Delete existing payslip for this run and employee
    await supabase.from('payslips').delete().eq('payrun_id', payrunId).eq('employee_id', employeeId);

    const { data: payslip } = await supabase
      .from('payslips')
      .insert({
        payrun_id: payrunId,
        employee_id: employeeId,
        contract_id: result.contract!.id,
        salary_structure_id: result.salaryStructure!.id,
        period_start: periodStart,
        period_end: periodEnd,
        basic_salary: result.basicSalary,
        total_allowances: result.totalAllowances,
        gross_salary: result.grossSalary,
        total_deductions: result.totalDeductions,
        net_salary: result.netSalary,
        status: 'draft',
      })
      .select()
      .single();

    if (payslip && result.lines.length > 0) {
      const linesPayload = result.lines.map((l) => ({
        payslip_id: payslip.id,
        salary_rule_id: l.salaryRuleId,
        code: l.code,
        name: l.name,
        category: l.category,
        sequence: l.sequence,
        amount: l.amount,
      }));

      await supabase.from('payslip_lines').insert(linesPayload);
    }

    // Update payrun_employees junction
    await supabase
      .from('payrun_employees')
      .upsert(
        {
          payrun_id: payrunId,
          employee_id: employeeId,
          contract_id: result.contract?.id,
          salary_structure_id: result.salaryStructure?.id,
          status: result.success ? 'computed' : 'error',
          warning_count: result.warnings.length,
          error_count: result.errors.length,
          validation_messages: [...result.errors, ...result.warnings],
        },
        { onConflict: 'payrun_id,employee_id' }
      );
  }
}
