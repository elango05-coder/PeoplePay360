export type UserRole = 
  | 'employee' 
  | 'hr_manager' 
  | 'hr_payroll_user' 
  | 'hr_payroll_manager' 
  | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  employeeId?: string;
  department?: string;
}

export type EmployeeType = 'Full-Time' | 'Part-Time' | 'Contractor' | 'Intern';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Terminated';

export interface Employee {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  joiningDate: string;
  department: string;
  position: string;
  employeeType: EmployeeType;
  status: EmployeeStatus;
  managerName?: string;
  workingSchedule?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  avatarUrl?: string;
}

export type ContractStatus = 'Active' | 'Draft' | 'Expired' | 'Terminated';

export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  contractNumber: string;
  startDate: string;
  endDate?: string;
  wage: number;
  department: string;
  jobPosition: string;
  salaryStructureId: string;
  salaryStructureName: string;
  status: ContractStatus;
  terms?: string;
  createdAt: string;
}

export type AttendanceStatus = 
  | 'Present' 
  | 'Late' 
  | 'Absent' 
  | 'Overtime' 
  | 'Missing Checkout' 
  | 'Corrected';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workedHours: string;
  status: AttendanceStatus;
  notes?: string;
}

export type LeaveType = 
  | 'Annual' 
  | 'Sick' 
  | 'Casual' 
  | 'Maternity/Paternity' 
  | 'Unpaid';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  allocated: number;
  used: number;
  remaining: number;
}

export type RuleCategory = 'Basic' | 'Allowance' | 'Deduction';
export type ComputationType = 'Fixed' | 'Percentage' | 'Formula';

export interface SalaryRule {
  id: string;
  structureId: string;
  sequence: number;
  name: string;
  code: string;
  category: RuleCategory;
  computationType: ComputationType;
  value: number | string;
  status: 'Active' | 'Inactive';
  description?: string;
}

export interface SalaryStructure {
  id: string;
  name: string;
  description: string;
  ruleCount: number;
  status: 'Active' | 'Draft' | 'Archived';
  rules: SalaryRule[];
  createdAt: string;
}

export type PayrunStatus = 'Draft' | 'Computed' | 'Validated' | 'Paid';

export interface Payrun {
  id: string;
  name: string;
  salaryStructureId: string;
  salaryStructureName: string;
  periodMonth: string;
  periodYear: number;
  startDate: string;
  endDate: string;
  employeeCount: number;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  status: PayrunStatus;
  createdAt: string;
}

export interface PayslipLine {
  name: string;
  category: 'Earning' | 'Deduction';
  amount: number;
  rate?: string;
}

export interface Payslip {
  id: string;
  payrunId: string;
  payrunName: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  position: string;
  period: string;
  joiningDate: string;
  bankAccount: string;
  pan: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrunStatus;
  lines: PayslipLine[];
}

export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  missingCheckoutToday: number;
  pendingLeaves: number;
  currentPayrollTotal: number;
  grossPayroll: number;
  totalDeductions: number;
  netPayroll: number;
  currentPayrunStatus: PayrunStatus;
}
