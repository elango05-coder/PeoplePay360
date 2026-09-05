# PeoplePay360 — Backend Architecture

## Overview
**PeoplePay360** is an enterprise-grade Human Resources and Payroll system designed to connect:
```text
Employee → Contract → Working Schedule → Attendance → Time Off → Salary Structure → Salary Rules → Payrun → Payslip
```

The system is built on **Supabase PostgreSQL**, leveraging:
- PostgreSQL database engine with strict relational constraints and indexing.
- Supabase Auth for identity management.
- PostgreSQL Row Level Security (RLS) for data protection at the query level.
- Transactional Database Functions (RPCs) for atomic operations (payroll computation, leave approvals, validation).
- A strongly typed TypeScript service layer ready for consumption by Member 2's React/Vite frontend.

---

## High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend ["React / Vite / Tailwind (Member 2)"]
        UI[UI Components]
        ServicesClient[Typed Services Client]
    end

    subgraph Supabase ["Supabase Backend (Member 1)"]
        Auth[Supabase Auth]
        RLS[Row Level Security]
        Tables[(Core PostgreSQL Tables)]
        RPC[PostgreSQL Functions / RPCs]
    end

    UI --> ServicesClient
    ServicesClient --> Auth
    ServicesClient --> RLS
    RLS --> Tables
    ServicesClient --> RPC
    RPC --> Tables
```

---

## Core Domain Modules

| Module | Purpose | Key Tables |
| :--- | :--- | :--- |
| **Auth & Profiles** | Identity, RBAC role assignment, user linking | `profiles`, `auth.users` |
| **Organization** | Department hierarchy, positions, management structure | `departments`, `employees` |
| **Contracts** | Historical wage agreements with effective date ranges | `contracts` |
| **Schedules** | Standard & flexible work schedules with break times | `working_schedules`, `working_schedule_days` |
| **Attendance** | Clock-in/out, worked hours calculation, anomaly detection | `attendance` |
| **Time Off** | Leave allocations, balance tracking, approval workflows | `time_off_types`, `time_off_allocations`, `time_off_requests` |
| **Salary Rules** | Sequential formula & percentage-based compensation modeling | `salary_structures`, `salary_rules` |
| **Payroll Engine** | Period-based contract resolution, leave adjustments, calculation | `payruns`, `payrun_employees`, `payslips`, `payslip_lines` |
| **Dashboard** | Real-time operational KPI aggregation | RPC: `get_dashboard_metrics` |

---

## Payroll Life-Cycle Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Payroll Admin / HR
    participant PR as Payrun Service
    participant PE as Payroll Engine
    participant DB as PostgreSQL / RPC

    Admin->>PR: Create Payrun (Period Start & End)
    PR->>DB: Insert payrun (status: 'draft') & payrun_employees
    Admin->>PR: Compute Payrun
    PR->>PE: Compute each employee
    PE->>DB: Resolve contract for period (start_date <= end & end_date >= start)
    PE->>DB: Fetch active salary rules (ORDER BY sequence ASC)
    PE->>DB: Fetch attendance exceptions & approved unpaid leave
    PE->>DB: Insert payslip & payslip_lines (Basic, Allowances, Gross, Deductions, Net)
    PE->>DB: Update payrun status to 'computed'
    Admin->>PR: Validate Payrun
    PR->>DB: Check for hard errors (missing contract, missing rules)
    alt Has Hard Errors
        DB-->>Admin: Block validation (status stays 'computed')
    else Only Warnings or Clean
        DB-->>Admin: Mark payrun & payslips 'validated'
    end
    Admin->>PR: Mark Paid
    PR->>DB: Update payrun & payslips status to 'paid'
```

---

## Technology Stack
- **Database**: PostgreSQL 15+ (Supabase)
- **Security**: PostgreSQL Row Level Security (RLS) with security definer functions
- **Engine Logic**: PostgreSQL PL/pgSQL RPCs & Isomorphic TypeScript calculation engine
- **Client Services**: `@supabase/supabase-js` v2 with strict TypeScript types
- **Testing**: Vitest & Node.js
