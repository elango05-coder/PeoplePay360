// ==============================================================================
// PeoplePay360: Payroll Engine Types & Contracts
// ==============================================================================

import { Contract, Employee, Payslip, PayslipLine, SalaryRule, SalaryStructure } from './database.types.js';

export type PayrollErrorCode =
  | 'EMPLOYEE_NOT_FOUND'
  | 'NO_APPLICABLE_CONTRACT'
  | 'NO_SALARY_STRUCTURE'
  | 'NO_SALARY_RULES'
  | 'DUPLICATE_PAYSLIP'
  | 'INSUFFICIENT_LEAVE_BALANCE'
  | 'INVALID_PAYRUN_PERIOD'
  | 'PAYRUN_ALREADY_PAID'
  | 'PAYRUN_VALIDATION_FAILED'
  | 'UNAUTHORIZED';

export type PayrollWarningCode =
  | 'MISSING_BANK_DETAILS'
  | 'MISSING_ATTENDANCE'
  | 'MISSING_CHECKOUT'
  | 'LATE_ATTENDANCE'
  | 'UNPAID_LEAVE_DEDUCTION'
  | 'INACTIVE_EMPLOYEE'
  | 'UNUSUAL_SALARY_VALUE';

export interface CalculationWarning {
  code: PayrollWarningCode | string;
  message: string;
}

export interface CalculationError {
  code: PayrollErrorCode | string;
  message: string;
}

export interface PayrollCalculationInput {
  employeeId: string;
  payrunId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
}

export interface GeneratedPayslipLine {
  salaryRuleId: string | null;
  code: string;
  name: string;
  category: 'basic' | 'allowance' | 'deduction' | 'employer_contribution' | 'other';
  sequence: number;
  amount: number;
}

export interface PayrollCalculationResult {
  success: boolean;
  employee?: Employee;
  contract?: Contract;
  salaryStructure?: SalaryStructure;
  lines: GeneratedPayslipLine[];
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  warnings: CalculationWarning[];
  errors: CalculationError[];
}

export interface PayrunValidationResult {
  isValid: boolean;
  blockingErrors: CalculationError[];
  warnings: CalculationWarning[];
  summary: {
    totalEmployees: number;
    validCount: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface DashboardMetrics {
  total_employees: number;
  active_employees: number;
  pending_leave_requests: number;
  employees_on_leave_today: number;
  attendance_exceptions_today: number;
  pending_payroll_validations: number;
  current_payrun: {
    id: string;
    name: string;
    period_start: string;
    period_end: string;
    status: string;
    payment_date: string;
    total_gross: number;
    total_deductions: number;
    total_net: number;
  } | null;
}
