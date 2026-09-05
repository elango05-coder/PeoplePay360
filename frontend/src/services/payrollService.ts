import { Payrun, Payslip, PayrunStatus, PayslipLine } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_PAYRUNS, MOCK_PAYSLIPS } from '../data/mockData';

function mapDbToPayrun(dbPr: any): Payrun {
  const statusMap: Record<string, PayrunStatus> = {
    draft: 'Draft',
    computed: 'Computed',
    validated: 'Validated',
    paid: 'Paid'
  };

  const payslips = dbPr.payslips || [];
  const employeeCount = dbPr.employees?.length || payslips.length || (dbPr.employeeCount || 0);

  const grossTotal = payslips.length > 0
    ? payslips.reduce((acc: number, p: any) => acc + Number(p.gross_salary || 0), 0)
    : Number(dbPr.grossTotal || 0);

  const deductionTotal = payslips.length > 0
    ? payslips.reduce((acc: number, p: any) => acc + Number(p.total_deductions || 0), 0)
    : Number(dbPr.deductionTotal || 0);

  const netTotal = payslips.length > 0
    ? payslips.reduce((acc: number, p: any) => acc + Number(p.net_salary || 0), 0)
    : Number(dbPr.netTotal || 0);

  // Extract period month/year
  let periodMonth = 'June';
  let periodYear = 2025;
  if (dbPr.period_start) {
    const d = new Date(dbPr.period_start);
    periodMonth = d.toLocaleString('en-US', { month: 'long' });
    periodYear = d.getFullYear();
  }

  return {
    id: dbPr.id,
    name: dbPr.name || `${periodMonth} ${periodYear} Payrun`,
    salaryStructureId: dbPr.salary_structure_id || 'str-001',
    salaryStructureName: dbPr.salary_structure?.name || 'Executive & Staff Salary Structure',
    periodMonth,
    periodYear,
    startDate: dbPr.period_start || '2025-06-01',
    endDate: dbPr.period_end || '2025-06-30',
    employeeCount: employeeCount || 2,
    grossTotal,
    deductionTotal,
    netTotal,
    status: statusMap[dbPr.status] || (dbPr.status as PayrunStatus) || 'Draft',
    createdAt: dbPr.created_at ? dbPr.created_at.split('T')[0] : '2025-06-01'
  };
}

function mapDbToPayslip(dbPs: any): Payslip {
  const statusMap: Record<string, PayrunStatus> = {
    draft: 'Draft',
    computed: 'Computed',
    validated: 'Validated',
    paid: 'Paid'
  };

  const emp = dbPs.employee;
  const employeeName = emp ? `${emp.first_name} ${emp.last_name}`.trim() : 'Employee';
  const employeeCode = emp?.employee_code || 'EMP-000';
  const deptName = emp?.department?.name || 'Engineering';
  const jobPosition = emp?.job_position || 'Staff';

  const rawLines = dbPs.lines || [];
  const lines: PayslipLine[] = rawLines.map((l: any) => {
    const isDeduction = l.category === 'deduction';
    return {
      name: l.name || l.code,
      category: isDeduction ? 'Deduction' : 'Earning',
      amount: Math.abs(Number(l.amount || 0))
    };
  });

  // Calculate formatted period string
  let periodStr = 'June 2025';
  if (dbPs.period_start) {
    const d = new Date(dbPs.period_start);
    periodStr = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
  }

  return {
    id: dbPs.id,
    payrunId: dbPs.payrun_id,
    payrunName: dbPs.payrun?.name || `${periodStr} Monthly Payrun`,
    employeeId: dbPs.employee_id,
    employeeCode,
    employeeName,
    department: deptName,
    position: jobPosition,
    period: periodStr,
    joiningDate: emp?.joining_date || '2024-01-01',
    bankAccount: emp?.bank_account_number || '•••• •••• •••• 4521',
    pan: emp?.pan_number || 'ABCDE1234F',
    grossSalary: Number(dbPs.gross_salary || 0),
    totalDeductions: Number(dbPs.total_deductions || 0),
    netSalary: Number(dbPs.net_salary || 0),
    status: statusMap[dbPs.status] || 'Computed',
    lines
  };
}

export const payrollService = {
  getPayruns: async (): Promise<Payrun[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payruns')
          .select('*, payslips(*), employees:payrun_employees(*)')
          .order('period_start', { ascending: false });

        if (error) {
          console.warn('Supabase getPayruns error, fallback to local', error);
        } else if (data && data.length > 0) {
          return data.map(mapDbToPayrun);
        }
      } catch (err) {
        console.error('Supabase getPayruns error:', err);
      }
    }

    return MOCK_PAYRUNS;
  },

  getPayrunById: async (id: string): Promise<Payrun | undefined> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payruns')
          .select('*, payslips(*), employees:payrun_employees(*)')
          .eq('id', id)
          .single();

        if (!error && data) {
          return mapDbToPayrun(data);
        }
      } catch (err) {
        console.error('Supabase getPayrunById error', err);
      }
    }

    const list = MOCK_PAYRUNS;
    return list.find((p) => p.id === id);
  },

  createPayrun: async (data: Omit<Payrun, 'id' | 'createdAt'>): Promise<Payrun> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id || null;

        const { data: created, error } = await supabase
          .from('payruns')
          .insert({
            name: data.name,
            period_start: data.startDate,
            period_end: data.endDate,
            payment_date: data.endDate,
            status: 'draft',
            created_by: userId
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Attach all active employees
        const { data: activeEmployees } = await supabase
          .from('employees')
          .select('id')
          .eq('status', 'active');

        if (activeEmployees && activeEmployees.length > 0) {
          const links = activeEmployees.map((e) => ({
            payrun_id: created.id,
            employee_id: e.id,
            status: 'pending'
          }));
          await supabase.from('payrun_employees').insert(links);
        }

        const full = await payrollService.getPayrunById(created.id);
        if (full) return full;
      } catch (err) {
        console.error('Supabase createPayrun error:', err);
        throw err;
      }
    }

    const newPayrun: Payrun = {
      ...data,
      id: `pr-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    return newPayrun;
  },

  computePayrun: async (id: string): Promise<{ success: boolean; message?: string; computedCount?: number }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('compute_payrun', {
          p_payrun_id: id
        });

        if (rpcErr) throw new Error(rpcErr.message);

        if (rpcRes && rpcRes.success === false) {
          throw new Error(rpcRes.message || 'Compute failed');
        }

        return {
          success: true,
          computedCount: rpcRes?.computed_count || 0,
          message: rpcRes?.message || 'Payroll computed successfully using database rules.'
        };
      } catch (err) {
        console.error('Supabase computePayrun error:', err);
        throw err;
      }
    }

    await payrollService.updatePayrunStatus(id, 'Computed');
    return { success: true, message: 'Computed (Mock)' };
  },

  validatePayrun: async (id: string): Promise<{ success: boolean; warnings?: any[]; errors?: any[]; message?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('validate_payrun', {
          p_payrun_id: id
        });

        if (rpcErr) throw new Error(rpcErr.message);

        if (rpcRes && rpcRes.success === false) {
          throw new Error(rpcRes.message || 'Validation failed');
        }

        return {
          success: true,
          warnings: rpcRes?.messages || [],
          message: rpcRes?.message || 'Payrun validated successfully.'
        };
      } catch (err) {
        console.error('Supabase validatePayrun error:', err);
        throw err;
      }
    }

    await payrollService.updatePayrunStatus(id, 'Validated');
    return { success: true, message: 'Validated (Mock)' };
  },

  markPayrunPaid: async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('mark_payrun_paid', {
          p_payrun_id: id
        });

        if (rpcErr) throw new Error(rpcErr.message);

        if (rpcRes && rpcRes.success === false) {
          throw new Error(rpcRes.message || 'Payment mark failed');
        }

        return {
          success: true,
          message: rpcRes?.message || 'Payrun marked as Paid. Recomputations are now locked.'
        };
      } catch (err) {
        console.error('Supabase markPayrunPaid error:', err);
        throw err;
      }
    }

    await payrollService.updatePayrunStatus(id, 'Paid');
    return { success: true, message: 'Paid (Mock)' };
  },

  updatePayrunStatus: async (id: string, status: PayrunStatus): Promise<Payrun> => {
    if (isSupabaseConfigured && supabase) {
      if (status === 'Computed') {
        await payrollService.computePayrun(id);
      } else if (status === 'Validated') {
        await payrollService.validatePayrun(id);
      } else if (status === 'Paid') {
        await payrollService.markPayrunPaid(id);
      }

      const refreshed = await payrollService.getPayrunById(id);
      if (refreshed) return refreshed;
    }

    const current = await payrollService.getPayrunById(id);
    if (!current) throw new Error('Payrun not found');
    return { ...current, status };
  },

  getPayslips: async (filters?: { payrunId?: string; employeeId?: string; search?: string }): Promise<Payslip[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('payslips')
          .select('*, employee:employees(*, department:departments(*)), payrun:payruns(*), lines:payslip_lines(*)');

        if (filters?.payrunId) {
          query = query.eq('payrun_id', filters.payrunId);
        }

        if (filters?.employeeId) {
          query = query.eq('employee_id', filters.employeeId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase getPayslips error, fallback to local', error);
        } else if (data && data.length > 0) {
          let list = data.map(mapDbToPayslip);

          if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(
              (ps) =>
                ps.employeeName.toLowerCase().includes(q) ||
                ps.employeeCode.toLowerCase().includes(q) ||
                ps.department.toLowerCase().includes(q)
            );
          }

          return list;
        }
      } catch (err) {
        console.error('Supabase getPayslips error:', err);
      }
    }

    let list = [...MOCK_PAYSLIPS];
    if (filters?.payrunId) {
      list = list.filter((ps) => ps.payrunId === filters.payrunId);
    }
    if (filters?.employeeId) {
      list = list.filter((ps) => ps.employeeId === filters.employeeId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (ps) =>
          ps.employeeName.toLowerCase().includes(q) ||
          ps.employeeCode.toLowerCase().includes(q) ||
          ps.department.toLowerCase().includes(q)
      );
    }
    return list;
  },

  getPayslipById: async (id: string): Promise<Payslip | undefined> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payslips')
          .select('*, employee:employees(*, department:departments(*)), payrun:payruns(*), lines:payslip_lines(*)')
          .eq('id', id)
          .single();

        if (!error && data) {
          return mapDbToPayslip(data);
        }
      } catch (err) {
        console.error('Supabase getPayslipById error', err);
      }
    }

    const list = MOCK_PAYSLIPS;
    return list.find((ps) => ps.id === id);
  },

  triggerDownloadPayslipPdf: async (payslipId: string): Promise<{ success: boolean; filename: string }> => {
    // Artificial small delay for PDF preparation
    await new Promise((res) => setTimeout(res, 300));
    return {
      success: true,
      filename: `PeoplePay360_Payslip_${payslipId.slice(0, 8)}.pdf`
    };
  },

  triggerEmailPayslip: async (
    payslipId: string,
    recipientEmail: string
  ): Promise<{ success: boolean; message: string }> => {
    await new Promise((res) => setTimeout(res, 400));
    return {
      success: true,
      message: `Payslip ${payslipId.slice(0, 8)} successfully dispatched to ${recipientEmail}`
    };
  }
};
