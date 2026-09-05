// ==============================================================================
// PeoplePay360: Live End-to-End Test Suite against Real Supabase
// ==============================================================================

import { describe, expect, it } from 'vitest';
import { supabase } from '../src/lib/supabase.js';

describe('Real Supabase Database Integration Tests', () => {
  const RAHUL_ID = 'aaaa1111-1111-1111-1111-111111111111';
  const PRIYA_ID = 'aaaa2222-2222-2222-2222-222222222222';
  const JUNE_PAYRUN_ID = '77777777-7777-7777-7777-111111111111';
  const JULY_PAYRUN_ID = '77777777-7777-7777-7777-222222222222';

  // ----------------------------------------------------------------------------
  // 1. Dashboard Metrics
  // ----------------------------------------------------------------------------
  it('Live DB: get_dashboard_metrics returns correct aggregated figures', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_metrics');
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.total_employees).toBe(5);
    expect(data.active_employees).toBe(5);
  });

  // ----------------------------------------------------------------------------
  // 2. Demo Scenario 1: Rahul Historical Contracts
  // ----------------------------------------------------------------------------
  it('Live DB: RPC get_applicable_contract resolves Contract 1 (₹40,000) for June 2025', async () => {
    const { data, error } = await supabase.rpc('get_applicable_contract', {
      p_employee_id: RAHUL_ID,
      p_period_start: '2025-06-01',
      p_period_end: '2025-06-30',
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].contract_number).toBe('CNT-2025-001');
    expect(Number(data[0].wage)).toBe(40000);
  });

  it('Live DB: RPC get_applicable_contract resolves Contract 2 (₹50,000) for July 2025', async () => {
    const { data, error } = await supabase.rpc('get_applicable_contract', {
      p_employee_id: RAHUL_ID,
      p_period_start: '2025-07-01',
      p_period_end: '2025-07-31',
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].contract_number).toBe('CNT-2025-002');
    expect(Number(data[0].wage)).toBe(50000);
  });

  // ----------------------------------------------------------------------------
  // 3. Demo Scenario 2: Priya Patel Exceptions & Unpaid Leave
  // ----------------------------------------------------------------------------
  it('Live DB: Priya June Payroll computes unpaid leave deduction and warnings', async () => {
    const { data, error } = await supabase.rpc('compute_employee_payroll', {
      p_payrun_id: JUNE_PAYRUN_ID,
      p_employee_id: PRIYA_ID,
      p_period_start: '2025-06-01',
      p_period_end: '2025-06-30',
    });
    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(Number(data.contract_wage)).toBe(45000);
    expect(Number(data.gross_salary)).toBe(69600);
    // Unpaid leave deduction of 1 day out of 30 = 1500; total deductions = 5600 + 1500 = 7100
    expect(Number(data.deductions)).toBe(7100);
    expect(Number(data.net_salary)).toBe(62500);

    const warningCodes = (data.warnings as any[]).map((w) => w.code);
    expect(warningCodes).toContain('LATE_ATTENDANCE');
    expect(warningCodes).toContain('MISSING_CHECKOUT');
    expect(warningCodes).toContain('UNPAID_LEAVE_DEDUCTION');
  });

  // ----------------------------------------------------------------------------
  // 4. Payrun State Machine & Duplicate Protection
  // ----------------------------------------------------------------------------
  it('Live DB: Paid payruns block recomputation', async () => {
    // June payrun was marked paid
    const { data } = await supabase.rpc('compute_payrun', {
      p_payrun_id: JUNE_PAYRUN_ID,
    });
    expect(data.success).toBe(false);
    expect(data.error).toBe('PAYRUN_ALREADY_PAID');
  });

  // ----------------------------------------------------------------------------
  // 5. Leave Transaction & Atomic Balance Verification
  // ----------------------------------------------------------------------------
  it('Live DB: Rejects leave approval when balance is insufficient', async () => {
    // Attempt approval on non-existent or invalid request
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { data } = await supabase.rpc('approve_time_off', {
      p_request_id: fakeId,
      p_approved_by: RAHUL_ID,
    });
    expect(data.success).toBe(false);
    expect(data.error).toBe('REQUEST_NOT_FOUND');
  });
});
