// ==============================================================================
// PeoplePay360: Demo Accounts Auth Provisioner
// ==============================================================================

import 'dotenv/config';
import { supabase } from '../src/lib/supabase.js';

const DEMO_PASSWORD = 'Password123!';

const DEMO_ACCOUNTS = [
  {
    email: 'admin@peoplepay360.com',
    password: DEMO_PASSWORD,
    full_name: 'System Administrator',
    role: 'admin',
    employee_id: 'aaaa0000-0000-0000-0000-000000000001',
  },
  {
    email: 'hr.manager@peoplepay360.com',
    password: DEMO_PASSWORD,
    full_name: 'HR Manager',
    role: 'hr_manager',
    employee_id: 'aaaa0000-0000-0000-0000-000000000002',
  },
  {
    email: 'payroll.user@peoplepay360.com',
    password: DEMO_PASSWORD,
    full_name: 'HR Payroll User',
    role: 'hr_payroll_user',
    employee_id: 'aaaa0000-0000-0000-0000-000000000003',
  },
  {
    email: 'payroll.manager@peoplepay360.com',
    password: DEMO_PASSWORD,
    full_name: 'HR Payroll Manager',
    role: 'hr_payroll_manager',
    employee_id: 'aaaa0000-0000-0000-0000-000000000004',
  },
  {
    email: 'rahul@peoplepay360.com',
    password: DEMO_PASSWORD,
    full_name: 'Rahul Sharma',
    role: 'employee',
    employee_id: 'aaaa1111-1111-1111-1111-111111111111',
  },
  {
    email: 'priya@peoplepay360.com',
    password: DEMO_PASSWORD,
    full_name: 'Priya Patel',
    role: 'employee',
    employee_id: 'aaaa2222-2222-2222-2222-222222222222',
  },
];

export async function provisionDemoUsers() {
  console.log('--- Provisioning Demo Users via Supabase Auth ---');

  for (const acc of DEMO_ACCOUNTS) {
    console.log(`Setting up account: ${acc.email} (${acc.role})...`);
    
    // Attempt sign-in first in case account already exists
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (signInData?.user) {
      console.log(`User already exists: ${acc.email} (ID: ${signInData.user.id})`);
      continue;
    }

    // Try sign up
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: {
        data: {
          full_name: acc.full_name,
          role: acc.role,
          employee_id: acc.employee_id,
        },
      },
    });

    if (signUpErr) {
      console.warn(`Sign up note for ${acc.email}: ${signUpErr.message}`);
    } else {
      console.log(`Created Auth user: ${acc.email} (ID: ${signUpData.user?.id})`);
    }
  }

  console.log('--- Demo user provisioning step complete ---');
}

if (process.argv[1]?.endsWith('seed-users.ts')) {
  provisionDemoUsers().catch(console.error);
}
