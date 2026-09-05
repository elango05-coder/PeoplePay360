// ==============================================================================
// PeoplePay360: Supabase Database Schema Types for Frontend
// ==============================================================================

export type UserRole = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

export type EmployeeType = 'full_time' | 'part_time' | 'contractor' | 'intern';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated';

export type SalaryRuleCategory = 'basic' | 'allowance' | 'deduction' | 'employer_contribution' | 'other';
export type ComputationType = 'fixed' | 'percentage' | 'formula';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'overtime' | 'leave';

export type TimeOffStatus = 'pending' | 'approved' | 'refused' | 'cancelled';
export type AllocationStatus = 'active' | 'expired' | 'cancelled';

export type PayrunStatus = 'draft' | 'computed' | 'validated' | 'paid';
export type PayslipStatus = 'draft' | 'validated' | 'paid' | 'sent';
export type PayrunEmployeeStatus = 'pending' | 'computed' | 'validated' | 'error';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  employee_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  joining_date: string;
  department_id: string;
  manager_id: string | null;
  job_position: string;
  employee_type: EmployeeType;
  status: EmployeeStatus;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_ifsc_or_routing: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface WorkingSchedule {
  id: string;
  name: string;
  description: string | null;
  weekly_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  employee_id: string;
  contract_number: string;
  start_date: string;
  end_date: string | null;
  wage: number;
  department_id: string | null;
  job_position: string;
  salary_structure_id: string;
  working_schedule_id: string | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
  salary_structure?: SalaryStructure | null;
}

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rules?: SalaryRule[];
}

export interface SalaryRule {
  id: string;
  salary_structure_id: string;
  name: string;
  code: string;
  sequence: number;
  category: SalaryRuleCategory;
  computation_type: ComputationType;
  value: number;
  percentage: number;
  formula: string | null;
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeOffType {
  id: string;
  name: string;
  code: string;
  is_paid: boolean;
  default_allocation: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeOffAllocation {
  id: string;
  employee_id: string;
  time_off_type_id: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  start_date: string;
  end_date: string;
  status: AllocationStatus;
  created_at: string;
  updated_at: string;
  time_off_type?: TimeOffType | null;
}

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  time_off_type_id: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string | null;
  status: TimeOffStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
  time_off_type?: TimeOffType | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
  expected_hours: number;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
}

export interface Payrun {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  status: PayrunStatus;
  created_by: string | null;
  computed_at: string | null;
  validated_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  employees?: PayrunEmployee[];
  payslips?: Payslip[];
}

export interface PayrunEmployee {
  id: string;
  payrun_id: string;
  employee_id: string;
  contract_id: string | null;
  salary_structure_id: string | null;
  status: PayrunEmployeeStatus;
  warning_count: number;
  error_count: number;
  validation_messages: any[];
  created_at: string;
  employee?: Employee | null;
}

export interface Payslip {
  id: string;
  payrun_id: string;
  employee_id: string;
  contract_id: string;
  salary_structure_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  total_allowances: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: PayslipStatus;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
  lines?: PayslipLine[];
  payrun?: Payrun | null;
}

export interface PayslipLine {
  id: string;
  payslip_id: string;
  salary_rule_id: string | null;
  code: string;
  name: string;
  category: SalaryRuleCategory;
  sequence: number;
  amount: number;
  created_at: string;
}

export interface DashboardMetrics {
  total_employees: number;
  active_employees: number;
  pending_leave_requests: number;
  employees_on_leave_today: number;
  attendance_exceptions_today: number;
  pending_payroll_validations: number;
  current_payrun?: {
    id: string;
    name: string;
    period_start: string;
    period_end: string;
    status: PayrunStatus;
    payment_date: string;
    total_gross: number;
    total_deductions: number;
    total_net: number;
  } | null;
}
