# PeoplePay360 — Integrated HR & Payroll Operations Platform

![PeoplePay360 Banner](https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80)

**PeoplePay360** is a modern, integrated HRMS and automated payroll calculation platform designed for high-velocity teams. It combines employee lifecycle tracking, multi-contract career progression, shift attendance with biometric regularization, time-off approvals, hierarchical salary structures with sequenced formula rules, and automated batch payrun generation.

Built for the **24-Hour Hackathon** with clean frontend/backend decoupling between Member 1 (Backend/Supabase) and Member 2 (Frontend).

---

## 🚀 Quick Start

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/elango05-coder/PeoplePay360.git
cd PeoplePay360

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

App runs at: **`http://127.0.0.1:5173/`**

### 2. Build for Production
```bash
npm run build
```

---

## 🌟 Core Modules & Capabilities

1. **Executive Dashboard (`/dashboard`)**: KPI statistics (Headcount, Present Today, Pending Leaves, Net Disbursal), attendance distribution progress bar, and department headcount ratios.
2. **Employee Directory (`/employees`)**: Searchable, paginated personnel list with department and status filtering, profile onboarding, and edit modals.
3. **Multi-Contract History (`/employees/:id`)**: Visual timeline of compensation revisions and tenure agreements for every employee (e.g. Junior Dev ₹45,000 &rarr; Senior Dev ₹75,000).
4. **Contract Agreements (`/contracts`)**: Centralized repository of all employment agreements with salary structure linkages.
5. **Daily Attendance (`/attendance`)**: Punch timestamps, status classification (`Present`, `Late`, `Absent`, `Missing Checkout`, `Corrected`), and manager regularization.
6. **Time Off & Leaves (`/time-off`)**: Balance cards (Annual, Sick, Casual, Maternity/Paternity), leave request submission, and 1-click manager approval/rejection.
7. **Salary Structures & Rules (`/salary`)**: Sequenced computation pipeline (Sequence 1..N: Basic &rarr; HRA &rarr; Special Allowance &rarr; EPF &rarr; PT &rarr; TDS) with interactive **Move Up / Down** reordering.
8. **Payroll Operations (`/payroll`)**: Payrun lifecycle management (`Draft` &rarr; `Computed` &rarr; `Validated` &rarr; `Paid`).
9. **4-Step Payrun Wizard**: Step-by-step cycle initializer: Structure &rarr; Period &rarr; Employees &rarr; Summary Review.
10. **Payslip Vouchers (`/payroll/payslips`)**: Official statement of earnings and statutory withholdings with simulated **Download PDF** and **Send Email** triggers.
11. **Operational Analytics (`/reports`)**: Headcount distribution, attendance punctuality rates, and historical payroll expense reports with CSV and PDF export triggers.
12. **Role Persona Switcher**: Topbar dropdown to instantly preview views and permissions across all 5 roles: `admin`, `hr_payroll_manager`, `hr_payroll_user`, `hr_manager`, and `employee`.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS 3 (Custom palette: Navy slate, crisp white, indigo/violet accents)
- **Icons**: Lucide React
- **Routing**: React Router DOM 6 with Role Guards
- **Data Architecture**: Decoupled service layer (`src/services/*`) backed by stateful reactive repository.

---

## 📚 Detailed Documentation

- **[Frontend Architecture Guide](docs/frontend/README.md)**: Full component tree, routing map, and state design.
- **[Backend Integration Contract (for Member 1)](docs/frontend/backend-integration.md)**: Database schemas, foreign keys, and RPC hook points for Supabase.

---

## 👥 Hackathon Team Division

- **Member 1 (Backend)**: Supabase, PostgreSQL database, RLS policies, salary calculation engine, PDF generation, email services.
- **Member 2 (Frontend)**: React application, UI design system, stateful mock services, responsive shell, payrun wizard, and UX flows.
