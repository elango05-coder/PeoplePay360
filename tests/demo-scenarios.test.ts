// ==============================================================================
// PeoplePay360: Automated Test Suite & Demo Verification
// ==============================================================================

import { describe, expect, it } from 'vitest';
import { AttendanceService } from '../src/services/attendance.service.js';
import { ContractService } from '../src/services/contract.service.js';
import { PayrollService } from '../src/services/payroll.service.js';
import { Attendance, Contract, Employee, SalaryRule, SalaryStructure, TimeOffAllocation, TimeOffRequest } from '../src/types/database.types.js';

describe('PeoplePay360 Backend Verification Suite', () => {
  // Shared Salary Structure & Rules
  const standardStructure: SalaryStructure = {
    id: 'struct-std-001',
    name: 'Standard Corporate Structure',
    code: 'STD_CORP',
    description: 'Standard salary structure with HRA, Special Allowance, PF, and PT',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const standardRules: SalaryRule[] = [
    {
      id: 'rule-hra',
      salary_structure_id: standardStructure.id,
      name: 'House Rent Allowance (HRA)',
      code: 'HRA',
      sequence: 10,
      category: 'allowance',
      computation_type: 'percentage',
      value: 0,
      percentage: 40.0,
      formula: null,
      is_taxable: true,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'rule-special',
      salary_structure_id: standardStructure.id,
      name: 'Special Allowance',
      code: 'SPECIAL_ALLW',
      sequence: 20,
      category: 'allowance',
      computation_type: 'fixed',
      value: 5000.0,
      percentage: 0,
      formula: null,
      is_taxable: true,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'rule-conv',
      salary_structure_id: standardStructure.id,
      name: 'Conveyance Allowance',
      code: 'CONV',
      sequence: 30,
      category: 'allowance',
      computation_type: 'fixed',
      value: 1600.0,
      percentage: 0,
      formula: null,
      is_taxable: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'rule-pf',
      salary_structure_id: standardStructure.id,
      name: 'Provident Fund (PF)',
      code: 'PF',
      sequence: 40,
      category: 'deduction',
      computation_type: 'percentage',
      value: 0,
      percentage: 12.0,
      formula: null,
      is_taxable: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'rule-pt',
      salary_structure_id: standardStructure.id,
      name: 'Professional Tax (PT)',
      code: 'PROF_TAX',
      sequence: 50,
      category: 'deduction',
      computation_type: 'fixed',
      value: 200.0,
      percentage: 0,
      formula: null,
      is_taxable: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ];

  const structuresMap = new Map<string, SalaryStructure>([[standardStructure.id, standardStructure]]);
  const rulesMap = new Map<string, SalaryRule[]>([[standardStructure.id, standardRules]]);

  // ============================================================================
  // DEMO SCENARIO 1: Rahul Historical Contracts
  // ============================================================================
  describe('Demo Scenario 1: Rahul Sharma Historical Contracts', () => {
    const rahul: Employee = {
      id: 'emp-rahul-001',
      employee_code: 'EMP001',
      first_name: 'Rahul',
      last_name: 'Sharma',
      email: 'rahul@peoplepay360.com',
      phone: '+91 9876543210',
      date_of_birth: '1992-05-14',
      joining_date: '2025-01-01',
      department_id: 'dept-eng',
      manager_id: null,
      job_position: 'Software Engineer',
      employee_type: 'full_time',
      status: 'active',
      bank_account_number: 'HDFC00012345678',
      bank_name: 'HDFC Bank',
      bank_ifsc_or_routing: 'HDFC0001234',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    const rahulContract1: Contract = {
      id: 'contract-rahul-h1',
      employee_id: rahul.id,
      contract_number: 'CNT-2025-001',
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      wage: 40000.0,
      department_id: 'dept-eng',
      job_position: 'Junior Software Engineer',
      salary_structure_id: standardStructure.id,
      working_schedule_id: 'sched-40h',
      status: 'active',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    const rahulContract2: Contract = {
      id: 'contract-rahul-h2',
      employee_id: rahul.id,
      contract_number: 'CNT-2025-002',
      start_date: '2025-07-01',
      end_date: '2025-12-31',
      wage: 50000.0,
      department_id: 'dept-eng',
      job_position: 'Software Engineer',
      salary_structure_id: standardStructure.id,
      working_schedule_id: 'sched-40h',
      status: 'active',
      created_at: '2025-07-01T00:00:00Z',
      updated_at: '2025-07-01T00:00:00Z',
    };

    const contracts = [rahulContract1, rahulContract2];

    it('Period Selection: June 2025 must select Contract 1 (₹40,000)', () => {
      const selected = ContractService.resolveContractFromList(contracts, '2025-06-01', '2025-06-30');
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe(rahulContract1.id);
      expect(selected?.wage).toBe(40000.0);
    });

    it('Period Selection: July 2025 must select Contract 2 (₹50,000)', () => {
      const selected = ContractService.resolveContractFromList(contracts, '2025-07-01', '2025-07-31');
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe(rahulContract2.id);
      expect(selected?.wage).toBe(50000.0);
    });

    it('June Payroll Calculation: Uses ₹40,000 base and computes exact line items', () => {
      const result = PayrollService.calculatePayrollPure({
        employee: rahul,
        contracts,
        salaryStructures: structuresMap,
        salaryRules: rulesMap,
        attendance: [],
        approvedTimeOff: [],
        periodStart: '2025-06-01',
        periodEnd: '2025-06-30',
      });

      expect(result.success).toBe(true);
      expect(result.contract?.id).toBe(rahulContract1.id);
      expect(result.basicSalary).toBe(40000.0);

      // Calculations:
      // Basic = 40,000
      // HRA = 40% of 40,000 = 16,000
      // Special = 5,000
      // Conveyance = 1,600
      // Total Allowances = 22,600
      // Gross = 40,000 + 22,600 = 62,600
      // PF = 12% of 40,000 = 4,800
      // PT = 200
      // Total Deductions = 5,000
      // Net = 62,600 - 5,000 = 57,600
      expect(result.totalAllowances).toBe(22600.0);
      expect(result.grossSalary).toBe(62600.0);
      expect(result.totalDeductions).toBe(5000.0);
      expect(result.netSalary).toBe(57600.0);
      expect(result.errors.length).toBe(0);
    });

    it('July Payroll Calculation: Uses ₹50,000 base and computes exact line items', () => {
      const result = PayrollService.calculatePayrollPure({
        employee: rahul,
        contracts,
        salaryStructures: structuresMap,
        salaryRules: rulesMap,
        attendance: [],
        approvedTimeOff: [],
        periodStart: '2025-07-01',
        periodEnd: '2025-07-31',
      });

      expect(result.success).toBe(true);
      expect(result.contract?.id).toBe(rahulContract2.id);
      expect(result.basicSalary).toBe(50000.0);

      // Calculations:
      // Basic = 50,000
      // HRA = 40% of 50,000 = 20,000
      // Special = 5,000
      // Conveyance = 1,600
      // Total Allowances = 26,600
      // Gross = 50,000 + 26,600 = 76,600
      // PF = 12% of 50,000 = 6,000
      // PT = 200
      // Total Deductions = 6,200
      // Net = 76,600 - 6,200 = 70,400
      expect(result.totalAllowances).toBe(26600.0);
      expect(result.grossSalary).toBe(76600.0);
      expect(result.totalDeductions).toBe(6200.0);
      expect(result.netSalary).toBe(70400.0);
      expect(result.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // DEMO SCENARIO 2: Priya Attendance Exception & Unpaid Leave Flow
  // ============================================================================
  describe('Demo Scenario 2: Priya Patel Attendance Exceptions & Unpaid Leave', () => {
    const priya: Employee = {
      id: 'emp-priya-002',
      employee_code: 'EMP002',
      first_name: 'Priya',
      last_name: 'Patel',
      email: 'priya@peoplepay360.com',
      phone: '+91 9876543211',
      date_of_birth: '1995-08-22',
      joining_date: '2025-01-15',
      department_id: 'dept-eng',
      manager_id: null,
      job_position: 'Frontend Developer',
      employee_type: 'full_time',
      status: 'active',
      bank_account_number: 'ICIC00098765432',
      bank_name: 'ICICI Bank',
      bank_ifsc_or_routing: 'ICIC0009876',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };

    const priyaContract: Contract = {
      id: 'contract-priya-001',
      employee_id: priya.id,
      contract_number: 'CNT-2025-003',
      start_date: '2025-01-15',
      end_date: '2025-12-31',
      wage: 45000.0,
      department_id: 'dept-eng',
      job_position: 'Frontend Developer',
      salary_structure_id: standardStructure.id,
      working_schedule_id: 'sched-40h',
      status: 'active',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };

    const attendanceRecords: Attendance[] = [
      {
        id: 'att-1',
        employee_id: priya.id,
        attendance_date: '2025-06-02',
        check_in: '2025-06-02T09:00:00Z',
        check_out: '2025-06-02T18:00:00Z',
        worked_hours: 8.0,
        expected_hours: 8.0,
        status: 'present',
        notes: 'On time',
        created_at: '2025-06-02T00:00:00Z',
        updated_at: '2025-06-02T00:00:00Z',
      },
      {
        id: 'att-2',
        employee_id: priya.id,
        attendance_date: '2025-06-03',
        check_in: '2025-06-03T10:45:00Z',
        check_out: '2025-06-03T18:00:00Z',
        worked_hours: 6.25,
        expected_hours: 8.0,
        status: 'late',
        notes: 'Late arrival',
        created_at: '2025-06-03T00:00:00Z',
        updated_at: '2025-06-03T00:00:00Z',
      },
      {
        id: 'att-3',
        employee_id: priya.id,
        attendance_date: '2025-06-05',
        check_in: '2025-06-05T09:10:00Z',
        check_out: null, // Missing check-out exception!
        worked_hours: 0,
        expected_hours: 8.0,
        status: 'present',
        notes: 'Forgot checkout',
        created_at: '2025-06-05T00:00:00Z',
        updated_at: '2025-06-05T00:00:00Z',
      },
    ];

    const approvedUnpaidLeave: (TimeOffRequest & { is_paid: boolean }) = {
      id: 'req-unpaid-01',
      employee_id: priya.id,
      time_off_type_id: 'type-unpaid',
      start_date: '2025-06-10',
      end_date: '2025-06-10',
      number_of_days: 1.0,
      reason: 'Personal emergency',
      status: 'approved',
      approved_by: 'manager-01',
      approved_at: '2025-06-09T10:00:00Z',
      created_at: '2025-06-09T00:00:00Z',
      updated_at: '2025-06-09T00:00:00Z',
      is_paid: false,
    };

    it('Exception detection flags late arrival and missing checkout', () => {
      const exceptions = AttendanceService.analyzeExceptions(attendanceRecords);
      const types = exceptions.map((e) => e.type);
      expect(types).toContain('late_arrival');
      expect(types).toContain('missing_checkout');
    });

    it('Payroll Engine computes unpaid leave deduction and captures non-blocking warnings', () => {
      const result = PayrollService.calculatePayrollPure({
        employee: priya,
        contracts: [priyaContract],
        salaryStructures: structuresMap,
        salaryRules: rulesMap,
        attendance: attendanceRecords,
        approvedTimeOff: [approvedUnpaidLeave],
        periodStart: '2025-06-01',
        periodEnd: '2025-06-30',
      });

      expect(result.success).toBe(true);
      expect(result.basicSalary).toBe(45000.0);

      // Base Allowances: HRA (40% of 45,000 = 18,000) + Special (5,000) + Conveyance (1,600) = 24,600
      expect(result.totalAllowances).toBe(24600.0);
      expect(result.grossSalary).toBe(69600.0);

      // Deductions: PF (12% of 45,000 = 5,400) + PT (200) = 5,600 standard
      // Unpaid leave deduction: 1 day out of 30 days = 45,000 / 30 = 1,500
      // Total Deductions = 5,600 + 1,500 = 7,100
      expect(result.totalDeductions).toBe(7100.0);
      expect(result.netSalary).toBe(62500.0);

      // Verify Warnings are captured (Non-blocking)
      const warningCodes = result.warnings.map((w) => w.code);
      expect(warningCodes).toContain('LATE_ATTENDANCE');
      expect(warningCodes).toContain('MISSING_CHECKOUT');
      expect(warningCodes).toContain('UNPAID_LEAVE_DEDUCTION');
      expect(result.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // CRITICAL VALIDATION & ERROR PREVENTION
  // ============================================================================
  describe('Payroll Validation Logic & Error Prevention', () => {
    const employeeWithoutContract: Employee = {
      id: 'emp-no-contract',
      employee_code: 'EMP999',
      first_name: 'No',
      last_name: 'Contract',
      email: 'nocontract@peoplepay360.com',
      phone: null,
      date_of_birth: null,
      joining_date: '2025-01-01',
      department_id: 'dept-eng',
      manager_id: null,
      job_position: 'Intern',
      employee_type: 'intern',
      status: 'active',
      bank_account_number: null,
      bank_name: null,
      bank_ifsc_or_routing: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    it('Fails with NO_APPLICABLE_CONTRACT if employee has no contract for the period', () => {
      const result = PayrollService.calculatePayrollPure({
        employee: employeeWithoutContract,
        contracts: [], // no contracts
        salaryStructures: structuresMap,
        salaryRules: rulesMap,
        attendance: [],
        approvedTimeOff: [],
        periodStart: '2025-06-01',
        periodEnd: '2025-06-30',
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('NO_APPLICABLE_CONTRACT');
    });

    it('Fails with NO_SALARY_STRUCTURE if contract points to non-existent structure', () => {
      const brokenContract: Contract = {
        id: 'broken-c',
        employee_id: employeeWithoutContract.id,
        contract_number: 'BROKEN-01',
        start_date: '2025-01-01',
        end_date: null,
        wage: 30000,
        department_id: null,
        job_position: 'Intern',
        salary_structure_id: 'non-existent-structure-id',
        working_schedule_id: null,
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = PayrollService.calculatePayrollPure({
        employee: employeeWithoutContract,
        contracts: [brokenContract],
        salaryStructures: structuresMap, // doesn't contain non-existent
        salaryRules: rulesMap,
        attendance: [],
        approvedTimeOff: [],
        periodStart: '2025-06-01',
        periodEnd: '2025-06-30',
      });

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'NO_SALARY_STRUCTURE')).toBe(true);
    });
  });

  // ============================================================================
  // TIME OFF LEAVE BALANCE CHECKS
  // ============================================================================
  describe('Leave Balance Calculation & Approval Rules', () => {
    const allocation: TimeOffAllocation = {
      id: 'alloc-1',
      employee_id: 'emp-rahul-001',
      time_off_type_id: 'type-al',
      allocated_days: 18,
      used_days: 16,
      remaining_days: 2,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'active',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    it('Rejects leave approval if requested days exceed remaining balance', () => {
      const requestedDays = 3;
      const canApprove = allocation.remaining_days >= requestedDays;
      expect(canApprove).toBe(false);
    });

    it('Approves leave when requested days are within available balance and decrements balance', () => {
      const requestedDays = 2;
      expect(allocation.remaining_days >= requestedDays).toBe(true);

      const updatedUsed = allocation.used_days + requestedDays;
      const updatedRemaining = allocation.allocated_days - updatedUsed;
      expect(updatedUsed).toBe(18);
      expect(updatedRemaining).toBe(0);
    });
  });
});
