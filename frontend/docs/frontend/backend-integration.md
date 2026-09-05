# Backend Integration Contract: Member 1 & Member 2

This document specifies the exact data expectations and interface contracts designed by **Member 2 (Frontend)** for **Member 1 (Backend / Supabase)**.

---

## 1. Overview of Backend Contract Boundary

```text
React Components & Pages
          ↓
   src/services/*        <-- SINGLE INTEGRATION POINT FOR MEMBER 1
          ↓
   Supabase Client (@supabase/supabase-js)
          ↓
   PostgreSQL / RLS / RPCs / Auth
```

Member 1 does **not** need to touch React components. Member 1 only needs to connect the async functions inside `src/services/*` to real Supabase tables or RPC calls.

---

## 2. Expected Database Tables & Schemas

### 1. `employees`
Required fields:
- `id`: `uuid` (Primary Key)
- `code`: `text` (Unique, e.g. 'EMP-1001')
- `first_name`: `text`
- `last_name`: `text`
- `email`: `text` (Unique)
- `phone`: `text`
- `dob`: `date`
- `joining_date`: `date`
- `department`: `text`
- `position`: `text`
- `employee_type`: `'Full-Time' | 'Part-Time' | 'Contractor' | 'Intern'`
- `status`: `'Active' | 'On Leave' | 'Terminated'`
- `manager_name`: `text` (optional)
- `working_schedule`: `text` (optional)
- `bank_name`: `text` (optional)
- `account_number`: `text` (optional)
- `ifsc_code`: `text` (optional)
- `pan_number`: `text` (optional)
- `avatar_url`: `text` (optional)

### 2. `contracts`
An employee may have multiple contracts representing their career and wage history.
- `id`: `uuid` (Primary Key)
- `employee_id`: `uuid` (Foreign Key &rarr; `employees.id`)
- `contract_number`: `text` (Unique, e.g. 'CTR-2024-089')
- `start_date`: `date`
- `end_date`: `date` (nullable for permanent contracts)
- `wage`: `numeric` (Monthly gross wage in INR ₹)
- `department`: `text`
- `job_position`: `text`
- `salary_structure_id`: `uuid` (Foreign Key &rarr; `salary_structures.id`)
- `status`: `'Active' | 'Draft' | 'Expired' | 'Terminated'`
- `terms`: `text` (optional)
- `created_at`: `timestamp with time zone`

### 3. `attendance_records`
- `id`: `uuid` (Primary Key)
- `employee_id`: `uuid` (Foreign Key &rarr; `employees.id`)
- `date`: `date`
- `check_in`: `text` / `time` (e.g. '09:02 AM')
- `check_out`: `text` / `time` (e.g. '06:15 PM')
- `worked_hours`: `text` / `numeric` (e.g. '9.2 hrs')
- `status`: `'Present' | 'Late' | 'Absent' | 'Overtime' | 'Missing Checkout' | 'Corrected'`
- `notes`: `text` (optional, stores biometric regularization justifications)

### 4. `time_off_requests` & `leave_balances`
- `id`: `uuid` (Primary Key)
- `employee_id`: `uuid` (Foreign Key &rarr; `employees.id`)
- `leave_type`: `'Annual' | 'Sick' | 'Casual' | 'Maternity/Paternity' | 'Unpaid'`
- `start_date`: `date`
- `end_date`: `date`
- `duration`: `numeric` (number of days)
- `reason`: `text`
- `status`: `'Pending' | 'Approved' | 'Rejected'`
- `applied_date`: `date`
- `reviewed_by`: `text` (optional)
- `reviewed_date`: `date` (optional)

### 5. `salary_structures` & `salary_rules`
Hierarchical salary structures and sequence-based rules:
- `salary_structures`:
  - `id`: `uuid` (Primary Key)
  - `name`: `text`
  - `description`: `text`
  - `status`: `'Active' | 'Draft' | 'Archived'`
- `salary_rules`:
  - `id`: `uuid` (Primary Key)
  - `structure_id`: `uuid` (Foreign Key &rarr; `salary_structures.id`)
  - `sequence`: `integer` (1, 2, 3... defines computation order)
  - `name`: `text` (e.g. 'House Rent Allowance (HRA)')
  - `code`: `text` (e.g. 'HRA')
  - `category`: `'Basic' | 'Allowance' | 'Deduction'`
  - `computation_type`: `'Fixed' | 'Percentage' | 'Formula'`
  - `value`: `text` / `numeric` (e.g. '40% of Basic', 3000, or formula expression)
  - `status`: `'Active' | 'Inactive'`

### 6. `payruns`
- `id`: `uuid` (Primary Key)
- `name`: `text` (e.g. 'August 2026 Regular Payrun')
- `salary_structure_id`: `uuid` (Foreign Key &rarr; `salary_structures.id`)
- `period_month`: `text`
- `period_year`: `integer`
- `start_date`: `date`
- `end_date`: `date`
- `employee_count`: `integer`
- `gross_total`: `numeric`
- `deduction_total`: `numeric`
- `net_total`: `numeric`
- `status`: `'Draft' | 'Computed' | 'Validated' | 'Paid'`
- `created_at`: `timestamp with time zone`

### 7. `payslips` & `payslip_lines`
- `payslips`:
  - `id`: `uuid` (Primary Key)
  - `payrun_id`: `uuid` (Foreign Key &rarr; `payruns.id`)
  - `employee_id`: `uuid` (Foreign Key &rarr; `employees.id`)
  - `gross_salary`: `numeric`
  - `total_deductions`: `numeric`
  - `net_salary`: `numeric`
  - `status`: `'Draft' | 'Computed' | 'Validated' | 'Paid'`
- `payslip_lines`:
  - `payslip_id`: `uuid` (Foreign Key &rarr; `payslips.id`)
  - `name`: `text` (e.g. 'Basic Salary', 'PF')
  - `category`: `'Earning' | 'Deduction'`
  - `amount`: `numeric`
  - `rate`: `text` (optional description)

---

## 3. Expected Backend Endpoints / Edge Functions (When Ready)

Member 2 has created service placeholder hooks that Member 1 can implement:

1. **`payrollService.triggerDownloadPayslipPdf(payslipId)`**:
   - Expects Member 1's backend or Edge Function to generate the official signed PDF document and return a download URL or file blob.
2. **`payrollService.triggerEmailPayslip(payslipId, recipientEmail)`**:
   - Expects Member 1's backend to dispatch the payslip voucher via transactional email (e.g. Resend / SendGrid / SMTP).

---

## 4. Frontend Assumptions
1. Frontend currency is Indian Rupee (INR ₹), formatted with Indian numbering system (`en-IN`).
2. Authentication uses standard Supabase Auth sessions. The user object's metadata or `profiles` table maps to role (`employee`, `hr_manager`, `hr_payroll_user`, `hr_payroll_manager`, `admin`).
3. If Member 1's backend tables use `snake_case` column naming, simple property mapping can be added in `src/services/*`.
