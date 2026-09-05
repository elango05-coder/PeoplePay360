-- ==============================================================================
-- PeoplePay360: Seed & Demo Data
-- Migration: seed.sql
-- ==============================================================================

-- 1. WORKING SCHEDULES
INSERT INTO public.working_schedules (id, name, description, weekly_hours, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Standard 40h Work Week', 'Monday to Friday, 9:00 AM to 6:00 PM with 1h break', 40.00, true),
    ('11111111-1111-1111-1111-222222222222', 'Part-Time 20h Work Week', 'Monday to Friday, 9:00 AM to 1:00 PM', 20.00, true)
ON CONFLICT (id) DO NOTHING;

-- Standard schedule days (1=Mon ... 5=Fri)
INSERT INTO public.working_schedule_days (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes)
VALUES
    ('11111111-1111-1111-1111-111111111111', 1, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 2, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 3, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 4, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 5, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 6, false, NULL, NULL, 0),
    ('11111111-1111-1111-1111-111111111111', 0, false, NULL, NULL, 0)
ON CONFLICT DO NOTHING;

-- 2. DEPARTMENTS
INSERT INTO public.departments (id, name, code, is_active)
VALUES
    ('22222222-2222-2222-2222-111111111111', 'Engineering', 'ENG', true),
    ('22222222-2222-2222-2222-222222222222', 'Human Resources', 'HR', true),
    ('22222222-2222-2222-2222-333333333333', 'Finance & Operations', 'FIN', true)
ON CONFLICT (id) DO NOTHING;

-- 3. SALARY STRUCTURES
INSERT INTO public.salary_structures (id, name, code, description, is_active)
VALUES
    ('33333333-3333-3333-3333-111111111111', 'Standard Corporate Structure', 'STD_CORP', 'Base salary + HRA + Special Allowance - PF - PT', true),
    ('33333333-3333-3333-3333-222222222222', 'Executive Structure', 'EXEC_CORP', 'Executive executive allowances with high tier benefits', true)
ON CONFLICT (id) DO NOTHING;

-- 4. SALARY RULES FOR STD_CORP
-- Allowances & Deductions
INSERT INTO public.salary_rules (id, salary_structure_id, name, code, sequence, category, computation_type, value, percentage, formula, is_taxable, is_active)
VALUES
    ('44444444-4444-4444-4444-111111111111', '33333333-3333-3333-3333-111111111111', 'House Rent Allowance (HRA)', 'HRA', 10, 'allowance', 'percentage', 0.00, 40.00, NULL, true, true),
    ('44444444-4444-4444-4444-222222222222', '33333333-3333-3333-3333-111111111111', 'Special Allowance', 'SPECIAL_ALLW', 20, 'allowance', 'fixed', 5000.00, 0.00, NULL, true, true),
    ('44444444-4444-4444-4444-333333333333', '33333333-3333-3333-3333-111111111111', 'Conveyance Allowance', 'CONV', 30, 'allowance', 'fixed', 1600.00, 0.00, NULL, false, true),
    ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-111111111111', 'Provident Fund (PF)', 'PF', 40, 'deduction', 'percentage', 0.00, 12.00, NULL, false, true),
    ('44444444-4444-4444-4444-555555555555', '33333333-3333-3333-3333-111111111111', 'Professional Tax (PT)', 'PROF_TAX', 50, 'deduction', 'fixed', 200.00, 0.00, NULL, false, true)
ON CONFLICT (id) DO NOTHING;

-- 5. TIME OFF TYPES
INSERT INTO public.time_off_types (id, name, code, is_paid, default_allocation, is_active)
VALUES
    ('55555555-5555-5555-5555-111111111111', 'Annual Leave', 'AL', true, 18.0, true),
    ('55555555-5555-5555-5555-222222222222', 'Sick Leave', 'SL', true, 12.0, true),
    ('55555555-5555-5555-5555-333333333333', 'Casual Leave', 'CL', true, 6.0, true),
    ('55555555-5555-5555-5555-444444444444', 'Unpaid Leave (LWP)', 'LWP', false, 0.0, true)
ON CONFLICT (id) DO NOTHING;

-- 6. EMPLOYEES
-- Demo 1: Rahul Sharma (Key historical contract test subject)
-- Demo 2: Priya Patel (Exceptions & unpaid leave scenario)
-- Demo 3: Vikram Singh (Senior Engineer)
-- Demo 4: Ananya Iyer (HR Specialist)
-- Demo 5: Amit Kumar (Finance Analyst)
INSERT INTO public.employees (id, employee_code, first_name, last_name, email, phone, date_of_birth, joining_date, department_id, job_position, employee_type, status, bank_account_number, bank_name, bank_ifsc_or_routing)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'EMP001', 'Rahul', 'Sharma', 'rahul@peoplepay360.com', '+91 9876543210', '1992-05-14', '2025-01-01', '22222222-2222-2222-2222-111111111111', 'Software Engineer', 'full_time', 'active', 'HDFC00012345678', 'HDFC Bank', 'HDFC0001234'),
    ('aaaa2222-2222-2222-2222-222222222222', 'EMP002', 'Priya', 'Patel', 'priya@peoplepay360.com', '+91 9876543211', '1995-08-22', '2025-01-15', '22222222-2222-2222-2222-111111111111', 'Frontend Developer', 'full_time', 'active', 'ICIC00098765432', 'ICICI Bank', 'ICIC0009876'),
    ('aaaa3333-3333-3333-3333-333333333333', 'EMP003', 'Vikram', 'Singh', 'vikram@peoplepay360.com', '+91 9876543212', '1988-11-03', '2024-03-01', '22222222-2222-2222-2222-111111111111', 'Tech Lead', 'full_time', 'active', 'SBIN00045678901', 'State Bank of India', 'SBIN0004567'),
    ('aaaa4444-4444-4444-4444-444444444444', 'EMP004', 'Ananya', 'Iyer', 'ananya@peoplepay360.com', '+91 9876543213', '1994-03-19', '2024-06-01', '22222222-2222-2222-2222-222222222222', 'HR Specialist', 'full_time', 'active', 'UTIB00011223344', 'Axis Bank', 'UTIB0001122'),
    ('aaaa5555-5555-5555-5555-555555555555', 'EMP005', 'Amit', 'Kumar', 'amit@peoplepay360.com', '+91 9876543214', '1991-12-30', '2024-09-15', '22222222-2222-2222-2222-333333333333', 'Finance Analyst', 'full_time', 'active', NULL, NULL, NULL) -- Note: Missing bank details to trigger warning!
ON CONFLICT (id) DO NOTHING;

-- 7. CONTRACTS
-- Demo Scenario 1: Rahul Sharma's Historical Contracts
-- Contract 1: Jan 1, 2025 to Jun 30, 2025 -> Wage: ₹40,000
-- Contract 2: Jul 1, 2025 to Dec 31, 2025 -> Wage: ₹50,000
INSERT INTO public.contracts (id, employee_id, contract_number, start_date, end_date, wage, department_id, job_position, salary_structure_id, working_schedule_id, status)
VALUES
    ('bbbb1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'CNT-2025-001', '2025-01-01', '2025-06-30', 40000.00, '22222222-2222-2222-2222-111111111111', 'Junior Software Engineer', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    ('bbbb1111-1111-1111-1111-222222222222', 'aaaa1111-1111-1111-1111-111111111111', 'CNT-2025-002', '2025-07-01', '2025-12-31', 50000.00, '22222222-2222-2222-2222-111111111111', 'Software Engineer', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    
    -- Priya Patel's Contract
    ('bbbb2222-2222-2222-2222-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'CNT-2025-003', '2025-01-15', '2025-12-31', 45000.00, '22222222-2222-2222-2222-111111111111', 'Frontend Developer', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),

    -- Vikram Singh's Contract
    ('bbbb3333-3333-3333-3333-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'CNT-2024-001', '2024-03-01', NULL, 85000.00, '22222222-2222-2222-2222-111111111111', 'Tech Lead', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),

    -- Ananya Iyer's Contract
    ('bbbb4444-4444-4444-4444-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'CNT-2024-002', '2024-06-01', NULL, 48000.00, '22222222-2222-2222-2222-222222222222', 'HR Specialist', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),

    -- Amit Kumar's Contract
    ('bbbb5555-5555-5555-5555-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'CNT-2024-003', '2024-09-15', NULL, 42000.00, '22222222-2222-2222-2222-333333333333', 'Finance Analyst', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active')
ON CONFLICT (id) DO NOTHING;

-- 8. TIME OFF ALLOCATIONS
INSERT INTO public.time_off_allocations (employee_id, time_off_type_id, allocated_days, used_days, start_date, end_date, status)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-111111111111', 18.0, 2.0, '2025-01-01', '2025-12-31', 'active'),
    ('aaaa1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-222222222222', 12.0, 0.0, '2025-01-01', '2025-12-31', 'active'),
    ('aaaa2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-111111111111', 18.0, 1.0, '2025-01-01', '2025-12-31', 'active'),
    ('aaaa2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-333333333333', 6.0, 2.0, '2025-01-01', '2025-12-31', 'active')
ON CONFLICT DO NOTHING;

-- 9. APPROVED LEAVE REQUESTS (Including Demo 2: Priya's 1 day unpaid leave in June 2025)
INSERT INTO public.time_off_requests (id, employee_id, time_off_type_id, start_date, end_date, number_of_days, reason, status, approved_at)
VALUES
    ('66666666-6666-6666-6666-111111111111', 'aaaa2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-444444444444', '2025-06-10', '2025-06-10', 1.0, 'Personal emergency - Unpaid leave', 'approved', '2025-06-09 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 10. ATTENDANCE RECORDS (With Demo 2 exceptions for Priya in June 2025)
INSERT INTO public.attendance (employee_id, attendance_date, check_in, check_out, worked_hours, expected_hours, status, notes)
VALUES
    -- Rahul regular attendance in June
    ('aaaa1111-1111-1111-1111-111111111111', '2025-06-02', '2025-06-02 09:00:00+00', '2025-06-02 18:00:00+00', 8.00, 8.00, 'present', 'On time'),
    ('aaaa1111-1111-1111-1111-111111111111', '2025-06-03', '2025-06-03 08:55:00+00', '2025-06-03 18:05:00+00', 8.00, 8.00, 'present', 'On time'),

    -- Priya attendance with exceptions in June
    ('aaaa2222-2222-2222-2222-222222222222', '2025-06-02', '2025-06-02 09:05:00+00', '2025-06-02 18:00:00+00', 8.00, 8.00, 'present', 'On time'),
    ('aaaa2222-2222-2222-2222-222222222222', '2025-06-03', '2025-06-03 10:45:00+00', '2025-06-03 18:00:00+00', 6.25, 8.00, 'late', 'Traffic delay'),
    ('aaaa2222-2222-2222-2222-222222222222', '2025-06-05', '2025-06-05 09:10:00+00', NULL, 0.00, 8.00, 'present', 'Forgot to check out')
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

-- 11. DEMO PAYRUNS
-- June 2025 Payrun (Demonstrates Contract 1 for Rahul @ 40,000)
-- July 2025 Payrun (Demonstrates Contract 2 for Rahul @ 50,000)
INSERT INTO public.payruns (id, name, period_start, period_end, payment_date, status)
VALUES
    ('77777777-7777-7777-7777-111111111111', 'June 2025 Payroll', '2025-06-01', '2025-06-30', '2025-06-30', 'draft'),
    ('77777777-7777-7777-7777-222222222222', 'July 2025 Payroll', '2025-07-01', '2025-07-31', '2025-07-31', 'draft')
ON CONFLICT (id) DO NOTHING;

-- Add Rahul and Priya to June 2025 payrun
INSERT INTO public.payrun_employees (payrun_id, employee_id, status)
VALUES
    ('77777777-7777-7777-7777-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'pending'),
    ('77777777-7777-7777-7777-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'pending'),
    ('77777777-7777-7777-7777-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'pending'),

    -- Add Rahul to July 2025 payrun
    ('77777777-7777-7777-7777-222222222222', 'aaaa1111-1111-1111-1111-111111111111', 'pending')
ON CONFLICT DO NOTHING;
