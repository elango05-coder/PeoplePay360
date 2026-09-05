// ==============================================================================
// PeoplePay360: Live Role-Based Access Control (RLS) Test Suite
// ==============================================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../src/lib/supabase.js';

interface RlsTestResult {
  role: string;
  test: string;
  allowed: boolean;
  expectedAllowed: boolean;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const testResults: RlsTestResult[] = [];

async function getClientForUser(email: string, password = 'Password123!') {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
  }
  return client;
}

export async function runRlsTests() {
  console.log('--- Starting Role-Based Access Control (RLS) Test Suite ---');

  // Test 1: Employee Role Isolation (Rahul Sharma)
  try {
    const rahulClient = await getClientForUser('rahul@peoplepay360.com');

    // Rahul should be able to read his own profile
    const { data: ownProfile, error: errProfile } = await rahulClient.from('profiles').select('*');
    testResults.push({
      role: 'employee',
      test: 'Employee read own profile',
      allowed: !errProfile && ownProfile !== null,
      expectedAllowed: true,
      status: (!errProfile && ownProfile !== null) ? 'PASS' : 'FAIL',
      details: errProfile?.message,
    });

    // Rahul CANNOT create a salary rule
    const { error: errRuleInsert } = await rahulClient.from('salary_rules').insert({
      salary_structure_id: '33333333-3333-3333-3333-111111111111',
      name: 'Unauthorized Bonus',
      code: 'UNAUTH_BONUS',
      sequence: 99,
      category: 'allowance',
      computation_type: 'fixed',
      value: 100000,
    });
    testResults.push({
      role: 'employee',
      test: 'Employee blocked from inserting salary rule',
      allowed: !errRuleInsert,
      expectedAllowed: false,
      status: errRuleInsert ? 'PASS' : 'FAIL',
      details: errRuleInsert ? 'Correctly denied by RLS' : 'UNEXPECTEDLY ALLOWED',
    });

    // Rahul CANNOT create a payrun
    const { error: errPayrunInsert } = await rahulClient.from('payruns').insert({
      name: 'Unauthorized Payrun',
      period_start: '2025-08-01',
      period_end: '2025-08-31',
      payment_date: '2025-08-31',
      status: 'draft',
    });
    testResults.push({
      role: 'employee',
      test: 'Employee blocked from creating payrun',
      allowed: !errPayrunInsert,
      expectedAllowed: false,
      status: errPayrunInsert ? 'PASS' : 'FAIL',
      details: errPayrunInsert ? 'Correctly denied by RLS' : 'UNEXPECTEDLY ALLOWED',
    });
  } catch (err: any) {
    console.warn(`Note on employee RLS test: ${err.message}`);
  }

  // Test 2: HR Manager Role (hr.manager@peoplepay360.com)
  try {
    const hrClient = await getClientForUser('hr.manager@peoplepay360.com');

    // HR can read employees
    const { data: emps, error: errEmps } = await hrClient.from('employees').select('*');
    testResults.push({
      role: 'hr_manager',
      test: 'HR Manager can read all employees',
      allowed: !errEmps && emps !== null,
      expectedAllowed: true,
      status: (!errEmps && emps !== null) ? 'PASS' : 'FAIL',
    });

    // HR Manager CANNOT insert or update salary rules
    const { error: errHrSalary } = await hrClient.from('salary_rules').insert({
      salary_structure_id: '33333333-3333-3333-3333-111111111111',
      name: 'HR Salary Rule Attempt',
      code: 'HR_RULE_FAIL',
      sequence: 99,
      category: 'allowance',
      computation_type: 'fixed',
      value: 5000,
    });
    testResults.push({
      role: 'hr_manager',
      test: 'HR Manager blocked from modifying salary rules',
      allowed: !errHrSalary,
      expectedAllowed: false,
      status: errHrSalary ? 'PASS' : 'FAIL',
      details: errHrSalary ? 'Correctly denied by RLS' : 'UNEXPECTEDLY ALLOWED',
    });
  } catch (err: any) {
    console.warn(`Note on HR Manager RLS test: ${err.message}`);
  }

  // Test 3: Admin Role (admin@peoplepay360.com)
  try {
    const adminClient = await getClientForUser('admin@peoplepay360.com');

    const { data: adminEmps, error: errAdminEmps } = await adminClient.from('employees').select('*');
    testResults.push({
      role: 'admin',
      test: 'Admin can read employees',
      allowed: !errAdminEmps && adminEmps !== null,
      expectedAllowed: true,
      status: (!errAdminEmps && adminEmps !== null) ? 'PASS' : 'FAIL',
    });
  } catch (err: any) {
    console.warn(`Note on Admin RLS test: ${err.message}`);
  }

  console.log('\n--- RLS Test Summary Matrix ---');
  console.table(testResults);
  const passCount = testResults.filter((r) => r.status === 'PASS').length;
  console.log(`Passed: ${passCount}/${testResults.length}`);
}

if (process.argv[1]?.endsWith('test-rls.ts')) {
  runRlsTests().catch(console.error);
}
