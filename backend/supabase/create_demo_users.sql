-- ==============================================================================
-- PeoplePay360: Create Pre-Confirmed Demo Auth Users
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Insert into auth.users with crypted password 'Password123!'
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
    ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@peoplepay360.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"System Administrator","role":"admin","employee_id":"aaaa0000-0000-0000-0000-000000000001"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'hr.manager@peoplepay360.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"HR Manager","role":"hr_manager","employee_id":"aaaa0000-0000-0000-0000-000000000002"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'payroll.user@peoplepay360.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"HR Payroll User","role":"hr_payroll_user","employee_id":"aaaa0000-0000-0000-0000-000000000003"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'payroll.manager@peoplepay360.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"HR Payroll Manager","role":"hr_payroll_manager","employee_id":"aaaa0000-0000-0000-0000-000000000004"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'rahul@peoplepay360.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Sharma","role":"employee","employee_id":"aaaa1111-1111-1111-1111-111111111111"}', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'priya@peoplepay360.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Patel","role":"employee","employee_id":"aaaa2222-2222-2222-2222-222222222222"}', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = NOW();

-- 2. Insert into auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
    ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', json_build_object('sub', '10000000-0000-0000-0000-000000000001', 'email', 'admin@peoplepay360.com'), 'email', 'admin@peoplepay360.com', NOW(), NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', json_build_object('sub', '10000000-0000-0000-0000-000000000002', 'email', 'hr.manager@peoplepay360.com'), 'email', 'hr.manager@peoplepay360.com', NOW(), NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', json_build_object('sub', '10000000-0000-0000-0000-000000000003', 'email', 'payroll.user@peoplepay360.com'), 'email', 'payroll.user@peoplepay360.com', NOW(), NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', json_build_object('sub', '10000000-0000-0000-0000-000000000004', 'email', 'payroll.manager@peoplepay360.com'), 'email', 'payroll.manager@peoplepay360.com', NOW(), NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', json_build_object('sub', '10000000-0000-0000-0000-000000000005', 'email', 'rahul@peoplepay360.com'), 'email', 'rahul@peoplepay360.com', NOW(), NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', json_build_object('sub', '10000000-0000-0000-0000-000000000006', 'email', 'priya@peoplepay360.com'), 'email', 'priya@peoplepay360.com', NOW(), NOW(), NOW())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Populate public.profiles with corresponding roles
INSERT INTO public.profiles (id, email, full_name, role, employee_id, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin@peoplepay360.com', 'System Administrator', 'admin', 'aaaa0000-0000-0000-0000-000000000001', true),
    ('10000000-0000-0000-0000-000000000002', 'hr.manager@peoplepay360.com', 'HR Manager', 'hr_manager', 'aaaa0000-0000-0000-0000-000000000002', true),
    ('10000000-0000-0000-0000-000000000003', 'payroll.user@peoplepay360.com', 'HR Payroll User', 'hr_payroll_user', 'aaaa0000-0000-0000-0000-000000000003', true),
    ('10000000-0000-0000-0000-000000000004', 'payroll.manager@peoplepay360.com', 'HR Payroll Manager', 'hr_payroll_manager', 'aaaa0000-0000-0000-0000-000000000004', true),
    ('10000000-0000-0000-0000-000000000005', 'rahul@peoplepay360.com', 'Rahul Sharma', 'employee', 'aaaa1111-1111-1111-1111-111111111111', true),
    ('10000000-0000-0000-0000-000000000006', 'priya@peoplepay360.com', 'Priya Patel', 'employee', 'aaaa2222-2222-2222-2222-222222222222', true)
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role,
    employee_id = EXCLUDED.employee_id,
    full_name = EXCLUDED.full_name;
