// ==============================================================================
// PeoplePay360: Live Supabase Remote Verification Runner
// ==============================================================================

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../src/lib/supabase.js';

interface CheckItem {
  name: string;
  passed: boolean;
  details?: any;
  error?: any;
}

const results: CheckItem[] = [];

async function check(name: string, fn: () => Promise<any>) {
  try {
    const data = await fn();
    results.push({ name, passed: true, details: data });
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message || err });
    console.error(`[FAIL] ${name}:`, err.message || err);
  }
}

async function run() {
  console.log('--- Starting Real Supabase Integration Verification ---');
  console.log(`Project URL: ${supabaseUrl}`);

  // Step A: Create authenticated client as Admin
  let client: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'admin@peoplepay360.com',
    password: 'Password123!',
  });

  if (authData?.session) {
    console.log('Successfully authenticated as admin@peoplepay360.com!');
  } else {
    console.log(`Note: Running as unauthenticated/anon client (${authError?.message || 'not logged in'}). Some tables may be protected by RLS.`);
  }

  // 1. Check RPC: get_dashboard_metrics
  await check('Check RPC: get_dashboard_metrics', async () => {
    const { data, error } = await client.rpc('get_dashboard_metrics');
    if (error) throw error;
    if (!data || typeof data.total_employees !== 'number') {
      throw new Error('Dashboard metrics RPC returned invalid schema');
    }
    return `Dashboard metrics: Total Emp=${data.total_employees}, Active=${data.active_employees}`;
  });

  // 2. Check Departments Table
  await check('Check Departments Table', async () => {
    const { data, error } = await client.from('departments').select('*');
    if (error) throw error;
    if (!data || data.length < 3) throw new Error(`Expected at least 3 departments, got ${data?.length}`);
    return `${data.length} departments found`;
  });

  // 3. Check Employees Table & Rahul (EMP001)
  await check('Check Employees Table & Rahul (EMP001)', async () => {
    const { data, error } = await client.from('employees').select('*').eq('employee_code', 'EMP001').single();
    if (error) throw error;
    if (!data) throw new Error('Rahul Sharma (EMP001) not found');
    return `Employee EMP001 found: ${data.first_name} ${data.last_name}`;
  });

  // 4. Check Priya Patel (EMP002)
  await check('Check Priya Patel (EMP002)', async () => {
    const { data, error } = await client.from('employees').select('*').eq('employee_code', 'EMP002').single();
    if (error) throw error;
    return `Employee EMP002 found: ${data.first_name} ${data.last_name}`;
  });

  // 5. Check Historical Contracts for Rahul (Jan-Jun vs Jul-Dec)
  await check('Check Rahul Historical Contracts (Contract 1 & Contract 2)', async () => {
    const { data: rahul } = await client.from('employees').select('id').eq('employee_code', 'EMP001').single();
    if (!rahul) throw new Error('Rahul not found');

    const { data: contracts, error } = await client
      .from('contracts')
      .select('*')
      .eq('employee_id', rahul.id)
      .order('start_date', { ascending: true });
    if (error) throw error;
    if (!contracts || contracts.length < 2) throw new Error(`Expected 2 historical contracts for Rahul, got ${contracts?.length}`);

    const c1 = contracts[0];
    const c2 = contracts[1];
    if (Number(c1.wage) !== 40000 || Number(c2.wage) !== 50000) {
      throw new Error(`Expected Contract 1 = 40,000 and Contract 2 = 50,000, got ${c1.wage} and ${c2.wage}`);
    }
    return `Contracts verified: Jan-Jun = ₹${c1.wage}, Jul-Dec = ₹${c2.wage}`;
  });

  // 6. Check RPC: get_applicable_contract (June vs July)
  await check('Check RPC: get_applicable_contract (June vs July)', async () => {
    const { data: rahul } = await client.from('employees').select('id').eq('employee_code', 'EMP001').single();
    if (!rahul) throw new Error('Rahul not found');

    // June Period
    const { data: juneContract, error: errJune } = await client.rpc('get_applicable_contract', {
      p_employee_id: rahul.id,
      p_period_start: '2025-06-01',
      p_period_end: '2025-06-30',
    });
    if (errJune) throw errJune;
    if (!juneContract || juneContract.length === 0 || Number(juneContract[0].wage) !== 40000) {
      throw new Error(`June contract resolution failed, expected wage 40000, got ${juneContract?.[0]?.wage}`);
    }

    // July Period
    const { data: julyContract, error: errJuly } = await client.rpc('get_applicable_contract', {
      p_employee_id: rahul.id,
      p_period_start: '2025-07-01',
      p_period_end: '2025-07-31',
    });
    if (errJuly) throw errJuly;
    if (!julyContract || julyContract.length === 0 || Number(julyContract[0].wage) !== 50000) {
      throw new Error(`July contract resolution failed, expected wage 50000, got ${julyContract?.[0]?.wage}`);
    }

    return `RPC get_applicable_contract verified! June => ₹${juneContract[0].wage}, July => ₹${julyContract[0].wage}`;
  });

  // 7. Check Payrun Lifecycle RPCs (Compute -> Validate)
  await check('Check Payruns and Employee Payroll Calculation', async () => {
    const { data: payruns, error } = await client.from('payruns').select('*').limit(1);
    if (error) throw error;
    if (!payruns || payruns.length === 0) throw new Error('No payruns found');

    const payrunId = payruns[0].id;
    const { data: computeRes, error: compErr } = await client.rpc('compute_payrun', { p_payrun_id: payrunId });
    if (compErr) throw compErr;
    if (!computeRes?.success) throw new Error(`compute_payrun failed: ${JSON.stringify(computeRes)}`);

    const { data: validateRes, error: valErr } = await client.rpc('validate_payrun', { p_payrun_id: payrunId });
    if (valErr) throw valErr;

    return `Payrun computed & validation evaluated: ${JSON.stringify(validateRes)}`;
  });

  console.log('\n--- Verification Summary ---');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passedCount}/${results.length}`);
  if (passedCount < results.length) {
    process.exit(1);
  }
}

run();
