# PeoplePay360 — HR & Payroll Management Platform

> **An integrated Human Resource and Payroll Operations Platform**

PeoplePay360 is a full-stack HR and Payroll management platform that connects **employee master data, contracts, working schedules, attendance, time off, salary structures, salary rules, payroll processing, payslips, and reporting** into one end-to-end operational workflow.

The system is designed around a core principle:

```text
Employee Data
     ↓
Contract + Working Schedule
     ↓
Attendance + Time Off
     ↓
Salary Structure + Salary Rules
     ↓
Payrun
     ↓
Payroll Computation
     ↓
Validation + Warnings
     ↓
Payslip
     ↓
PDF / Email
     ↓
Dashboard & Reporting
```

The project focuses on real-world HR/payroll business logic rather than simple CRUD operations, including **period-specific contract selection, leave balance consumption, ordered salary-rule calculation, payroll validation, historical payroll records, and role-based access control**.

---

# 1. Problem Statement

Traditional/basic HR systems often keep employee information, attendance, leave, contracts, and salary information in separate places.

This creates problems such as:

* HR data becoming fragmented
* Payroll teams manually combining information
* Incorrect contract being used for payroll
* Attendance exceptions affecting salary calculations
* Leave balances becoming difficult to track
* Salary calculations becoming difficult to audit
* Payroll errors being discovered after processing
* Lack of centralized HR/payroll reporting

PeoplePay360 solves this by connecting all major HR and payroll operations into a single system.

For example, an employee can have multiple contracts over time, but payroll must use the contract applicable to the selected payroll period. Attendance exceptions and unpaid leave can also affect payroll computation.

---

# 2. Solution

PeoplePay360 provides an integrated platform where:

```text
Employee
   │
   ├── Contracts
   │
   ├── Working Schedule
   │
   ├── Attendance
   │
   ├── Time Off
   │
   └── Salary Configuration
          │
          ↓
       Payrun
          │
          ↓
       Payroll Engine
          │
          ↓
       Payslip
          │
          ├── PDF
          └── Email
```

Instead of treating each module independently, the system maintains relationships between them.

---

# 3. Key Features

## Employee Management

* Employee profiles
* Department
* Job position
* Manager
* Employment status
* Employee type
* Employee-related records
* List/Kanban/Form views

Employees act as the central hub for HR operations.

---

## Contract Management

* Multiple contracts per employee
* Historical contract records
* Contract start/end dates
* Wage/base salary
* Department
* Position
* Salary structure
* Active contract tracking

### Important Business Rule

Payroll must select the contract applicable to the selected payroll period.

```text
Employee
   ↓
Contract History
   ↓
Find contract valid for payroll period
   ↓
Use that contract for payroll
```

This prevents an employee's current contract from incorrectly being used for an older payroll period.

---

## Working Schedule

Working schedules define:

* Working days
* Start time
* End time
* Break duration
* Weekly working hours

Weekly hours are calculated from the schedule rather than being treated as an isolated manual value.

Schedules can be associated with employees/contracts and provide context for attendance and payroll.

---

# 4. Attendance Management

The attendance module handles:

* Check-in
* Check-out
* Worked hours
* Attendance status
* Late arrival
* Missing checkout
* Attendance exceptions
* Manual corrections by authorized users

Attendance information can contribute to payroll calculations and dashboard reporting.

Example:

```text
Employee
   ↓
Attendance
   ├── Present
   ├── Late
   ├── Absent
   └── Missing Checkout
```

---

# 5. Time Off / Leave Management

PeoplePay360 supports:

### Time Off Types

Define:

* Leave name
* Unit
* Allocation requirements
* Approval workflow
* Payroll integration

### Allocations

Track:

* Allocated leave
* Used leave
* Remaining leave
* Validity period
* Approval status

### Requests

Employees can:

```text
Create Request
      ↓
Pending
      ↓
HR Approval
      ↓
Approved / Refused
```

Approved requests consume the corresponding leave allocation where applicable.

---

# 6. Salary Structures

Salary Structures act as containers for Salary Rules.

Example:

```text
Regular Salary Structure
│
├── Basic Salary
├── Housing Allowance
├── Transport Allowance
├── Gross Salary
├── Tax Deduction
├── Other Deduction
└── Net Salary
```

A Payrun selects the appropriate Salary Structure.

The selected structure determines which salary rules are executed.

---

# 7. Salary Rules

Salary Rules define how salary components are calculated.

Each rule can contain:

* Name
* Code
* Category
* Sequence
* Calculation method
* Formula/fixed amount/percentage
* Salary structure association

### Rule Categories

```text
Basic
Allowances
Gross
Deductions
Net
```

Rules are processed in sequence so that later calculations can depend on earlier results.

---

# 8. Payroll Engine

The Payroll Engine is the core business-logic component.

It combines:

```text
Employee
+
Applicable Contract
+
Working Schedule
+
Attendance
+
Time Off
+
Salary Structure
+
Salary Rules
+
Payroll Period
```

and produces:

```text
Payslip
```

### Simplified Calculation

```text
Basic Salary
     +
Allowances
     ↓
Gross Salary
     -
Deductions
     ↓
Net Salary
```

The actual calculation is driven by configured Salary Rules rather than hardcoded frontend values.

---

# 9. Payrun Workflow

A Payrun represents a payroll batch for a particular period.

## Step 1 — Define Scope

Select:

* Salary Structure
* Payroll Period

## Step 2 — Select Employees

Select eligible employees.

## Step 3 — Create Payrun

The selected employees become part of the payroll batch.

## Step 4 — Compute

The payroll engine calculates payslips.

## Step 5 — Review

Review:

* Gross salary
* Deductions
* Net salary
* Contract
* Salary structure
* Warnings

## Step 6 — Validate

The system checks for payroll problems.

Examples:

* Missing bank details
* Duplicate payslips
* Missing checkout
* Other payroll warnings

## Step 7 — Mark Paid

Once validated, the Payrun can be marked as paid.

## Step 8 — Payslip Delivery

Payslips can be:

* Viewed
* Printed
* Generated as PDF
* Sent to employees by email

The specification explicitly defines this Compute → Validate → Mark Paid → Send Payslips workflow.

---

# 10. Payroll State Machine

```text
        ┌─────────┐
        │  DRAFT  │
        └────┬────┘
             ↓
        ┌──────────┐
        │ COMPUTED │
        └────┬─────┘
             ↓
        ┌───────────┐
        │ VALIDATED │
        └─────┬─────┘
              ↓
         ┌────────┐
         │  PAID  │
         └────────┘
```

Once payroll is finalized/paid, historical records must remain available.

Paid payroll must not be recomputed through an invalid state transition.

---

# 11. Payslips

Each payslip contains:

* Employee
* Payrun
* Payroll period
* Contract
* Salary structure
* Worked days
* Basic
* Allowances
* Gross
* Deductions
* Net salary
* Status
* Warnings

The payslip calculation uses the contract applicable to the selected period together with the Payrun's assigned Salary Structure.

---

# 12. Payslip PDF

The system supports printable payslips.

PDF contains:

```text
PeoplePay360
────────────────────────────

Employee Information

Payroll Period

Contract

Salary Components
----------------------------
Basic
Allowances
Gross
Deductions
Net Salary
----------------------------

Payroll Status
```

PDF values must come from the actual calculated payslip.

---

# 13. Email Delivery

The Payrun workflow can support bulk payslip distribution.

```text
Payrun
  ↓
Generated Payslips
  ↓
Send Payslips
  ↓
Employee Email
  ↓
Payslip Delivery
```

Email provider credentials must never be exposed in frontend code.

---

# 14. Payroll Dashboard

The dashboard aggregates live information across HR and Payroll.

### KPI Examples

* Total Net Salary Paid
* Payslips Generated
* Average Salary
* Approved Time Off
* Attendance Health

### Analytics

* Salary Cost by Department
* Monthly Net Salary Trends
* Headcount
* Attendance
* Leave
* Payroll warnings

### Alerts

* Missing required information
* Duplicate payslips
* Attendance exceptions
* Contract attention items
* Payroll processing status

The dashboard is intended to use live operational data rather than static/mock charts.

---

# 15. System Architecture

## High-Level Architecture

```text
                    ┌──────────────────────┐
                    │      USERS           │
                    │ Employee / HR /      │
                    │ Payroll / Admin      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │      + Vite          │
                    │                      │
                    │ Pages / Components   │
                    │ Forms / Tables       │
                    │ Dashboard / Routing  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Supabase Client    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
     ┌──────────────────┐             ┌──────────────────┐
     │ Supabase Auth    │             │ PostgreSQL       │
     │                  │             │ Database         │
     │ Login / Session  │             │                  │
     └──────────────────┘             └────────┬─────────┘
                                               │
                                               ▼
                                     ┌──────────────────┐
                                     │       RLS        │
                                     │ Role-based       │
                                     │ Data Security    │
                                     └────────┬─────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │ RPC / Functions  │
                                     │                  │
                                     │ Payroll Engine   │
                                     │ Contract Logic   │
                                     │ Leave Logic      │
                                     │ Payrun Logic     │
                                     │ Dashboard        │
                                     └────────┬─────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │ Payroll Results  │
                                     │                  │
                                     │ Payruns          │
                                     │ Payslips         │
                                     └──────────────────┘
```

---

# 16. Frontend Architecture

Recommended structure:

```text
frontend/
│
├── src/
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── dashboard/
│   │   └── payroll/
│   │
│   ├── pages/
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Employees/
│   │   ├── Contracts/
│   │   ├── Schedules/
│   │   ├── Attendance/
│   │   ├── TimeOff/
│   │   ├── SalaryStructures/
│   │   ├── SalaryRules/
│   │   ├── Payruns/
│   │   └── Payslips/
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── employee.service.ts
│   │   ├── contract.service.ts
│   │   ├── schedule.service.ts
│   │   ├── attendance.service.ts
│   │   ├── timeOff.service.ts
│   │   ├── salary.service.ts
│   │   ├── payroll.service.ts
│   │   ├── payrun.service.ts
│   │   └── dashboard.service.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useEmployees.ts
│   │   ├── useAttendance.ts
│   │   └── usePayroll.ts
│   │
│   ├── lib/
│   │   └── supabase.ts
│   │
│   ├── types/
│   │
│   ├── routes/
│   │
│   └── App.tsx
│
└── package.json
```

The exact structure may differ depending on the existing frontend implementation. Do not reorganize the entire frontend unnecessarily.

---

# 17. Backend Architecture

PeoplePay360 uses Supabase as the backend platform.

```text
backend/
│
├── supabase/
│   │
│   ├── migrations/
│   │   ├── initial_schema.sql
│   │   ├── functions_and_rpc.sql
│   │   └── rls_policies.sql
│   │
│   └── seed.sql
│
├── src/
│   │
│   ├── services/
│   │   ├── employee.service.ts
│   │   ├── contract.service.ts
│   │   ├── schedule.service.ts
│   │   ├── attendance.service.ts
│   │   ├── timeOff.service.ts
│   │   ├── salary.service.ts
│   │   ├── payroll.service.ts
│   │   ├── payrun.service.ts
│   │   └── dashboard.service.ts
│   │
│   ├── types/
│   │   ├── database.types.ts
│   │   └── payroll.types.ts
│   │
│   └── lib/
│       └── supabase.ts
│
└── tests/
```

The backend follows a database-centric architecture where critical business rules are enforced through PostgreSQL functions/RPCs and RLS.

---

# 18. Database Architecture

Core entities:

```text
profiles
    │
    └── employees
           │
           ├── contracts
           │
           ├── attendance
           │
           ├── time_off_requests
           │
           ├── time_off_allocations
           │
           └── schedules

salary_structures
    │
    └── salary_rules

employees
    │
    └── payslips
           │
           └── payruns
```

### Main Database Areas

```text
Identity
├── profiles
└── roles

HR
├── employees
├── departments
├── contracts
└── schedules

Attendance
└── attendance

Time Off
├── time_off_types
├── time_off_allocations
└── time_off_requests

Payroll Configuration
├── salary_structures
└── salary_rules

Payroll Processing
├── payruns
└── payslips
```

---

# 19. Important Database Relationships

## Employee → Contracts

One employee can have multiple contracts.

```text
Employee 1 ──────── * Contracts
```

This enables historical contract tracking.

---

## Employee → Attendance

```text
Employee 1 ──────── * Attendance Records
```

---

## Employee → Time Off

```text
Employee 1 ──────── * Time Off Requests
Employee 1 ──────── * Time Off Allocations
```

---

## Salary Structure → Salary Rules

```text
Salary Structure 1 ──────── * Salary Rules
```

---

## Payrun → Payslips

```text
Payrun 1 ──────── * Payslips
```

---

# 20. Authentication Architecture

Authentication is handled through Supabase Auth.

```text
User
 ↓
Supabase Auth
 ↓
Authenticated Session
 ↓
profiles
 ↓
Role
 ↓
Application Access
```

The frontend uses the public Supabase client credentials.

Privileged service-role credentials must never be exposed to the browser.

---

# 21. Role-Based Access Control

PeoplePay360 has five primary roles.

| Role               | Main Permissions                                       |
| ------------------ | ------------------------------------------------------ |
| Employee           | Own profile, attendance, time off                      |
| HR Manager         | Employees, contracts, schedules, attendance, time off  |
| HR Payroll User    | HR + payruns/payslips + read-only salary configuration |
| HR Payroll Manager | Full HR + full payroll configuration                   |
| Admin              | Full system access                                     |

The backend/database RLS layer is the final security boundary.

Frontend route protection is used for user experience, but it must not replace database authorization.

---

# 22. Row Level Security

Supabase Row Level Security ensures that users only access records permitted by their role.

Example:

```text
Employee
   ↓
Can access own permitted records

HR Manager
   ↓
Can access HR records

Payroll Manager
   ↓
Can access payroll configuration

Admin
   ↓
Full access
```

Every sensitive database operation should be protected by RLS and/or secure database functions.

---

# 23. Backend RPC Functions

Important business operations are implemented through database functions/RPCs.

Examples include:

```text
get_applicable_contract()
approve_time_off()
compute_employee_payroll()
compute_payrun()
validate_payrun()
mark_payrun_paid()
get_dashboard_metrics()
```

These operations centralize critical business rules.

---

# 24. End-to-End Data Flow

The complete PeoplePay360 workflow is:

```text
                    EMPLOYEE
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
      CONTRACT                 SCHEDULE
          │                         │
          └────────────┬────────────┘
                       ▼
                 ATTENDANCE
                       │
                       ▼
                  TIME OFF
                       │
                       ▼
             SALARY STRUCTURE
                       │
                       ▼
                SALARY RULES
                       │
                       ▼
                    PAYRUN
                       │
                       ▼
              PAYROLL ENGINE
                       │
                       ▼
                 VALIDATION
                       │
                       ▼
                  PAYSLIPS
                   /      \
                  ▼        ▼
                PDF      EMAIL
                       │
                       ▼
                  DASHBOARD
```

This connected workflow is the central architectural concept of the project.

---

# 25. Example: Period-Specific Contract

One of the most important business rules is historical contract handling.

Example:

```text
Rahul
│
├── Contract 1
│   ├── Start: June
│   └── Base Salary: ₹40,000
│
└── Contract 2
    ├── Start: July
    └── Base Salary: ₹50,000
```

### June Payroll

```text
Payroll Period
     ↓
Applicable Contract
     ↓
Contract 1
     ↓
₹40,000 base salary
```

### July Payroll

```text
Payroll Period
     ↓
Applicable Contract
     ↓
Contract 2
     ↓
₹50,000 base salary
```

This demonstrates why PeoplePay360 is more than an employee CRUD application.

---

# 26. Example: Attendance + Leave → Payroll

Example employee:

```text
Employee
   ↓
Attendance
   ├── Late arrival
   └── Missing checkout
   ↓
Time Off
   └── Unpaid Leave
   ↓
Payroll Engine
   ↓
Deduction
   ↓
Payslip
```

The payroll system can surface warnings and apply applicable deductions based on the configured business rules.

---

# 27. Technology Stack

## Frontend

* React
* Vite
* TypeScript/JavaScript
* Tailwind CSS or existing project styling
* Recharts or existing charting library

## Backend

* Supabase
* PostgreSQL
* Supabase Auth
* PostgreSQL Functions / RPC
* Row Level Security

## Documents

* PDF generation library

## Email

* Email provider integration

## Development

* Git
* GitHub
* VS Code
* Antigravity

---

# 28. Environment Variables

Create a `.env` file locally.

Example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit `.env` to Git.

Add:

```text
.env
.env.local
```

to `.gitignore`.

### Security Rule

Never place:

```text
SUPABASE_SERVICE_ROLE_KEY
```

or any privileged secret inside frontend code.

---

# 29. Installation

Clone the repository:

```bash
git clone <repository-url>
cd PeoplePay360
```

Install dependencies:

```bash
npm install
```

Configure environment variables:

```text
.env
```

Run the development server:

```bash
npm run dev
```

---

# 30. Backend Verification

Run tests:

```bash
npm test
```

Run production build:

```bash
npm run build
```

Expected:

```text
Tests: PASS
Build: PASS
TypeScript: 0 errors
```

---

# 31. Development Workflow

Recommended development process:

```text
1. Create/modify database migration
             ↓
2. Update database types
             ↓
3. Implement backend service/RPC
             ↓
4. Test backend
             ↓
5. Connect frontend service
             ↓
6. Connect UI
             ↓
7. Test role permissions
             ↓
8. Test complete workflow
```

Do not implement critical payroll logic independently in the frontend.

---

# 32. Testing Strategy

Testing should happen at multiple levels.

## Unit Tests

Test:

* Salary calculations
* Leave calculations
* Contract selection
* Payroll rules

## Database Tests

Test:

* Constraints
* Relationships
* RLS
* RPCs

## Integration Tests

Test:

```text
Frontend
   ↓
Supabase
   ↓
Database
   ↓
RPC
   ↓
Payroll
```

## End-to-End Tests

Test complete business scenarios from login to payslip.

---

# 33. Security Checklist

Before deployment:

* [ ] RLS enabled
* [ ] Roles correctly configured
* [ ] Employee access restricted
* [ ] Payroll access restricted
* [ ] Admin access verified
* [ ] No service-role key in frontend
* [ ] No passwords committed
* [ ] No secrets committed
* [ ] `.env` ignored
* [ ] Backend authorization tested
* [ ] Invalid role access rejected

---

# 34. Demo Scenario 1 — Employee to Payslip

```text
Login
 ↓
Employees
 ↓
Select Rahul
 ↓
View Contract
 ↓
View Attendance
 ↓
View Time Off
 ↓
Open Payroll
 ↓
Create Payrun
 ↓
Select Period
 ↓
Select Rahul
 ↓
Compute
 ↓
Validate
 ↓
Review Payslip
 ↓
Mark Paid
 ↓
Generate PDF
```

This demonstrates the complete employee-to-payroll workflow.

---

# 35. Demo Scenario 2 — Contract Change

Show Rahul's contract history.

### June

```text
Contract 1
Base = ₹40,000
```

### July

```text
Contract 2
Base = ₹50,000
```

Run payroll for both periods and show that the correct contract is selected automatically.

This is one of the strongest demonstrations of the project's business logic.

---

# 36. Demo Scenario 3 — Attendance + Leave Exception

Use an employee with:

```text
Late Arrival
Missing Checkout
Unpaid Leave
```

Then:

```text
Attendance / Time Off
       ↓
Payroll
       ↓
Warnings
       ↓
Deduction
       ↓
Payslip
```

This demonstrates how HR operational data influences payroll.

---

# 37. Project Structure

Recommended overall repository:

```text
PeoplePay360/
│
├── README.md
├── package.json
├── .gitignore
├── .env.example
│
├── frontend/
│   └── src/
│
├── backend/
│   └── src/
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── tests/
│
└── docs/
    ├── backend-architecture.md
    ├── database-schema.md
    ├── api-contract.md
    ├── payroll-engine.md
    ├── rbac.md
    ├── frontend-handoff.md
    └── frontend-backend-integration.md
```

If the existing repository has a different structure, preserve the existing structure rather than unnecessarily moving files.

---

# 38. Architecture Principles

PeoplePay360 follows these principles:

### 1. Single Source of Truth

Supabase PostgreSQL is the source of truth for application data.

### 2. Business Logic Centralization

Critical payroll logic is implemented in backend/database functions rather than duplicated in the frontend.

### 3. Security by Default

RLS protects database records.

### 4. Historical Tracking

Contracts and payroll records remain available for historical analysis.

### 5. Configuration-Driven Payroll

Salary Rules drive payroll calculations.

### 6. Validation Before Finalization

Payroll warnings/errors are surfaced before payment.

### 7. Connected Modules

HR operations should flow naturally into payroll.

---

# 39. What Makes PeoplePay360 Different

PeoplePay360 is not simply:

```text
Employee CRUD + Payroll CRUD
```

It is:

```text
Connected HR Operations
          +
Historical Data
          +
Business Rules
          +
Payroll Engine
          +
Validation
          +
Role-Based Security
          +
Reporting
```

The platform focuses on the relationships between HR records and payroll decisions.

---

# 40. Future Enhancements

Possible future improvements:

* Advanced payroll/tax configuration
* Automated attendance integrations
* Biometric attendance integration
* Mobile application
* Advanced analytics
* Multi-company support
* Multi-currency payroll
* Automated scheduled payroll
* Bank/payment integrations
* Employee self-service portal improvements
* Notification system
* Audit log
* Advanced reporting
* AI-powered HR insights

These are future roadmap items and are not required for the core hackathon MVP.

---

# 41. Hackathon MVP Priority

The most important working flow is:

```text
Employee
   ↓
Contract
   ↓
Attendance
   ↓
Time Off
   ↓
Salary Structure
   ↓
Salary Rules
   ↓
Payrun
   ↓
Compute
   ↓
Validate
   ↓
Payslip
   ↓
PDF
```

The system should prioritize functional business logic over unnecessary visual or technical complexity.

---

# 42. Current Project Status

## Core Backend

```text
Supabase Database        ✅
Supabase Auth            ✅
Database Schema           ✅
RLS                       ✅
RPC Functions             ✅
Employee Services         ✅
Contract Services         ✅
Attendance                ✅
Time Off                  ✅
Salary Structures         ✅
Salary Rules              ✅
Payroll Engine            ✅
Payruns                   ✅
Payslips                  ✅
Dashboard Backend         ✅
Backend Tests             ✅
Live Supabase Testing     ✅
```

## Frontend

```text
React/Vite                🔄
Supabase Integration      🔄
Authentication            🔄
Employee UI               🔄
Contract UI               🔄
Attendance UI             🔄
Time Off UI               🔄
Salary UI                 🔄
Payrun UI                 🔄
Payslip UI                🔄
Dashboard UI              🔄
PDF                       🔄
Email                     🔄
```

Update this section as development progresses.

---

# 43. Complete System Flow

The complete PeoplePay360 architecture can be summarized as:

```text
┌───────────────────────────────────────────────┐
│                    USERS                      │
│ Employee | HR | Payroll | Admin              │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│               REACT FRONTEND                  │
│                                               │
│ Dashboard | Employees | Contracts             │
│ Attendance | Time Off | Salary | Payroll      │
│ Payslips | Reports                            │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              SUPABASE AUTH                    │
│           Authentication + Session            │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│             SUPABASE POSTGRESQL               │
│                                               │
│ Employees                                     │
│ Contracts                                     │
│ Schedules                                     │
│ Attendance                                    │
│ Time Off                                      │
│ Salary Structures                             │
│ Salary Rules                                  │
│ Payruns                                       │
│ Payslips                                      │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              ROW LEVEL SECURITY               │
│             Role-Based Authorization           │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│             DATABASE FUNCTIONS / RPC           │
│                                               │
│ Contract Resolution                            │
│ Leave Approval                                │
│ Payroll Calculation                           │
│ Payrun Computation                            │
│ Validation                                    │
│ Payment State                                 │
│ Dashboard Metrics                             │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                PAYROLL ENGINE                 │
│                                               │
│ Contract + Schedule + Attendance + Leave      │
│ + Salary Structure + Salary Rules             │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                  PAYSLIPS                     │
│                                               │
│ Basic | Allowances | Gross | Deductions | Net │
└──────────────────────┬────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
        ┌──────────┐      ┌─────────────┐
        │   PDF    │      │    EMAIL    │
        └──────────┘      └─────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │    DASHBOARD     │
              │ HR + Attendance  │
              │ Leave + Payroll  │
              └──────────────────┘
```

---

# 44. One-Line Project Description

> **PeoplePay360 is an integrated HR and Payroll platform that connects employee contracts, schedules, attendance, leave, and salary rules to automatically calculate, validate, and deliver accurate payroll and payslips.**

---

# 45. Final Goal

The final system should demonstrate a complete operational HR/payroll lifecycle:

```text
Employee Management
        ↓
Contract Management
        ↓
Working Schedule
        ↓
Attendance
        ↓
Time Off
        ↓
Salary Configuration
        ↓
Payrun
        ↓
Payroll Computation
        ↓
Validation
        ↓
Payslip
        ↓
PDF / Email
        ↓
Dashboard & Reporting
```

The objective is a **functional, secure, connected HR & Payroll platform**, not a collection of disconnected CRUD screens.

---

## License

This project was developed as a hackathon/project implementation.

Add the appropriate license here if the project is intended for public distribution.

---

## Team

### PeoplePay360 Team

* Member 1 — Backend / Supabase / Database / Payroll Logic
* Member 2 — Frontend / UI / UX / Integration

---

## Acknowledgement

Built for the PeoplePay360 HR & Payroll problem statement.

The platform architecture prioritizes:

* Real-world HR workflows
* Payroll correctness
* Historical records
* Role-based access
* Connected business data
* Configurable salary rules
* Validation and error detection
* End-to-end employee-to-payslip processing
