-- ==============================================================================
-- PeoplePay360: HR & Payroll Database Schema
-- Migration: 20250101000000_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES (Users linked to auth.users with roles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin')),
    employee_id UUID, -- Will reference public.employees(id) ON DELETE SET NULL
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. DEPARTMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    manager_id UUID, -- References employees(id)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. EMPLOYEES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    date_of_birth DATE,
    joining_date DATE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    job_position TEXT NOT NULL,
    employee_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employee_type IN ('full_time', 'part_time', 'contractor', 'intern')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    bank_account_number TEXT,
    bank_name TEXT,
    bank_ifsc_or_routing TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add circular foreign keys now that tables exist
ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_employee
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.departments
    ADD CONSTRAINT fk_departments_manager
    FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- ==============================================================================
-- 4. WORKING SCHEDULES & SCHEDULE DAYS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.working_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    weekly_hours NUMERIC(5,2) NOT NULL DEFAULT 40.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.working_schedule_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.working_schedules(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday ... 6=Saturday
    is_working_day BOOLEAN NOT NULL DEFAULT true,
    start_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
    end_time TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
    break_minutes INT NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_schedule_day UNIQUE (schedule_id, day_of_week)
);

-- ==============================================================================
-- 5. SALARY STRUCTURES & SALARY RULES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salary_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    sequence INT NOT NULL DEFAULT 10,
    category TEXT NOT NULL CHECK (category IN ('basic', 'allowance', 'deduction', 'employer_contribution', 'other')),
    computation_type TEXT NOT NULL CHECK (computation_type IN ('fixed', 'percentage', 'formula')),
    value NUMERIC(12,2) DEFAULT 0.00,
    percentage NUMERIC(5,2) DEFAULT 0.00,
    formula TEXT,
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_salary_rule_code_structure UNIQUE (salary_structure_id, code)
);

-- ==============================================================================
-- 6. CONTRACTS (With Historical Support)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    contract_number TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    wage NUMERIC(12,2) NOT NULL CHECK (wage >= 0),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_position TEXT NOT NULL,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE RESTRICT,
    working_schedule_id UUID REFERENCES public.working_schedules(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_contract_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ==============================================================================
-- 7. TIME OFF (Types, Allocations, Requests)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.time_off_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    default_allocation NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.time_off_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES public.time_off_types(id) ON DELETE RESTRICT,
    allocated_days NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    used_days NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    remaining_days NUMERIC(5,2) GENERATED ALWAYS AS (allocated_days - used_days) STORED,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_allocation_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES public.time_off_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    number_of_days NUMERIC(4,1) NOT NULL CHECK (number_of_days > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'refused', 'cancelled')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_request_dates CHECK (end_date >= start_date)
);

-- ==============================================================================
-- 8. ATTENDANCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    worked_hours NUMERIC(5,2) DEFAULT 0.00,
    expected_hours NUMERIC(5,2) DEFAULT 8.00,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'overtime', 'leave')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, attendance_date)
);

-- ==============================================================================
-- 9. PAYRUNS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payruns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'computed', 'validated', 'paid')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    computed_at TIMESTAMPTZ,
    validated_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payrun_dates CHECK (period_end >= period_start)
);

-- ==============================================================================
-- 10. PAYRUN EMPLOYEES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payrun_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payrun_id UUID NOT NULL REFERENCES public.payruns(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    salary_structure_id UUID REFERENCES public.salary_structures(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'computed', 'validated', 'error')),
    warning_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    validation_messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payrun_employee UNIQUE (payrun_id, employee_id)
);

-- ==============================================================================
-- 11. PAYSLIPS & PAYSLIP LINES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payrun_id UUID NOT NULL REFERENCES public.payruns(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_allowances NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'paid', 'sent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payslip_employee_period UNIQUE (payrun_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.payslip_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
    salary_rule_id UUID REFERENCES public.salary_rules(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('basic', 'allowance', 'deduction', 'employer_contribution', 'other')),
    sequence INT NOT NULL DEFAULT 10,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_contracts_employee_dates ON public.contracts(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_emp_dates ON public.time_off_requests(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payslips_payrun ON public.payslips(payrun_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_lines_payslip ON public.payslip_lines(payslip_id);
CREATE INDEX IF NOT EXISTS idx_salary_rules_structure_seq ON public.salary_rules(salary_structure_id, sequence ASC);
