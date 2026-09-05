-- ==============================================================================
-- PeoplePay360: Functions and RPC Business Logic
-- Migration: 20250101000001_functions_and_rpc.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Helper: Get current user role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ------------------------------------------------------------------------------
-- Helper: Get current user's employee_id
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT employee_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ------------------------------------------------------------------------------
-- 1. GET APPLICABLE CONTRACT FOR A PERIOD
-- Core Business Rule: Select contract based on period start/end, NOT simply the latest.
-- ------------------------------------------------------------------------------
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
    ORDER BY 
      -- Prioritize contract active for the majority of the period or latest start date
      c.start_date DESC
    LIMIT 1;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. APPROVE TIME OFF REQUEST WITH BALANCE VERIFICATION
-- ------------------------------------------------------------------------------
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
    -- 1. Fetch request
    SELECT * INTO v_req 
    FROM public.time_off_requests 
    WHERE id = p_request_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REQUEST_NOT_FOUND', 'message', 'Time off request not found.');
    END IF;

    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Only pending requests can be approved.');
    END IF;

    -- 2. Check time off type
    SELECT * INTO v_type FROM public.time_off_types WHERE id = v_req.time_off_type_id;

    -- 3. If paid leave, check allocation balance
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

        -- Update allocation used days
        UPDATE public.time_off_allocations
        SET used_days = used_days + v_req.number_of_days,
            updated_at = NOW()
        WHERE id = v_alloc.id;
    END IF;

    -- 4. Mark request approved
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

-- ------------------------------------------------------------------------------
-- 3. COMPUTE PAYSLIP FOR AN EMPLOYEE IN A PAYRUN
-- ------------------------------------------------------------------------------
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
    -- 1. Verify employee exists and is active
    SELECT * INTO v_employee FROM public.employees WHERE id = p_employee_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EMPLOYEE_NOT_FOUND', 'message', 'Employee does not exist.');
    END IF;

    IF v_employee.status != 'active' THEN
        v_warnings := v_warnings || jsonb_build_object('code', 'INACTIVE_EMPLOYEE', 'message', 'Employee is marked inactive or terminated.');
    END IF;

    -- Check bank details warning
    IF v_employee.bank_account_number IS NULL OR v_employee.bank_account_number = '' THEN
        v_warnings := v_warnings || jsonb_build_object('code', 'MISSING_BANK_DETAILS', 'message', 'Employee has no bank account details.');
    END IF;

    -- 2. Find applicable contract
    SELECT * INTO v_contract 
    FROM public.get_applicable_contract(p_employee_id, p_period_start, p_period_end);

    IF v_contract.id IS NULL THEN
        v_errors := v_errors || jsonb_build_object('code', 'NO_APPLICABLE_CONTRACT', 'message', 'No valid contract found for the period ' || p_period_start || ' to ' || p_period_end);
        -- Update payrun employee record with error
        UPDATE public.payrun_employees
        SET status = 'error',
            error_count = jsonb_array_length(v_errors),
            warning_count = jsonb_array_length(v_warnings),
            validation_messages = v_errors || v_warnings
        WHERE payrun_id = p_payrun_id AND employee_id = p_employee_id;

        RETURN jsonb_build_object('success', false, 'errors', v_errors, 'warnings', v_warnings);
    END IF;

    -- 3. Find salary structure
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

    -- 4. Check attendance exceptions in period
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

    -- 5. Process approved unpaid time off
    SELECT COALESCE(SUM(r.number_of_days), 0)
    INTO v_unpaid_days
    FROM public.time_off_requests r
    JOIN public.time_off_types t ON r.time_off_type_id = t.id
    WHERE r.employee_id = p_employee_id
      AND r.status = 'approved'
      AND t.is_paid = false
      AND r.start_date <= p_period_end
      AND r.end_date >= p_period_start;

    -- 6. Setup base values
    v_basic := v_contract.wage;
    v_days_in_month := (p_period_end - p_period_start + 1);
    IF v_days_in_month <= 0 THEN v_days_in_month := 30; END IF;
    v_daily_rate := ROUND(v_basic / v_days_in_month, 2);

    -- Delete prior payslip for this payrun & employee if regenerating
    DELETE FROM public.payslips WHERE payrun_id = p_payrun_id AND employee_id = p_employee_id;

    -- Create new draft payslip
    INSERT INTO public.payslips (
        payrun_id,
        employee_id,
        contract_id,
        salary_structure_id,
        period_start,
        period_end,
        basic_salary,
        total_allowances,
        gross_salary,
        total_deductions,
        net_salary,
        status
    ) VALUES (
        p_payrun_id,
        p_employee_id,
        v_contract.id,
        v_structure.id,
        p_period_start,
        p_period_end,
        v_basic,
        0, 0, 0, 0,
        'draft'
    ) RETURNING id INTO v_payslip_id;

    -- Insert Basic salary line
    INSERT INTO public.payslip_lines (payslip_id, salary_rule_id, code, name, category, sequence, amount)
    VALUES (v_payslip_id, NULL, 'BASIC', 'Basic Salary', 'basic', 1, v_basic);

    -- 7. Process salary rules in sequence ASC
    FOR v_rule IN 
        SELECT * FROM public.salary_rules 
        WHERE salary_structure_id = v_structure.id AND is_active = true
        ORDER BY sequence ASC
    LOOP
        v_amount := 0.00;
        IF v_rule.computation_type = 'fixed' THEN
            v_amount := COALESCE(v_rule.value, 0.00);
        ELSIF v_rule.computation_type = 'percentage' THEN
            -- Percentage of Basic Salary by default
            v_amount := ROUND(v_basic * (COALESCE(v_rule.percentage, 0.00) / 100.0), 2);
        ELSIF v_rule.computation_type = 'formula' THEN
            -- Supported standardized formulas
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

    -- Deduct unpaid leave if any
    IF v_unpaid_days > 0 THEN
        v_unpaid_deduction := ROUND(v_unpaid_days * v_daily_rate, 2);
        v_total_deductions := v_total_deductions + v_unpaid_deduction;

        INSERT INTO public.payslip_lines (payslip_id, salary_rule_id, code, name, category, sequence, amount)
        VALUES (v_payslip_id, NULL, 'UNPAID_LEAVE', 'Unpaid Leave Deduction (' || v_unpaid_days || ' days)', 'deduction', 90, v_unpaid_deduction);

        v_warnings := v_warnings || jsonb_build_object('code', 'UNPAID_LEAVE_DEDUCTION', 'message', v_unpaid_days || ' unpaid leave day(s) deducted: ₹' || v_unpaid_deduction);
    END IF;

    -- 8. Final Totals
    v_gross := v_basic + v_total_allowances;
    v_net := v_gross - v_total_deductions;

    UPDATE public.payslips
    SET total_allowances = v_total_allowances,
        gross_salary = v_gross,
        total_deductions = v_total_deductions,
        net_salary = v_net,
        updated_at = NOW()
    WHERE id = v_payslip_id;

    -- 9. Update payrun_employees
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

-- ------------------------------------------------------------------------------
-- 4. COMPUTE ENTIRE PAYRUN
-- ------------------------------------------------------------------------------
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
    v_warning_count INT := 0;
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

    -- Update payrun status
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

-- ------------------------------------------------------------------------------
-- 5. VALIDATE PAYRUN
-- ------------------------------------------------------------------------------
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

    -- Check for critical errors in payrun_employees
    SELECT COALESCE(SUM(error_count), 0), COALESCE(SUM(warning_count), 0)
    INTO v_blocking_errors, v_warning_total
    FROM public.payrun_employees
    WHERE payrun_id = p_payrun_id;

    IF v_blocking_errors > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'PAYRUN_VALIDATION_FAILED',
            'message', 'Payrun cannot be validated due to ' || v_blocking_errors || ' blocking error(s). Please review employee contracts and salary structures.',
            'error_count', v_blocking_errors,
            'warning_count', v_warning_total
        );
    END IF;

    -- Mark payrun & its payslips validated
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

-- ------------------------------------------------------------------------------
-- 6. MARK PAYRUN PAID
-- ------------------------------------------------------------------------------
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

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payrun marked as paid and payslips finalized.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. DASHBOARD METRICS RPC
-- ------------------------------------------------------------------------------
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

    -- Latest payrun info
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
