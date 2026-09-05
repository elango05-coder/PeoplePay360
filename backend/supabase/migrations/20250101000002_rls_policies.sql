-- ==============================================================================
-- PeoplePay360: Row Level Security (RLS) Policies
-- Migration: 20250101000002_rls_policies.sql
-- ==============================================================================

-- Enable RLS on all tables
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

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================
CREATE POLICY "Profiles are viewable by owner, HR, and Admins"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() 
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "Profiles updateable by owner (own info) or Admin"
ON public.profiles FOR UPDATE
USING (
    id = auth.uid() 
    OR public.auth_user_role() = 'admin'
);

CREATE POLICY "Admin can insert/delete profiles"
ON public.profiles FOR ALL
USING (public.auth_user_role() = 'admin');

-- ==============================================================================
-- 2. DEPARTMENTS
-- ==============================================================================
CREATE POLICY "Departments are viewable by all authenticated users"
ON public.departments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Departments manageable by HR and Admin"
ON public.departments FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- ==============================================================================
-- 3. EMPLOYEES
-- ==============================================================================
CREATE POLICY "Employees can view own record; HR/Admin can view all"
ON public.employees FOR SELECT
USING (
    id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "HR and Admin can insert/update employees"
ON public.employees FOR INSERT
WITH CHECK (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

CREATE POLICY "HR and Admin can update employees"
ON public.employees FOR UPDATE
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

CREATE POLICY "Admin can delete employees"
ON public.employees FOR DELETE
USING (public.auth_user_role() = 'admin');

-- ==============================================================================
-- 4. WORKING SCHEDULES & DAYS
-- ==============================================================================
CREATE POLICY "Schedules viewable by all authenticated users"
ON public.working_schedules FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Schedule days viewable by all authenticated users"
ON public.working_schedule_days FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Schedules manageable by HR and Admin"
ON public.working_schedules FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

CREATE POLICY "Schedule days manageable by HR and Admin"
ON public.working_schedule_days FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- ==============================================================================
-- 5. CONTRACTS
-- ==============================================================================
CREATE POLICY "Contracts viewable by employee (own) or HR/Payroll/Admin"
ON public.contracts FOR SELECT
USING (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "Contracts manageable by HR and Admin"
ON public.contracts FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

-- ==============================================================================
-- 6. TIME OFF
-- ==============================================================================
CREATE POLICY "Time off types viewable by all authenticated"
ON public.time_off_types FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Time off types manageable by HR/Admin"
ON public.time_off_types FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

CREATE POLICY "Time off allocations viewable by employee (own) or HR/Admin"
ON public.time_off_allocations FOR SELECT
USING (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "Time off allocations manageable by HR/Admin"
ON public.time_off_allocations FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager'));

CREATE POLICY "Time off requests viewable by owner or HR/Admin"
ON public.time_off_requests FOR SELECT
USING (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "Employees can create their own time off requests"
ON public.time_off_requests FOR INSERT
WITH CHECK (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager')
);

CREATE POLICY "Time off requests updateable by HR/Admin (approval) or owner (cancel if pending)"
ON public.time_off_requests FOR UPDATE
USING (
    (employee_id = public.auth_employee_id() AND status = 'pending')
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_manager')
);

-- ==============================================================================
-- 7. ATTENDANCE
-- ==============================================================================
CREATE POLICY "Attendance viewable by employee (own) or HR/Payroll/Admin"
ON public.attendance FOR SELECT
USING (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "Employees can clock in/out for themselves"
ON public.attendance FOR INSERT
WITH CHECK (
    employee_id = public.auth_employee_id()
    OR public.auth_user_role() IN ('admin', 'hr_manager')
);

CREATE POLICY "Attendance updateable by employee (same day) or HR/Admin"
ON public.attendance FOR UPDATE
USING (
    (employee_id = public.auth_employee_id() AND attendance_date = CURRENT_DATE)
    OR public.auth_user_role() IN ('admin', 'hr_manager')
);

-- ==============================================================================
-- 8. SALARY STRUCTURES & SALARY RULES
-- ==============================================================================
CREATE POLICY "Salary structures viewable by HR/Payroll/Admin"
ON public.salary_structures FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

CREATE POLICY "Salary structures manageable by HR Payroll Manager and Admin"
ON public.salary_structures FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

CREATE POLICY "Salary rules viewable by HR/Payroll/Admin"
ON public.salary_rules FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager'));

CREATE POLICY "Salary rules manageable by HR Payroll Manager and Admin"
ON public.salary_rules FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

-- ==============================================================================
-- 9. PAYRUNS & PAYRUN EMPLOYEES
-- ==============================================================================
CREATE POLICY "Payruns viewable by Payroll users, Payroll managers, and Admin"
ON public.payruns FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

CREATE POLICY "Payruns creatable/updateable by Payroll users and managers"
ON public.payruns FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

CREATE POLICY "Payrun employees viewable by Payroll users and managers"
ON public.payrun_employees FOR SELECT
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

CREATE POLICY "Payrun employees manageable by Payroll users and managers"
ON public.payrun_employees FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager'));

-- ==============================================================================
-- 10. PAYSLIPS & PAYSLIP LINES
-- ==============================================================================
CREATE POLICY "Payslips viewable by owner (validated/paid) or Payroll/Admin"
ON public.payslips FOR SELECT
USING (
    (employee_id = public.auth_employee_id() AND status IN ('validated', 'paid', 'sent'))
    OR public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager')
);

CREATE POLICY "Payslips manageable by Payroll Manager and Admin"
ON public.payslips FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));

CREATE POLICY "Payslip lines viewable by owner or Payroll/Admin"
ON public.payslip_lines FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.payslips p
        WHERE p.id = payslip_lines.payslip_id
          AND (
            (p.employee_id = public.auth_employee_id() AND p.status IN ('validated', 'paid', 'sent'))
            OR public.auth_user_role() IN ('admin', 'hr_payroll_user', 'hr_payroll_manager')
          )
    )
);

CREATE POLICY "Payslip lines manageable by Payroll Manager and Admin"
ON public.payslip_lines FOR ALL
USING (public.auth_user_role() IN ('admin', 'hr_payroll_manager'));
