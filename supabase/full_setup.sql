-- ==============================================================================
-- PeoplePay360: Complete Setup Script (Schema + Functions + RLS + Triggers + Seed)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/csavmmhlmglqugbiafdd/sql/new)
-- ==============================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- PART 1: CORE TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin')),
    employee_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    manager_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_employee') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_manager') THEN
        ALTER TABLE public.departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

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
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_working_day BOOLEAN NOT NULL DEFAULT true,
    start_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
    end_time TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
    break_minutes INT NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_schedule_day UNIQUE (schedule_id, day_of_week)
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_employee_dates ON public.contracts(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_emp_dates ON public.time_off_requests(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payslips_payrun ON public.payslips(payrun_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_lines_payslip ON public.payslip_lines(payslip_id);
CREATE INDEX IF NOT EXISTS idx_salary_rules_structure_seq ON public.salary_rules(salary_structure_id, sequence ASC);

-- ==============================================================================
-- PART 2: AUTH TRIGGER & USER CREATION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, employee_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'employee_id' IS NOT NULL AND NEW.raw_user_meta_data->>'employee_id' != '' 
      THEN (NEW.raw_user_meta_data->>'employee_id')::uuid 
      ELSE NULL 
    END,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      employee_id = EXCLUDED.employee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- PART 3: RPC FUNCTIONS & BUSINESS LOGIC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT employee_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_applicable_contract(
    p_employee_id UUID,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    contract_number TEXT,
    start_date DATE,
    end_date DATE,
    wage NUMERIC,
    department_id UUID,
    job_position TEXT,
    salary_structure_id UUID,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.employee_id,
        c.contract_number,
        c.start_date,
        c.end_date,
        c.wage,
        c.department_id,
        c.job_position,
        c.salary_structure_id,
        c.status
    FROM public.contracts c
    WHERE c.employee_id = p_employee_id
      AND c.start_date <= p_period_end
      AND (c.end_date IS NULL OR c.end_date >= p_period_start)
      AND c.status IN ('active', 'draft')
    ORDER BY c.start_date DESC
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_time_off(
    p_request_id UUID,
    p_approved_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_alloc RECORD;
    v_type RECORD;
BEGIN
    SELECT * INTO v_req FROM public.time_off_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REQUEST_NOT_FOUND', 'message', 'Time off request not found.');
    END IF;

    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Only pending requests can be approved.');
    END IF;

    SELECT * INTO v_type FROM public.time_off_types WHERE id = v_req.time_off_type_id;

    IF v_type.is_paid THEN
        SELECT * INTO v_alloc 
        FROM public.time_off_allocations
        WHERE employee_id = v_req.employee_id 
          AND time_off_type_id = v_req.time_off_type_id
          AND status = 'active'
          AND v_req.start_date BETWEEN start_date AND end_date
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'NO_ALLOCATION', 'message', 'No active leave allocation found for this period.');
        END IF;

        IF v_alloc.remaining_days < v_req.number_of_days THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_LEAVE_BALANCE', 'message', 'Insufficient remaining leave days. Available: ' || v_alloc.remaining_days || ', Requested: ' || v_req.number_of_days);
        END IF;

        UPDATE public.time_off_allocations
        SET used_days = used_days + v_req.number_of_days,
            updated_at = NOW()
        WHERE id = v_alloc.id;
    END IF;

    UPDATE public.time_off_requests
    SET status = 'approved',
        approved_by = p_approved_by,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Time off approved successfully.',
        'request_id', p_request_id,
        'number_of_days', v_req.number_of_days
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_employee_payroll(
    p_payrun_id UUID,
    p_employee_id UUID,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee RECORD;
    v_contract RECORD;
    v_structure RECORD;
    v_rule RECORD;
    v_payslip_id UUID;
    v_basic NUMERIC := 0.00;
    v_total_allowances NUMERIC := 0.00;
    v_gross NUMERIC := 0.00;
    v_total_deductions NUMERIC := 0.00;
    v_net NUMERIC := 0.00;
    v_amount NUMERIC := 0.00;
    v_unpaid_days NUMERIC := 0.00;
    v_unpaid_deduction NUMERIC := 0.00;
    v_late_count INT := 0;
    v_absent_count INT := 0;
    v_missing_checkout_count INT := 0;
    v_warnings JSONB := '[]'::jsonb;
    v_errors JSONB := '[]'::jsonb;
    v_daily_rate NUMERIC := 0.00;
    v_days_in_month INT := 30;
BEGIN
    SELECT * INTO v_employee FROM public.employees WHERE id = p_employee_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EMPLOYEE_NOT_FOUND', 'message', 'Employee does not exist.');
    END IF;

    IF v_employee.status != 'active' THEN
        v_warnings := v_warnings || jsonb_build_object('code', 'INACTIVE_EMPLOYEE', 'message', 'Employee is marked inactive or terminated.');
    END IF;

    IF v_employee.bank_account_number IS NULL OR v_employee.bank_account_number = '' THEN
        v_warnings := v_warnings || jsonb_build_object('code', 'MISSING_BANK_DETAILS', 'message', 'Employee has no bank account details.');
    END IF;

    SELECT * INTO v_contract 
    FROM public.get_applicable_contract(p_employee_id, p_period_start, p_period_end);

    IF v_contract.id IS NULL THEN
        v_errors := v_errors || jsonb_build_object('code', 'NO_APPLICABLE_CONTRACT', 'message', 'No valid contract found for the period ' || p_period_start || ' to ' || p_period_end);
        
        UPDATE public.payrun_employees
        SET status = 'error',
            error_count = jsonb_array_length(v_errors),
            warning_count = jsonb_array_length(v_warnings),
            validation_messages = v_errors || v_warnings
        WHERE payrun_id = p_payrun_id AND employee_id = p_employee_id;

        RETURN jsonb_build_object('success', false, 'errors', v_errors, 'warnings', v_warnings);
    END IF;

    SELECT * INTO v_structure FROM public.salary_structures WHERE id = v_contract.salary_structure_id;
    IF NOT FOUND OR NOT v_structure.is_active THEN
        v_errors := v_errors || jsonb_build_object('code', 'NO_SALARY_STRUCTURE', 'message', 'Contract assigned salary structure is missing or inactive.');
        
        UPDATE public.payrun_employees
        SET status = 'error',
            contract_id = v_contract.id,
            error_count = jsonb_array_length(v_errors),
            warning_count = jsonb_array_length(v_warnings),
            validation_messages = v_errors || v_warnings
        WHERE payrun_id = p_payrun_id AND employee_id = p_employee_id;

        RETURN jsonb_build_object('success', false, 'errors', v_errors, 'warnings', v_warnings);
    END IF;

    SELECT 
        COUNT(*) FILTER (WHERE status = 'late'),
        COUNT(*) FILTER (WHERE status = 'absent'),
        COUNT(*) FILTER (WHERE check_in IS NOT NULL AND check_out IS NULL)
    INTO v_late_count, v_absent_count, v_missing_checkout_count
    FROM public.attendance
    WHERE employee_id = p_employee_id 
      AND attendance_date BETWEEN p_period_start AND p_period_end;

    IF v_missing_checkout_count > 0 THEN
        v_warnings := v_warnings || jsonb_build_object('code', 'MISSING_CHECKOUT', 'message', v_missing_checkout_count || ' attendance record(s) have missing check-out.');
    END IF;
    IF v_late_count > 0 THEN
        v_warnings := v_warnings || jsonb_build_object('code', 'LATE_ATTENDANCE', 'message', v_late_count || ' late arrival record(s) recorded.');
    END IF;

    SELECT COALESCE(SUM(r.number_of_days), 0)
    INTO v_unpaid_days
    FROM public.time_off_requests r
    JOIN public.time_off_types t ON r.time_off_type_id = t.id
    WHERE r.employee_id = p_employee_id
      AND r.status = 'approved'
      AND t.is_paid = false
      AND r.start_date <= p_period_end
      AND r.end_date >= p_period_start;

    v_basic := v_contract.wage;
    v_days_in_month := (p_period_end - p_period_start + 1);
    IF v_days_in_month <= 0 THEN v_days_in_month := 30; END IF;
    v_daily_rate := ROUND(v_basic / v_days_in_month, 2);

    DELETE FROM public.payslips WHERE payrun_id = p_payrun_id AND employee_id = p_employee_id;

    INSERT INTO public.payslips (
        payrun_id, employee_id, contract_id, salary_structure_id,
        period_start, period_end, basic_salary, total_allowances,
        gross_salary, total_deductions, net_salary, status
    ) VALUES (
        p_payrun_id, p_employee_id, v_contract.id, v_structure.id,
        p_period_start, p_period_end, v_basic, 0, 0, 0, 0, 'draft'
    ) RETURNING id INTO v_payslip_id;

    INSERT INTO public.payslip_lines (payslip_id, salary_rule_id, code, name, category, sequence, amount)
    VALUES (v_payslip_id, NULL, 'BASIC', 'Basic Salary', 'basic', 1, v_basic);

    FOR v_rule IN 
        SELECT * FROM public.salary_rules 
        WHERE salary_structure_id = v_structure.id AND is_active = true
        ORDER BY sequence ASC
    LOOP
        v_amount := 0.00;
        IF v_rule.computation_type = 'fixed' THEN
            v_amount := COALESCE(v_rule.value, 0.00);
        ELSIF v_rule.computation_type = 'percentage' THEN
            v_amount := ROUND(v_basic * (COALESCE(v_rule.percentage, 0.00) / 100.0), 2);
        ELSIF v_rule.computation_type = 'formula' THEN
            IF v_rule.formula = 'BASIC * 0.40' THEN
                v_amount := ROUND(v_basic * 0.40, 2);
            ELSIF v_rule.formula = 'BASIC * 0.50' THEN
                v_amount := ROUND(v_basic * 0.50, 2);
            ELSIF v_rule.formula = 'BASIC * 0.12' THEN
                v_amount := ROUND(v_basic * 0.12, 2);
            ELSE
                v_amount := COALESCE(v_rule.value, 0.00);
            END IF;
        END IF;

        IF v_rule.category = 'allowance' THEN
            v_total_allowances := v_total_allowances + v_amount;
        ELSIF v_rule.category = 'deduction' THEN
            v_total_deductions := v_total_deductions + v_amount;
        END IF;

        INSERT INTO public.payslip_lines (payslip_id, salary_rule_id, code, name, category, sequence, amount)
        VALUES (v_payslip_id, v_rule.id, v_rule.code, v_rule.name, v_rule.category, v_rule.sequence, v_amount);
    END LOOP;

    IF v_unpaid_days > 0 THEN
        v_unpaid_deduction := ROUND(v_unpaid_days * v_daily_rate, 2);
        v_total_deductions := v_total_deductions + v_unpaid_deduction;

        INSERT INTO public.payslip_lines (payslip_id, salary_rule_id, code, name, category, sequence, amount)
        VALUES (v_payslip_id, NULL, 'UNPAID_LEAVE', 'Unpaid Leave Deduction (' || v_unpaid_days || ' days)', 'deduction', 90, v_unpaid_deduction);

        v_warnings := v_warnings || jsonb_build_object('code', 'UNPAID_LEAVE_DEDUCTION', 'message', v_unpaid_days || ' unpaid leave day(s) deducted: ₹' || v_unpaid_deduction);
    END IF;

    v_gross := v_basic + v_total_allowances;
    v_net := v_gross - v_total_deductions;

    UPDATE public.payslips
    SET total_allowances = v_total_allowances,
        gross_salary = v_gross,
        total_deductions = v_total_deductions,
        net_salary = v_net,
        updated_at = NOW()
    WHERE id = v_payslip_id;

    UPDATE public.payrun_employees
    SET status = 'computed',
        contract_id = v_contract.id,
        salary_structure_id = v_structure.id,
        warning_count = jsonb_array_length(v_warnings),
        error_count = jsonb_array_length(v_errors),
        validation_messages = v_errors || v_warnings
    WHERE payrun_id = p_payrun_id AND employee_id = p_employee_id;

    RETURN jsonb_build_object(
        'success', true,
        'payslip_id', v_payslip_id,
        'contract_id', v_contract.id,
        'contract_wage', v_contract.wage,
        'basic_salary', v_basic,
        'gross_salary', v_gross,
        'deductions', v_total_deductions,
        'net_salary', v_net,
        'warnings', v_warnings,
        'errors', v_errors
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_payrun(p_payrun_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_emp RECORD;
    v_computed_count INT := 0;
    v_error_count INT := 0;
    v_res JSONB;
BEGIN
    SELECT * INTO v_payrun FROM public.payruns WHERE id = p_payrun_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYRUN_NOT_FOUND', 'message', 'Payrun not found.');
    END IF;

    IF v_payrun.status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYRUN_ALREADY_PAID', 'message', 'Paid payruns cannot be recomputed.');
    END IF;

    FOR v_emp IN SELECT employee_id FROM public.payrun_employees WHERE payrun_id = p_payrun_id
    LOOP
        v_res := public.compute_employee_payroll(p_payrun_id, v_emp.employee_id, v_payrun.period_start, v_payrun.period_end);
        IF (v_res->>'success')::boolean = true THEN
            v_computed_count := v_computed_count + 1;
        ELSE
            v_error_count := v_error_count + 1;
        END IF;
    END LOOP;

    UPDATE public.payruns
    SET status = 'computed',
        computed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payrun_id;

    RETURN jsonb_build_object(
        'success', true,
        'payrun_id', p_payrun_id,
        'computed_count', v_computed_count,
        'error_count', v_error_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_payrun(p_payrun_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_blocking_errors INT;
    v_warning_total INT;
BEGIN
    SELECT * INTO v_payrun FROM public.payruns WHERE id = p_payrun_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYRUN_NOT_FOUND', 'message', 'Payrun not found.');
    END IF;

    IF v_payrun.status != 'computed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STAGE', 'message', 'Payrun must be computed before validation.');
    END IF;

    SELECT COALESCE(SUM(error_count), 0), COALESCE(SUM(warning_count), 0)
    INTO v_blocking_errors, v_warning_total
    FROM public.payrun_employees
    WHERE payrun_id = p_payrun_id;

    IF v_blocking_errors > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'PAYRUN_VALIDATION_FAILED',
            'message', 'Payrun cannot be validated due to ' || v_blocking_errors || ' blocking error(s).',
            'error_count', v_blocking_errors,
            'warning_count', v_warning_total
        );
    END IF;

    UPDATE public.payruns
    SET status = 'validated',
        validated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payrun_id;

    UPDATE public.payslips
    SET status = 'validated',
        updated_at = NOW()
    WHERE payrun_id = p_payrun_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payrun validated successfully.',
        'warning_count', v_warning_total
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_payrun_paid(p_payrun_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.payruns WHERE id = p_payrun_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYRUN_NOT_FOUND', 'message', 'Payrun not found.');
    END IF;

    IF v_payrun.status != 'validated' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYRUN_NOT_VALIDATED', 'message', 'Payrun must be validated before marking as paid.');
    END IF;

    UPDATE public.payruns
    SET status = 'paid',
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payrun_id;

    UPDATE public.payslips
    SET status = 'paid',
        updated_at = NOW()
    WHERE payrun_id = p_payrun_id;

    RETURN jsonb_build_object('success', true, 'message', 'Payrun marked as paid and payslips finalized.');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_emp INT;
    v_active_emp INT;
    v_pending_leave INT;
    v_emp_on_leave_today INT;
    v_exceptions_today INT;
    v_pending_validation_count INT;
    v_latest_payrun RECORD;
    v_gross NUMERIC := 0.00;
    v_deductions NUMERIC := 0.00;
    v_net NUMERIC := 0.00;
BEGIN
    SELECT COUNT(*) INTO v_total_emp FROM public.employees;
    SELECT COUNT(*) INTO v_active_emp FROM public.employees WHERE status = 'active';
    SELECT COUNT(*) INTO v_pending_leave FROM public.time_off_requests WHERE status = 'pending';
    
    SELECT COUNT(DISTINCT employee_id) INTO v_emp_on_leave_today
    FROM public.time_off_requests
    WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date;

    SELECT COUNT(*) INTO v_exceptions_today
    FROM public.attendance
    WHERE attendance_date = CURRENT_DATE AND (status IN ('absent', 'late') OR (check_in IS NOT NULL AND check_out IS NULL));

    SELECT COUNT(*) INTO v_pending_validation_count
    FROM public.payruns WHERE status = 'computed';

    SELECT id, name, period_start, period_end, status, payment_date
    INTO v_latest_payrun
    FROM public.payruns
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_latest_payrun.id IS NOT NULL THEN
        SELECT 
            COALESCE(SUM(gross_salary), 0),
            COALESCE(SUM(total_deductions), 0),
            COALESCE(SUM(net_salary), 0)
        INTO v_gross, v_deductions, v_net
        FROM public.payslips
        WHERE payrun_id = v_latest_payrun.id;
    END IF;

    RETURN jsonb_build_object(
        'total_employees', v_total_emp,
        'active_employees', v_active_emp,
        'pending_leave_requests', v_pending_leave,
        'employees_on_leave_today', v_emp_on_leave_today,
        'attendance_exceptions_today', v_exceptions_today,
        'pending_payroll_validations', v_pending_validation_count,
        'current_payrun', CASE 
            WHEN v_latest_payrun.id IS NOT NULL THEN jsonb_build_object(
                'id', v_latest_payrun.id,
                'name', v_latest_payrun.name,
                'period_start', v_latest_payrun.period_start,
                'period_end', v_latest_payrun.period_end,
                'status', v_latest_payrun.status,
                'payment_date', v_latest_payrun.payment_date,
                'total_gross', v_gross,
                'total_deductions', v_deductions,
                'total_net', v_net
            )
            ELSE NULL
        END
    );
END;
$$;

-- ==============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payruns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrun_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_lines ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by owner, HR, and Admins" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner, HR, and Admins"
ON public.profiles FOR SELECT
USING (id = auth.uid() OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Profiles updateable by owner (own info) or Admin" ON public.profiles;
CREATE POLICY "Profiles updateable by owner (own info) or Admin"
ON public.profiles FOR UPDATE
USING (id = auth.uid() OR public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin can insert/delete profiles" ON public.profiles;
CREATE POLICY "Admin can insert/delete profiles"
ON public.profiles FOR ALL
USING (public.auth_user_role() = 'admin');

-- Departments Policies
DROP POLICY IF EXISTS "Departments are viewable by all authenticated users" ON public.departments;
CREATE POLICY "Departments are viewable by all authenticated users"
ON public.departments FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Departments manageable by HR and Admin" ON public.departments;
CREATE POLICY "Departments manageable by HR and Admin"
ON public.departments FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- Employees Policies
DROP POLICY IF EXISTS "Employees can view own record; HR/Admin can view all" ON public.employees;
CREATE POLICY "Employees can view own record; HR/Admin can view all"
ON public.employees FOR SELECT
USING (id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "HR and Admin can insert employees" ON public.employees;
CREATE POLICY "HR and Admin can insert employees"
ON public.employees FOR INSERT
WITH CHECK (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "HR and Admin can update employees" ON public.employees;
CREATE POLICY "HR and Admin can update employees"
ON public.employees FOR UPDATE
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Admin can delete employees" ON public.employees;
CREATE POLICY "Admin can delete employees"
ON public.employees FOR DELETE
USING (public.auth_user_role() = 'admin');

-- Working Schedules Policies
DROP POLICY IF EXISTS "Schedules viewable by all authenticated users" ON public.working_schedules;
CREATE POLICY "Schedules viewable by all authenticated users"
ON public.working_schedules FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Schedule days viewable by all authenticated users" ON public.working_schedule_days;
CREATE POLICY "Schedule days viewable by all authenticated users"
ON public.working_schedule_days FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Schedules manageable by HR and Admin" ON public.working_schedules;
CREATE POLICY "Schedules manageable by HR and Admin"
ON public.working_schedules FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Schedule days manageable by HR and Admin" ON public.working_schedule_days;
CREATE POLICY "Schedule days manageable by HR and Admin"
ON public.working_schedule_days FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- Contracts Policies
DROP POLICY IF EXISTS "Contracts viewable by employee (own) or HR/Payroll/Admin" ON public.contracts;
CREATE POLICY "Contracts viewable by employee (own) or HR/Payroll/Admin"
ON public.contracts FOR SELECT
USING (employee_id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Contracts manageable by HR and Admin" ON public.contracts;
CREATE POLICY "Contracts manageable by HR and Admin"
ON public.contracts FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- Time Off Policies
DROP POLICY IF EXISTS "Time off types viewable by all authenticated" ON public.time_off_types;
CREATE POLICY "Time off types viewable by all authenticated"
ON public.time_off_types FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Time off types manageable by HR/Admin" ON public.time_off_types;
CREATE POLICY "Time off types manageable by HR/Admin"
ON public.time_off_types FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Time off allocations viewable by employee (own) or HR/Admin" ON public.time_off_allocations;
CREATE POLICY "Time off allocations viewable by employee (own) or HR/Admin"
ON public.time_off_allocations FOR SELECT
USING (employee_id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Time off allocations manageable by HR/Admin" ON public.time_off_allocations;
CREATE POLICY "Time off allocations manageable by HR/Admin"
ON public.time_off_allocations FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Time off requests viewable by owner or HR/Admin" ON public.time_off_requests;
CREATE POLICY "Time off requests viewable by owner or HR/Admin"
ON public.time_off_requests FOR SELECT
USING (employee_id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Employees can create their own time off requests" ON public.time_off_requests;
CREATE POLICY "Employees can create their own time off requests"
ON public.time_off_requests FOR INSERT
WITH CHECK (employee_id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager'));

DROP POLICY IF EXISTS "Time off requests updateable by HR/Admin or owner" ON public.time_off_requests;
CREATE POLICY "Time off requests updateable by HR/Admin or owner"
ON public.time_off_requests FOR UPDATE
USING ((employee_id = public.auth_employee_id() AND status = 'pending') OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- Attendance Policies
DROP POLICY IF EXISTS "Attendance viewable by employee (own) or HR/Payroll/Admin" ON public.attendance;
CREATE POLICY "Attendance viewable by employee (own) or HR/Payroll/Admin"
ON public.attendance FOR SELECT
USING (employee_id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Employees can clock in/out for themselves" ON public.attendance;
CREATE POLICY "Employees can clock in/out for themselves"
ON public.attendance FOR INSERT
WITH CHECK (employee_id = public.auth_employee_id() OR public.auth_user_role() IN ('admin', 'hr_manager'));

DROP POLICY IF EXISTS "Attendance updateable by employee or HR/Admin" ON public.attendance;
CREATE POLICY "Attendance updateable by employee or HR/Admin"
ON public.attendance FOR UPDATE
USING ((employee_id = public.auth_employee_id() AND attendance_date = CURRENT_DATE) OR public.auth_user_role() IN ('admin', 'hr_manager'));

-- Salary Structure & Rules Policies
DROP POLICY IF EXISTS "Salary structures viewable by HR/Payroll/Admin" ON public.salary_structures;
CREATE POLICY "Salary structures viewable by HR/Payroll/Admin"
ON public.salary_structures FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Salary structures manageable by HR Payroll Manager and Admin" ON public.salary_structures;
CREATE POLICY "Salary structures manageable by HR Payroll Manager and Admin"
ON public.salary_structures FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Salary rules viewable by HR/Payroll/Admin" ON public.salary_rules;
CREATE POLICY "Salary rules viewable by HR/Payroll/Admin"
ON public.salary_rules FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Salary rules manageable by HR Payroll Manager and Admin" ON public.salary_rules;
CREATE POLICY "Salary rules manageable by HR Payroll Manager and Admin"
ON public.salary_rules FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

-- Payruns Policies
DROP POLICY IF EXISTS "Payruns viewable by Payroll users and Admin" ON public.payruns;
CREATE POLICY "Payruns viewable by Payroll users and Admin"
ON public.payruns FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Payruns creatable/updateable by Payroll users and managers" ON public.payruns;
CREATE POLICY "Payruns creatable/updateable by Payroll users and managers"
ON public.payruns FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Payrun employees viewable by Payroll users and managers" ON public.payrun_employees;
CREATE POLICY "Payrun employees viewable by Payroll users and managers"
ON public.payrun_employees FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Payrun employees manageable by Payroll users and managers" ON public.payrun_employees;
CREATE POLICY "Payrun employees manageable by Payroll users and managers"
ON public.payrun_employees FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

-- Payslips Policies
DROP POLICY IF EXISTS "Payslips viewable by owner (validated/paid) or Payroll/Admin" ON public.payslips;
CREATE POLICY "Payslips viewable by owner (validated/paid) or Payroll/Admin"
ON public.payslips FOR SELECT
USING ((employee_id = public.auth_employee_id() AND status IN ('validated', 'paid', 'sent')) OR public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Payslips manageable by Payroll Manager and Admin" ON public.payslips;
CREATE POLICY "Payslips manageable by Payroll Manager and Admin"
ON public.payslips FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

DROP POLICY IF EXISTS "Payslip lines viewable by owner or Payroll/Admin" ON public.payslip_lines;
CREATE POLICY "Payslip lines viewable by owner or Payroll/Admin"
ON public.payslip_lines FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.payslips p
        WHERE p.id = payslip_lines.payslip_id
          AND ((p.employee_id = public.auth_employee_id() AND p.status IN ('validated', 'paid', 'sent')) OR public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'))
    )
);

DROP POLICY IF EXISTS "Payslip lines manageable by Payroll Manager and Admin" ON public.payslip_lines;
CREATE POLICY "Payslip lines manageable by Payroll Manager and Admin"
ON public.payslip_lines FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

-- ==============================================================================
-- PART 5: SEED DATA
-- ==============================================================================

-- 1. Schedules
INSERT INTO public.working_schedules (id, name, description, weekly_hours, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Standard 40h Work Week', 'Monday to Friday, 9:00 AM to 6:00 PM with 1h break', 40.00, true),
    ('11111111-1111-1111-1111-222222222222', 'Part-Time 20h Work Week', 'Monday to Friday, 9:00 AM to 1:00 PM', 20.00, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.working_schedule_days (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes)
VALUES
    ('11111111-1111-1111-1111-111111111111', 1, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 2, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 3, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 4, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 5, true, '09:00:00', '18:00:00', 60),
    ('11111111-1111-1111-1111-111111111111', 6, false, NULL, NULL, 0),
    ('11111111-1111-1111-1111-111111111111', 0, false, NULL, NULL, 0)
ON CONFLICT (schedule_id, day_of_week) DO NOTHING;

-- 2. Departments
INSERT INTO public.departments (id, name, code, is_active)
VALUES
    ('22222222-2222-2222-2222-111111111111', 'Engineering', 'ENG', true),
    ('22222222-2222-2222-2222-222222222222', 'Human Resources', 'HR', true),
    ('22222222-2222-2222-2222-333333333333', 'Finance & Operations', 'FIN', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Salary Structures
INSERT INTO public.salary_structures (id, name, code, description, is_active)
VALUES
    ('33333333-3333-3333-3333-111111111111', 'Standard Corporate Structure', 'STD_CORP', 'Base salary + HRA + Special Allowance - PF - PT', true),
    ('33333333-3333-3333-3333-222222222222', 'Executive Structure', 'EXEC_CORP', 'Executive executive allowances with high tier benefits', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Rules for STD_CORP
INSERT INTO public.salary_rules (id, salary_structure_id, name, code, sequence, category, computation_type, value, percentage, formula, is_taxable, is_active)
VALUES
    ('44444444-4444-4444-4444-111111111111', '33333333-3333-3333-3333-111111111111', 'House Rent Allowance (HRA)', 'HRA', 10, 'allowance', 'percentage', 0.00, 40.00, NULL, true, true),
    ('44444444-4444-4444-4444-222222222222', '33333333-3333-3333-3333-111111111111', 'Special Allowance', 'SPECIAL_ALLW', 20, 'allowance', 'fixed', 5000.00, 0.00, NULL, true, true),
    ('44444444-4444-4444-4444-333333333333', '33333333-3333-3333-3333-111111111111', 'Conveyance Allowance', 'CONV', 30, 'allowance', 'fixed', 1600.00, 0.00, NULL, false, true),
    ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-111111111111', 'Provident Fund (PF)', 'PF', 40, 'deduction', 'percentage', 0.00, 12.00, NULL, false, true),
    ('44444444-4444-4444-4444-555555555555', '33333333-3333-3333-3333-111111111111', 'Professional Tax (PT)', 'PROF_TAX', 50, 'deduction', 'fixed', 200.00, 0.00, NULL, false, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Time Off Types
INSERT INTO public.time_off_types (id, name, code, is_paid, default_allocation, is_active)
VALUES
    ('55555555-5555-5555-5555-111111111111', 'Annual Leave', 'AL', true, 18.0, true),
    ('55555555-5555-5555-5555-222222222222', 'Sick Leave', 'SL', true, 12.0, true),
    ('55555555-5555-5555-5555-333333333333', 'Casual Leave', 'CL', true, 6.0, true),
    ('55555555-5555-5555-5555-444444444444', 'Unpaid Leave (LWP)', 'LWP', false, 0.0, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Employees (Rahul, Priya, Vikram, Ananya, Amit)
INSERT INTO public.employees (id, employee_code, first_name, last_name, email, phone, date_of_birth, joining_date, department_id, job_position, employee_type, status, bank_account_number, bank_name, bank_ifsc_or_routing)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'EMP001', 'Rahul', 'Sharma', 'rahul@peoplepay360.com', '+91 9876543210', '1992-05-14', '2025-01-01', '22222222-2222-2222-2222-111111111111', 'Software Engineer', 'full_time', 'active', 'HDFC00012345678', 'HDFC Bank', 'HDFC0001234'),
    ('aaaa2222-2222-2222-2222-222222222222', 'EMP002', 'Priya', 'Patel', 'priya@peoplepay360.com', '+91 9876543211', '1995-08-22', '2025-01-15', '22222222-2222-2222-2222-111111111111', 'Frontend Developer', 'full_time', 'active', 'ICIC00098765432', 'ICICI Bank', 'ICIC0009876'),
    ('aaaa3333-3333-3333-3333-333333333333', 'EMP003', 'Vikram', 'Singh', 'vikram@peoplepay360.com', '+91 9876543212', '1988-11-03', '2024-03-01', '22222222-2222-2222-2222-111111111111', 'Tech Lead', 'full_time', 'active', 'SBIN00045678901', 'State Bank of India', 'SBIN0004567'),
    ('aaaa4444-4444-4444-4444-444444444444', 'EMP004', 'Ananya', 'Iyer', 'ananya@peoplepay360.com', '+91 9876543213', '1994-03-19', '2024-06-01', '22222222-2222-2222-2222-222222222222', 'HR Specialist', 'full_time', 'active', 'UTIB00011223344', 'Axis Bank', 'UTIB0001122'),
    ('aaaa5555-5555-5555-5555-555555555555', 'EMP005', 'Amit', 'Kumar', 'amit@peoplepay360.com', '+91 9876543214', '1991-12-30', '2024-09-15', '22222222-2222-2222-2222-333333333333', 'Finance Analyst', 'full_time', 'active', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 7. Contracts (Rahul Contract 1 & 2 for June / July historical demo)
INSERT INTO public.contracts (id, employee_id, contract_number, start_date, end_date, wage, department_id, job_position, salary_structure_id, working_schedule_id, status)
VALUES
    ('bbbb1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'CNT-2025-001', '2025-01-01', '2025-06-30', 40000.00, '22222222-2222-2222-2222-111111111111', 'Junior Software Engineer', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    ('bbbb1111-1111-1111-1111-222222222222', 'aaaa1111-1111-1111-1111-111111111111', 'CNT-2025-002', '2025-07-01', '2025-12-31', 50000.00, '22222222-2222-2222-2222-111111111111', 'Software Engineer', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    ('bbbb2222-2222-2222-2222-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'CNT-2025-003', '2025-01-15', '2025-12-31', 45000.00, '22222222-2222-2222-2222-111111111111', 'Frontend Developer', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    ('bbbb3333-3333-3333-3333-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'CNT-2024-001', '2024-03-01', NULL, 85000.00, '22222222-2222-2222-2222-111111111111', 'Tech Lead', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    ('bbbb4444-4444-4444-4444-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'CNT-2024-002', '2024-06-01', NULL, 48000.00, '22222222-2222-2222-2222-222222222222', 'HR Specialist', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active'),
    ('bbbb5555-5555-5555-5555-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'CNT-2024-003', '2024-09-15', NULL, 42000.00, '22222222-2222-2222-2222-333333333333', 'Finance Analyst', '33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'active')
ON CONFLICT (id) DO NOTHING;

-- 8. Allocations
INSERT INTO public.time_off_allocations (employee_id, time_off_type_id, allocated_days, used_days, start_date, end_date, status)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-111111111111', 18.0, 2.0, '2025-01-01', '2025-12-31', 'active'),
    ('aaaa1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-222222222222', 12.0, 0.0, '2025-01-01', '2025-12-31', 'active'),
    ('aaaa2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-111111111111', 18.0, 1.0, '2025-01-01', '2025-12-31', 'active'),
    ('aaaa2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-333333333333', 6.0, 2.0, '2025-01-01', '2025-12-31', 'active')
ON CONFLICT DO NOTHING;

-- 9. Approved Requests (Priya 1 day unpaid leave in June 2025)
INSERT INTO public.time_off_requests (id, employee_id, time_off_type_id, start_date, end_date, number_of_days, reason, status, approved_at)
VALUES
    ('66666666-6666-6666-6666-111111111111', 'aaaa2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-444444444444', '2025-06-10', '2025-06-10', 1.0, 'Personal emergency - Unpaid leave', 'approved', '2025-06-09 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 10. Attendance Records (Priya with late and missing checkout)
INSERT INTO public.attendance (employee_id, attendance_date, check_in, check_out, worked_hours, expected_hours, status, notes)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '2025-06-02', '2025-06-02 09:00:00+00', '2025-06-02 18:00:00+00', 8.00, 8.00, 'present', 'On time'),
    ('aaaa1111-1111-1111-1111-111111111111', '2025-06-03', '2025-06-03 08:55:00+00', '2025-06-03 18:05:00+00', 8.00, 8.00, 'present', 'On time'),
    ('aaaa2222-2222-2222-2222-222222222222', '2025-06-02', '2025-06-02 09:05:00+00', '2025-06-02 18:00:00+00', 8.00, 8.00, 'present', 'On time'),
    ('aaaa2222-2222-2222-2222-222222222222', '2025-06-03', '2025-06-03 10:45:00+00', '2025-06-03 18:00:00+00', 6.25, 8.00, 'late', 'Traffic delay'),
    ('aaaa2222-2222-2222-2222-222222222222', '2025-06-05', '2025-06-05 09:10:00+00', NULL, 0.00, 8.00, 'present', 'Forgot to check out')
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

-- 11. Payruns (June 2025 and July 2025)
INSERT INTO public.payruns (id, name, period_start, period_end, payment_date, status)
VALUES
    ('77777777-7777-7777-7777-111111111111', 'June 2025 Payroll', '2025-06-01', '2025-06-30', '2025-06-30', 'draft'),
    ('77777777-7777-7777-7777-222222222222', 'July 2025 Payroll', '2025-07-01', '2025-07-31', '2025-07-31', 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payrun_employees (payrun_id, employee_id, status)
VALUES
    ('77777777-7777-7777-7777-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'pending'),
    ('77777777-7777-7777-7777-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'pending'),
    ('77777777-7777-7777-7777-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'pending'),
    ('77777777-7777-7777-7777-222222222222', 'aaaa1111-1111-1111-1111-111111111111', 'pending')
ON CONFLICT (payrun_id, employee_id) DO NOTHING;
