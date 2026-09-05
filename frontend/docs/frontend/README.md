# PeoplePay360 — Integrated HR & Payroll Operations Platform
## Frontend Documentation (Member 2 — Frontend Engineer)

**PeoplePay360** is an enterprise-grade HRMS and automated payroll calculation platform built for high-throughput operations. This document covers the architecture, component hierarchy, service contracts, and how the frontend is decoupled for seamless integration with Member 1's Supabase backend.

---

## 1. Quick Start & Running Locally

### Prerequisites
- Node.js (v18+ or v24)
- npm (v9+)

### Installation & Launch
```bash
# Clone or navigate to the repository
cd payroll360

# Install dependencies
npm install

# Start Vite Development Server
npm run dev

# Or build production bundle
npm run build
```
Local development server runs on: `http://127.0.0.1:5173/`

---

## 2. Frontend Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **React 19** | Declarative Component Architecture |
| **Vite 8** | Next-gen bundling & fast HMR |
| **TypeScript** | Strict compile-time type checking |
| **Tailwind CSS 3** | Curated SaaS styling, accessible contrast, custom palette |
| **React Router DOM 6**| Client-side routing, protected layouts, and role guards |
| **Lucide React** | Modern, accessible iconography |
| **Supabase JS Client**| Ready for Member 1 live connection via `.env` |

---

## 3. Architecture & Project Layout

```text
payroll360/
├── docs/
│   └── frontend/
│       ├── README.md               # Frontend architecture & guide
│       └── backend-integration.md  # Contract & API schema expectations for Member 1
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── FilterBar.tsx       # Pill-style multi-attribute filter bar
│   │   │   └── SearchBar.tsx       # Real-time search with clear trigger
│   │   ├── ui/
│   │   │   ├── Badge.tsx           # Semantic status indicators (Present, Paid, etc.)
│   │   │   ├── Button.tsx          # Multi-variant, loading spinner button
│   │   │   ├── Card.tsx            # Standard SaaS card container family
│   │   │   ├── ConfirmDialog.tsx   # Action approval & destruction dialog
│   │   │   ├── EmptyState.tsx      # Illustrated fallback states
│   │   │   ├── Input.tsx           # Text input with validation, password reveal
│   │   │   ├── LoadingSkeleton.tsx # Shimmer loaders for tables & cards
│   │   │   ├── Modal.tsx           # Backdrop blur modal dialog
│   │   │   ├── Pagination.tsx      # Table page stepper
│   │   │   ├── Select.tsx          # Custom accessible select input
│   │   │   ├── Table.tsx           # Responsive table components (Th, Td, Tr)
│   │   │   └── Tabs.tsx            # Pill and underline navigation tabs
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.tsx         # Session state, instant role switcher
│   │   └── ToastContext.tsx        # Toast notification queue
│   ├── data/
│   │   └── mockData.ts             # Realistic dataset (Rahul Kumar, Priya Sharma, etc.)
│   ├── layouts/
│   │   ├── AppLayout.tsx           # Global shell
│   │   ├── Sidebar.tsx             # Role-aware responsive navigation drawer
│   │   └── Topbar.tsx              # Breadcrumbs, role persona switcher, profile
│   ├── lib/
│   │   └── supabase.ts             # Safe Supabase client initialization wrapper
│   ├── pages/
│   │   ├── attendance/             # Punch logs, KPIs, regularization modal
│   │   ├── auth/                   # Login screen with 1-click persona autofill
│   │   ├── contracts/              # Contract revisions and wage agreements
│   │   ├── dashboard/              # Executive KPI dashboard and distribution charts
│   │   ├── employees/              # Employee list, form modal, detail view with tabs
│   │   ├── payroll/                # Payrun lifecycle, wizard, payslip vouchers
│   │   ├── reports/                # Headcount, attendance, and payroll cost trends
│   │   ├── salary/                 # Salary structure rule sequence manager
│   │   └── unauthorized/           # Role permission restriction feedback
│   ├── routes/
│   │   └── RoleGuard.tsx           # Frontend UX permission guard
│   ├── services/
│   │   ├── attendanceService.ts    # Attendance punches and metric aggregations
│   │   ├── authService.ts          # Auth state, login, role-switching
│   │   ├── contractService.ts      # Multi-contract CRUD operations
│   │   ├── employeeService.ts      # Employee directory CRUD
│   │   ├── payrollService.ts       # Payruns, payslips, PDF/email simulation
│   │   ├── reportService.ts        # Analytics summaries & CSV/PDF exports
│   │   ├── salaryService.ts        # Salary structures and rule sequences
│   │   └── timeOffService.ts       # Leave requests and balances
│   ├── types/
│   │   └── index.ts                # Strict domain TypeScript models
│   ├── App.tsx                     # Top-level route switchboard
│   ├── index.css                   # Tailwind base tokens & utilities
│   └── main.tsx                    # React root mounter
├── .env.example                    # Frontend environment template
└── tailwind.config.js              # Theme design tokens & brand colors
```

---

## 4. Application Flow & User Journey

The frontend is specifically built around the real-world operational HR flow:

```text
Employee Record
      ↓
Contract Agreement (Multiple contracts over time)
      ↓
Working Shift & Schedule
      ↓
Attendance & Time Off Regularization
      ↓
Salary Structure & Ordered Rules (Sequence 1..N)
      ↓
Payrun Wizard (Draft → Computed → Validated → Paid)
      ↓
Employee Payslip Breakdown
      ↓
Download PDF / Dispatch Email
```

---

## 5. Complete Routing Map

| Route | Module | Purpose | Role Access |
| :--- | :--- | :--- | :--- |
| `/login` | Authentication | Sign in with 1-click demo personas | Public |
| `/dashboard` | Executive Dashboard | KPI metrics, attendance bar, department breakdown | All |
| `/employees` | Employee Directory | Directory list, filter, search, add/edit modals | HR & Admin |
| `/employees/:id` | Employee Profile | 5 tabs: Overview, Contracts, Attendance, Leaves, Payslips | All |
| `/contracts` | Contract Agreements | Multi-contract history, salary structure assignments | HR, Payroll, Admin |
| `/attendance` | Daily Attendance | Check-in/out logs, status badges, regularization modal | All |
| `/time-off` | Leave Management | Leave balances, requests table, approval/rejection | All |
| `/salary` | Salary Structures | Sequence reordering, rule computation types, formulas | Payroll Mgr, Admin |
| `/payroll` | Payroll Operations | Payrun lifecycle (`Draft` &rarr; `Computed` &rarr; `Validated` &rarr; `Paid`) | Payroll, Admin |
| `/payroll/payslips` | Payslip Vouchers | Searchable payslip vouchers with PDF & email actions | Payroll, Admin |
| `/reports` | Analytics Reports | Department headcount, attendance rates, payroll trends | HR, Payroll Mgr, Admin |
| `/unauthorized` | Route Guard | Informative prompt when role privileges are insufficient | All |

---

## 6. Role-Based UX & Persona Switcher

To allow judges, evaluators, and Member 1 to immediately test role-restricted permissions, a **Role Switcher** is built directly into the Topbar and Login screen:

- **Admin (`admin`)**: Unrestricted access to all modules, configurations, and actions.
- **HR & Payroll Manager (`hr_payroll_manager`)**: Approves payruns, edits salary structures, reviews leave.
- **Payroll Specialist (`hr_payroll_user`)**: Manages payrun drafts, computes salaries, issues payslips.
- **HR Manager (`hr_manager`)**: Manages employee profiles, contracts, attendance, and time-off requests.
- **Employee (`employee`)**: Self-service access to personal attendance, time-off requests, and payslips.

---

## 7. Service Layer & Decoupling

All UI components interact exclusively with the Service Layer (`src/services/*`). UI components do NOT make direct Supabase or database calls.
- In mock mode (default for offline hackathon demos), services utilize an in-memory/localStorage cache to provide instantaneous, stateful reactions (e.g. creating an employee, approving a leave, reordering rules, or advancing a payrun).
- Once Member 1 configures the backend, the methods in `src/services/*` can be connected directly to Supabase without refactoring the UI.
