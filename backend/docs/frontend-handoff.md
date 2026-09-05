# PeoplePay360 — Frontend Integration & Handoff Guide

## Welcome Member 2!
This document gives you everything you need to connect your React/Vite/Tailwind application to the PeoplePay360 backend without writing custom backend logic or manual SQL queries.

---

## 1. Environment Setup

Create `.env` or `.env.local` in your frontend root:
```env
VITE_SUPABASE_URL=https://csavmmhlmglqugbiafdd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_obGhIFE-IZdAVbW5_AkfXQ_DQ27NeSK
```
*(Never expose the `SUPABASE_SERVICE_ROLE_KEY` on the frontend).*

---

## 2. Pre-Configured Demo Accounts

Use these accounts to test RBAC and the demo scenarios:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@peoplepay360.com` | `Password123!` | Complete system access |
| **HR Payroll Manager** | `payroll.manager@peoplepay360.com` | `Password123!` | Full payroll, structures, payslips |
| **HR Payroll User** | `payroll.user@peoplepay360.com` | `Password123!` | Payrun creation & computation |
| **HR Manager** | `hr.manager@peoplepay360.com` | `Password123!` | Personnel, attendance, leave approval |
| **Employee (Rahul)** | `rahul@peoplepay360.com` | `Password123!` | Self-service, own attendance & payslips |
| **Employee (Priya)** | `priya@peoplepay360.com` | `Password123!` | Self-service, own attendance & payslips |

---

## 3. How to Consume Backend Services in React

All services are typed and ready to import:

```tsx
import { 
  EmployeeService, 
  PayrunService, 
  DashboardService, 
  TimeOffService, 
  AttendanceService 
} from '../services';
```

### Example: Live Dashboard KPI Cards
```tsx
import React, { useEffect, useState } from 'react';
import { DashboardService } from '../services';
import type { DashboardMetrics } from '../types/payroll.types';

export const DashboardKPIs: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await DashboardService.getMetrics();
      if (data) setMetrics(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div>Loading live metrics...</div>;
  if (!metrics) return <div>Failed to load metrics</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-4 bg-white shadow rounded-lg">
        <h3 className="text-sm font-medium text-gray-500">Total Employees</h3>
        <p className="text-2xl font-bold">{metrics.total_employees}</p>
        <span className="text-xs text-green-600">{metrics.active_employees} active</span>
      </div>

      <div className="p-4 bg-white shadow rounded-lg">
        <h3 className="text-sm font-medium text-gray-500">Pending Leave</h3>
        <p className="text-2xl font-bold">{metrics.pending_leave_requests}</p>
        <span className="text-xs text-blue-600">{metrics.employees_on_leave_today} on leave today</span>
      </div>

      <div className="p-4 bg-white shadow rounded-lg">
        <h3 className="text-sm font-medium text-gray-500">Attendance Issues</h3>
        <p className="text-2xl font-bold text-amber-600">{metrics.attendance_exceptions_today}</p>
        <span className="text-xs text-gray-500">Exceptions today</span>
      </div>

      <div className="p-4 bg-white shadow rounded-lg">
        <h3 className="text-sm font-medium text-gray-500">Latest Net Payroll</h3>
        <p className="text-2xl font-bold text-emerald-600">
          ₹{metrics.current_payrun?.total_net.toLocaleString() || '0.00'}
        </p>
        <span className="text-xs text-gray-500">{metrics.current_payrun?.status || 'No payrun'}</span>
      </div>
    </div>
  );
};
```

---

### Example: Payrun Processing (Draft → Compute → Validate → Pay)

```tsx
import React, { useState } from 'react';
import { PayrunService } from '../services';

export const PayrunActionBar: React.FC<{ payrunId: string; currentStatus: string; onRefresh: () => void }> = ({
  payrunId,
  currentStatus,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCompute = async () => {
    setLoading(true);
    const res = await PayrunService.computePayrun(payrunId);
    setLoading(false);
    if (res.success) {
      setMessage(`Computed for ${res.computedCount} employees!`);
      onRefresh();
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    const res = await PayrunService.validatePayrun(payrunId);
    setLoading(false);
    if (res.isValid) {
      setMessage('Payrun validated successfully! Ready to pay.');
      onRefresh();
    } else {
      setMessage(`Validation blocked: ${res.blockingErrors.map(e => e.message).join(', ')}`);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    const res = await PayrunService.markPayrunPaid(payrunId);
    setLoading(false);
    if (res.success) {
      setMessage('Payrun marked as paid! Payslips sent.');
      onRefresh();
    }
  };

  return (
    <div className="flex items-center gap-3">
      {currentStatus === 'draft' && (
        <button onClick={handleCompute} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          Compute Payroll
        </button>
      )}

      {currentStatus === 'computed' && (
        <button onClick={handleValidate} disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded">
          Validate Payroll
        </button>
      )}

      {currentStatus === 'validated' && (
        <button onClick={handlePay} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
          Mark as Paid & Send Payslips
        </button>
      )}

      {message && <span className="text-sm font-medium">{message}</span>}
    </div>
  );
};
```

---

## 4. Key Hackathon Demo Scenarios to Show in UI

1. **Demo 1: Rahul Sharma's Historical Contract Switch**
   - Open June 2025 Payrun: Show Contract `CNT-2025-001` selected with base ₹40,000.
   - Open July 2025 Payrun: Show Contract `CNT-2025-002` selected with base ₹50,000.
   - This proves PeoplePay360 uses period-specific contracts, not just the latest contract!

2. **Demo 2: Priya Patel's Exceptions & Unpaid Leave**
   - Show attendance tab: 1 late arrival, 1 missing checkout.
   - Show time off tab: 1 day unpaid leave approved.
   - Compute June 2025 payroll:
     - Unpaid leave deduction calculated: ₹1,500.
     - Warnings flagged in validation bar for review.
     - Validation passes because warnings are non-blocking.
     - Payslip breakdown shows clear itemized deductions.
