# PeoplePay360: Frontend ↔ Backend Integration Report

## 1. Overview
The React 19 / Vite / Tailwind frontend created by Developer 2 has been integrated with the Supabase PostgreSQL database, Supabase Auth, Row-Level Security (RLS) policies, and backend Payroll calculation RPCs.

---

## 2. Integration Status Matrix

| Module | Status | Backend Source / Mechanism |
| :--- | :---: | :--- |
| **Frontend ↔ Supabase Client** | **PASS** | `src/lib/supabase.ts` with session auto-refresh |
| **Authentication** | **PASS** | `supabase.auth.signInWithPassword`, `profiles` query |
| **Role-Based Access (RBAC)** | **PASS** | `profiles.role` mapped to 5 personas (`admin`, `hr_manager`, `hr_payroll_manager`, `hr_payroll_user`, `employee`) |
| **Employees** | **PASS** | `public.employees` joined with `departments` |
| **Contracts** | **PASS** | `public.contracts` with period-specific contract history |
| **Working Schedules** | **PASS** | `public.working_schedules` & contract mappings |
| **Attendance** | **PASS** | `public.attendance` (clock-in, clock-out, late & missing checkout tracking) |
| **Time Off / Leave** | **PASS** | `public.time_off_requests`, `time_off_allocations`, and RPC `approve_time_off` |
| **Salary Structures** | **PASS** | `public.salary_structures` & `public.salary_rules` (ordered by `sequence ASC`) |
| **Salary Rules** | **PASS** | Evaluated via database payroll engine |
| **Payruns** | **PASS** | `public.payruns`, RPC `compute_payrun`, `validate_payrun`, `mark_payrun_paid` |
| **Payslips** | **PASS** | `public.payslips` joined with `payslip_lines` (Basic, HRA, Standard Deductions, Unpaid Leave) |
| **Dashboard** | **PASS** | Real-time counts from database for employees, payruns, attendance, and leaves |
| **PDF Generation** | **PASS** | Payslip printable voucher layout with `window.print()` trigger |
| **Email Dispatch** | **PASS** | UI dispatch simulation with recipient validation (ready for SMTP integration) |

---

## 3. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   React 19 Frontend UI                      │
│   (Dashboard, Employees, Contracts, Attendance, Payrun)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend Service Adapters                   │
│   (authService, employeeService, payrollService, etc.)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Client SDK                      │
│              (VITE_SUPABASE_URL + ANON KEY)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL Backend                 │
│  - Auth Users & Profiles (RBAC)                             │
│  - 11 Domain Tables with RLS                                │
│  - RPC get_applicable_contract                              │
│  - RPC compute_payrun                                       │
│  - RPC validate_payrun                                      │
│  - RPC mark_payrun_paid                                     │
│  - RPC approve_time_off                                     │
│  - RPC get_dashboard_metrics                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Module Integrations

### 4.1 Authentication & Session
- **Supabase Auth Integration**: [authService.ts](file:///c:/Users/elang/OneDrive/Desktop/PeoplePay360/frontend/src/services/authService.ts) connects directly to `supabase.auth.signInWithPassword`.
- **Profile Resolution**: Resolves user metadata and role from `public.profiles`, joining associated employee record if present.
- **Session Persistence**: [AuthContext.tsx](file:///c:/Users/elang/OneDrive/Desktop/PeoplePay360/frontend/src/context/AuthContext.tsx) listens to `onAuthStateChange` to maintain login across page refreshes.
- **Demo Personas**: Seeded accounts use password `Password123!`:
  - `admin@peoplepay360.com` (Admin)
  - `hr.manager@peoplepay360.com` (HR Manager)
  - `payroll.manager@peoplepay360.com` (HR Payroll Manager)
  - `payroll.user@peoplepay360.com` (HR Payroll User)
  - `rahul@peoplepay360.com` (Employee Rahul Sharma, EMP001)
  - `priya@peoplepay360.com` (Employee Priya Patel, EMP002)

### 4.2 Employee Module
- **Live Data**: [employeeService.ts](file:///c:/Users/elang/OneDrive/Desktop/PeoplePay360/frontend/src/services/employeeService.ts) queries `public.employees` joined with `departments`.
- **Mutations**: Supports creating, updating, and soft/hard deleting employees with department linking.

### 4.3 Contract Module & Period-Specific Resolution
- **Contract History**: Displays historical and active contracts.
- **Core Rule**: Rahul Sharma has Contract 1 (Jan-Jun 2025, Base ₹40,000) and Contract 2 (Jul-Dec 2025, Base ₹50,000). The database selects the applicable contract for the payrun period.

### 4.4 Attendance & Exceptions
- **Tracking**: Maps `attendance` records with status tracking (`Present`, `Late`, `Absent`, `Missing Checkout`).
- **Priya Scenario**: Identifies late check-in and unclosed punch for period exception reporting.

### 4.5 Time Off & Balance Enforcement
- **Allocations**: Retrieves balances from `time_off_allocations` joined with `time_off_types`.
- **RPC Validation**: Leave approval triggers `approve_time_off({ p_request_id, p_approved_by })`. If balance is insufficient, database raises an exception and UI displays the exact error message.

### 4.6 Payroll Computation, Validation & Payment
- **Draft &rarr; Compute**: Calls `compute_payrun({ p_payrun_id })`.
  - Calculates gross, statutory deductions, unpaid leave deductions (`unpaid_days * (wage / 30)`), and net salary.
  - Inserts individual `payslips` and `payslip_lines`.
- **Compute &rarr; Validate**: Calls `validate_payrun({ p_payrun_id })`. Checks for missing bank details, attendance exceptions, and duplicate runs.
- **Validate &rarr; Paid**: Calls `mark_payrun_paid({ p_payrun_id })`. Transitions status to `Paid` and locks against recomputation.

### 4.7 Payslip Voucher & PDF
- **Display**: [PayslipDetailModal.tsx](file:///c:/Users/elang/OneDrive/Desktop/PeoplePay360/frontend/src/pages/payroll/PayslipDetailModal.tsx) displays all earning and deduction line items returned by the payroll engine.
- **Print / PDF**: "Download PDF" formats the payslip voucher and triggers `window.print()` for PDF export.

---

## 5. Automated Verification Results

### Backend Vitest Suite
```
 RUN  v3.2.7 PeoplePay360/backend

 ✓ tests/demo-scenarios.test.ts (10 tests)
 ✓ tests/live-e2e.test.ts (6 tests)
   ✓ Real Supabase Database Integration Tests > Live DB: get_dashboard_metrics returns correct aggregated figures
   ✓ Real Supabase Database Integration Tests > Live DB: RPC get_applicable_contract resolves Contract 1 (₹40,000) for June 2025
   ✓ Real Supabase Database Integration Tests > Live DB: RPC get_applicable_contract resolves Contract 2 (₹50,000) for July 2025
   ✓ Real Supabase Database Integration Tests > Live DB: Priya June Payroll computes unpaid leave deduction and warnings
   ✓ Real Supabase Database Integration Tests > Live DB: Paid payruns block recomputation
   ✓ Real Supabase Database Integration Tests > Live DB: Rejects leave approval when balance is insufficient

 Test Files  2 passed (2)
      Tests  16 passed (16)
   Duration  3.29s
```

### Frontend Build
```
> payroll360@0.0.0 build
> tsc -b && vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 1934 modules transformed.
rendering chunks...
dist/index.html                   1.36 kB
dist/assets/index-OASGo0Oz.css   36.96 kB
dist/assets/index-CDRb213E.js   430.86 kB
✓ built in 1.08s
```

---

## 6. Manual Browser Verification Guide

1. **Start Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```
2. **Login**:
   - Navigate to `http://localhost:5173/login`.
   - Click the **Admin** quick-login button (`admin@peoplepay360.com` / `Password123!`).
   - Confirm successful sign-in to the Dashboard.
3. **Inspect Employees & Contracts**:
   - Go to `/employees`: verify Rahul Sharma and Priya Patel appear.
   - Go to `/contracts`: verify Rahul's contract history (Contract 1 at ₹40k, Contract 2 at ₹50k).
4. **Inspect Attendance & Time Off**:
   - Go to `/attendance`: verify Priya's late arrival and missing checkout records.
   - Go to `/timeoff`: test approving a leave request. Verify that approving with insufficient balance produces a descriptive error toast.
5. **Execute Payroll Lifecycle**:
   - Go to `/payroll`.
   - For a June 2025 payrun, click **Compute**: verify Rahul is computed at ₹40,000 base, and Priya includes ₹1,500 unpaid leave deduction.
   - Click **Validate**: verify warnings for Priya's attendance anomalies are shown.
   - Click **Disburse**: verify status transitions to `Paid`.
   - Click **Payslips**: open Rahul and Priya's payslip modals, verify line items, and click **Download PDF**.
