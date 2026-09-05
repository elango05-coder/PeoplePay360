# PeoplePay360 — API & Service Contract

## Overview
Member 2 (Frontend Developer) can consume these backend services directly in React components. All methods are exported from `@/services` or root package index `src/index.ts`.

---

## 1. Employee Service (`EmployeeService`)

### `getEmployees(filter?: { department_id?: string; status?: EmployeeStatus })`
- **Output**: `{ data: Employee[] | null, error: any }`
- **Description**: Lists all employees with their department joined.

### `getEmployeeById(id: string)`
- **Output**: `{ data: Employee | null, error: any }`

### `createEmployee(input: CreateEmployeeInput)`
- **Input**:
  ```ts
  {
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
    joining_date: string; // YYYY-MM-DD
    department_id: string;
    job_position: string;
    phone?: string;
    date_of_birth?: string;
    employee_type?: 'full_time' | 'part_time' | 'contractor' | 'intern';
    bank_account_number?: string;
    bank_name?: string;
    bank_ifsc_or_routing?: string;
  }
  ```
- **Output**: `{ data: Employee | null, error: any }`

### `updateEmployee(id: string, input: Partial<CreateEmployeeInput>)`
- **Output**: `{ data: Employee | null, error: any }`

---

## 2. Contract Service (`ContractService`)

### `getEmployeeContracts(employeeId: string)`
- **Output**: `{ data: Contract[] | null, error: any }`
- **Description**: Returns all historical contracts for the employee ordered by `start_date DESC`.

### `getApplicableContract(employeeId: string, periodStart: string, periodEnd: string)`
- **Output**: `{ data: Contract | null, error: any }`
- **Description**: Resolves the exact contract covering the specified payroll period.

### `createContract(input: CreateContractInput)`
- **Input**:
  ```ts
  {
    employee_id: string;
    contract_number: string;
    start_date: string;
    end_date?: string | null;
    wage: number;
    job_position: string;
    salary_structure_id: string;
    working_schedule_id?: string;
    department_id?: string;
  }
  ```

---

## 3. Attendance Service (`AttendanceService`)

### `clockIn(input: { employee_id: string; attendance_date?: string; expected_hours?: number })`
- **Output**: `{ data: Attendance | null, error: any }`
- **Description**: Records clock-in; automatically tags as `late` if after standard check-in window.

### `clockOut(input: { attendance_id: string; check_out?: string })`
- **Output**: `{ data: Attendance | null, error: any }`
- **Description**: Calculates worked hours with meal break deduction and assigns status (`present`, `half_day`, `overtime`).

### `getEmployeeAttendance(employeeId: string, periodStart: string, periodEnd: string)`
- **Output**: `{ data: Attendance[] | null, error: any }`

### `analyzeExceptions(records: Attendance[])`
- **Output**: `AttendanceException[]`
- **Exceptions detected**: `missing_checkout`, `late_arrival`, `insufficient_hours`, `absent`.

---

## 4. Time Off Service (`TimeOffService`)

### `getTimeOffTypes()`
- **Output**: `{ data: TimeOffType[] | null, error: any }`

### `getEmployeeAllocations(employeeId: string)`
- **Output**: `{ data: TimeOffAllocation[] | null, error: any }`
- **Description**: Returns remaining leave balance per leave type (`allocated_days - used_days`).

### `createRequest(input: CreateTimeOffRequestInput)`
- **Input**: `{ employee_id, time_off_type_id, start_date, end_date, number_of_days, reason }`

### `approveRequest(requestId: string, approvedBy: string)`
- **Output**: `{ success: boolean, error?: string, message?: string }`
- **Atomic validation**: Verifies sufficient remaining balance. Deducts used days automatically upon approval.

---

## 5. Payrun & Payslip Service (`PayrunService`)

### `createPayrun(input: CreatePayrunInput)`
- **Input**: `{ name, period_start, period_end, payment_date, employee_ids?: string[] }`
- **Status**: Created as `draft`.

### `computePayrun(payrunId: string)`
- **Output**: `{ success: boolean, computedCount: number }`
- **Status**: Transitions to `computed`. Generates draft `payslips` and `payslip_lines`.

### `validatePayrun(payrunId: string)`
- **Output**: `PayrunValidationResult`
  ```ts
  {
    isValid: boolean;
    blockingErrors: CalculationError[];
    warnings: CalculationWarning[];
    summary: { totalEmployees: number; validCount: number; errorCount: number; warningCount: number; }
  }
  ```
- **Rule**: If hard errors exist (`error_count > 0`), validation is blocked. If only warnings, transitions to `validated`.

### `markPayrunPaid(payrunId: string)`
- **Output**: `{ success: boolean, error?: any }`
- **Status**: Transitions payrun and payslips to `paid`.

### `getPayslips(filter?: { payrunId?: string; employeeId?: string })`
- **Output**: `{ data: Payslip[] | null, error: any }`

### `getPayslipById(id: string)`
- **Output**: `{ data: (Payslip & { lines: PayslipLine[] }) | null, error: any }`

---

## 6. Dashboard Service (`DashboardService`)

### `getMetrics()`
- **Output**: `{ data: DashboardMetrics | null, error: any }`
- **Fields**:
  - `total_employees`: number
  - `active_employees`: number
  - `pending_leave_requests`: number
  - `employees_on_leave_today`: number
  - `attendance_exceptions_today`: number
  - `pending_payroll_validations`: number
  - `current_payrun`: `{ id, name, period_start, period_end, status, payment_date, total_gross, total_deductions, total_net } | null`
