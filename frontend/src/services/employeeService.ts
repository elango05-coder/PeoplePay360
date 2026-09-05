import { Employee, EmployeeStatus, EmployeeType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_EMPLOYEES } from '../data/mockData';

function mapDbToEmployee(dbEmp: any): Employee {
  const typeMap: Record<string, EmployeeType> = {
    full_time: 'Full-Time',
    part_time: 'Part-Time',
    contractor: 'Contractor',
    intern: 'Intern'
  };

  const statusMap: Record<string, EmployeeStatus> = {
    active: 'Active',
    inactive: 'On Leave',
    terminated: 'Terminated'
  };

  const deptName = dbEmp.department?.name || dbEmp.department || 'Operations';
  const managerName = dbEmp.manager
    ? `${dbEmp.manager.first_name} ${dbEmp.manager.last_name}`.trim()
    : undefined;

  return {
    id: dbEmp.id,
    code: dbEmp.employee_code || dbEmp.code || '',
    firstName: dbEmp.first_name || dbEmp.firstName || '',
    lastName: dbEmp.last_name || dbEmp.lastName || '',
    email: dbEmp.email || '',
    phone: dbEmp.phone || '',
    dob: dbEmp.date_of_birth || dbEmp.dob || '1990-01-01',
    joiningDate: dbEmp.joining_date || dbEmp.joiningDate || '2024-01-01',
    department: deptName,
    position: dbEmp.job_position || dbEmp.position || '',
    employeeType: typeMap[dbEmp.employee_type] || (dbEmp.employeeType as EmployeeType) || 'Full-Time',
    status: statusMap[dbEmp.status] || (dbEmp.status as EmployeeStatus) || 'Active',
    managerName,
    workingSchedule: 'Standard 40h Work Week',
    bankName: dbEmp.bank_name || dbEmp.bankName || '',
    accountNumber: dbEmp.bank_account_number || dbEmp.accountNumber || '',
    ifscCode: dbEmp.bank_ifsc_or_routing || dbEmp.ifscCode || '',
    panNumber: dbEmp.pan_number || dbEmp.panNumber || ''
  };
}

export const employeeService = {
  getEmployees: async (filters?: { search?: string; department?: string; status?: string }): Promise<Employee[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('employees')
          .select('*, department:departments(*), manager:employees(*)');

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.warn('Error fetching employees from Supabase, fallback to local', error);
        } else if (data && data.length > 0) {
          let list = data.map(mapDbToEmployee);

          if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(
              (e) =>
                e.firstName.toLowerCase().includes(q) ||
                e.lastName.toLowerCase().includes(q) ||
                e.code.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.position.toLowerCase().includes(q)
            );
          }

          if (filters?.department && filters.department !== 'All') {
            list = list.filter((e) => e.department === filters.department);
          }

          if (filters?.status && filters.status !== 'All') {
            list = list.filter((e) => e.status === filters.status);
          }

          return list;
        }
      } catch (err) {
        console.error('Supabase employee fetch failed', err);
      }
    }

    // Fallback to local / mock
    let list = [...MOCK_EMPLOYEES];
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q)
      );
    }
    if (filters?.department && filters.department !== 'All') {
      list = list.filter((e) => e.department === filters.department);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter((e) => e.status === filters.status);
    }
    return list;
  },

  getEmployeeById: async (id: string): Promise<Employee | undefined> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*, department:departments(*), manager:employees(*)')
          .eq('id', id)
          .single();

        if (!error && data) {
          return mapDbToEmployee(data);
        }
      } catch (err) {
        console.error('Supabase getEmployeeById error', err);
      }
    }

    return MOCK_EMPLOYEES.find((e) => e.id === id);
  },

  createEmployee: async (data: Omit<Employee, 'id'>): Promise<Employee> => {
    if (isSupabaseConfigured && supabase) {
      try {
        // Resolve department ID
        let departmentId: string | null = null;
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .ilike('name', `%${data.department}%`)
          .limit(1)
          .single();

        if (dept) {
          departmentId = dept.id;
        } else {
          // Default department
          const { data: defaultDept } = await supabase.from('departments').select('id').limit(1).single();
          departmentId = defaultDept?.id || null;
        }

        const typeMapReverse: Record<EmployeeType, string> = {
          'Full-Time': 'full_time',
          'Part-Time': 'part_time',
          'Contractor': 'contractor',
          'Intern': 'intern'
        };

        const statusMapReverse: Record<EmployeeStatus, string> = {
          'Active': 'active',
          'On Leave': 'inactive',
          'Terminated': 'terminated'
        };

        const insertPayload = {
          employee_code: data.code,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone || null,
          date_of_birth: data.dob || null,
          joining_date: data.joiningDate,
          department_id: departmentId,
          job_position: data.position,
          employee_type: typeMapReverse[data.employeeType] || 'full_time',
          status: statusMapReverse[data.status] || 'active',
          bank_name: data.bankName || null,
          bank_account_number: data.accountNumber || null,
          bank_ifsc_or_routing: data.ifscCode || null
        };

        const { data: created, error } = await supabase
          .from('employees')
          .insert(insertPayload)
          .select('*, department:departments(*)')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapDbToEmployee(created);
      } catch (err) {
        console.error('Supabase createEmployee error:', err);
        throw err;
      }
    }

    const newEmployee: Employee = {
      ...data,
      id: `emp-${Date.now()}`
    };
    return newEmployee;
  },

  updateEmployee: async (id: string, data: Partial<Employee>): Promise<Employee> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };

        if (data.firstName) updatePayload.first_name = data.firstName;
        if (data.lastName) updatePayload.last_name = data.lastName;
        if (data.email) updatePayload.email = data.email;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.position) updatePayload.job_position = data.position;
        if (data.bankName !== undefined) updatePayload.bank_name = data.bankName;
        if (data.accountNumber !== undefined) updatePayload.bank_account_number = data.accountNumber;
        if (data.ifscCode !== undefined) updatePayload.bank_ifsc_or_routing = data.ifscCode;

        if (data.status) {
          const statusMapReverse: Record<EmployeeStatus, string> = {
            'Active': 'active',
            'On Leave': 'inactive',
            'Terminated': 'terminated'
          };
          updatePayload.status = statusMapReverse[data.status] || 'active';
        }

        const { data: updated, error } = await supabase
          .from('employees')
          .update(updatePayload)
          .eq('id', id)
          .select('*, department:departments(*)')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapDbToEmployee(updated);
      } catch (err) {
        console.error('Supabase updateEmployee error:', err);
        throw err;
      }
    }

    const current = await employeeService.getEmployeeById(id);
    if (!current) throw new Error(`Employee ${id} not found`);
    return { ...current, ...data };
  },

  deleteEmployee: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }
  },

  getDepartments: async (): Promise<string[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('name')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((d) => d.name);
        }
      } catch (err) {
        console.error('Supabase getDepartments error', err);
      }
    }

    return ['Engineering', 'Product & Design', 'Sales & Marketing', 'Human Resources', 'Operations', 'Finance'];
  }
};
