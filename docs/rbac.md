# PeoplePay360 — Role-Based Access Control (RBAC) & RLS

## Overview
PeoplePay360 enforces access security directly inside PostgreSQL using **Row Level Security (RLS)**.

Two non-recursive PostgreSQL security-definer helper functions resolve identity efficiently:
- `auth_user_role()`: Returns the authenticated user's assigned role from `public.profiles`.
- `auth_employee_id()`: Returns the linked `employee_id` for the authenticated user.

---

## Role Permissions Matrix

| Entity / Module | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Profile** | Own only | All | All | All | All (CRUD) |
| **Departments** | View | CRUD | CRUD | CRUD | CRUD |
| **Employees** | Own only | CRUD | CRUD | CRUD | CRUD |
| **Schedules** | View | CRUD | CRUD | CRUD | CRUD |
| **Contracts** | Own only | CRUD | View | CRUD | CRUD |
| **Attendance** | Own (Clock-in) | CRUD | View/Edit | View/Edit | CRUD |
| **Time Off Requests** | Own (Create/View) | Approve/Refuse | Approve/Refuse | Approve/Refuse | CRUD |
| **Salary Structures & Rules** | ❌ None | View | View | CRUD | CRUD |
| **Payruns** | ❌ None | ❌ None | Create/Compute | Full Lifecycle | Full Lifecycle |
| **Payslips** | Own (Validated/Paid) | ❌ None | View | Full Management | Full Management |

---

## RLS Enforcement Rules

### 1. Employee Isolation
Employees cannot inspect other employees' compensation, attendance, or contracts:
```sql
CREATE POLICY "Contracts viewable by employee (own) or HR/Payroll/Admin"
ON public.contracts FOR SELECT
USING (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);
```

### 2. Payslip Privacy
Employees can only view payslips that have been marked `validated`, `paid`, or `sent` (never `draft`):
```sql
CREATE POLICY "Payslips viewable by owner (validated/paid) or Payroll/Admin"
ON public.payslips FOR SELECT
USING (
    (employee_id = public.auth_employee_id() AND status IN ('validated', 'paid', 'sent'))
    OR public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager')
);
```

### 3. Separation of Concerns (HR vs Payroll)
- `hr_manager` can manage personnel, attendance, and leaves, but is restricted from modifying salary structures or computing/validating payruns.
- `hr_payroll_user` and `hr_payroll_manager` can process payruns and finalize payroll.
- `admin` possesses system-wide override privileges.
