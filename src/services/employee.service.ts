// ==============================================================================
// PeoplePay360: Employee & Department Services
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import { Department, Employee, EmployeeStatus, EmployeeType } from '../types/database.types.js';

export interface CreateEmployeeInput {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  date_of_birth?: string | null;
  joining_date: string;
  department_id: string;
  manager_id?: string | null;
  job_position: string;
  employee_type?: EmployeeType;
  status?: EmployeeStatus;
  bank_account_number?: string | null;
  bank_name?: string | null;
  bank_ifsc_or_routing?: string | null;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {}

export class EmployeeService {
  /**
   * Fetch all employees, optionally filtered by department or status
   */
  static async getEmployees(filter?: { department_id?: string; status?: EmployeeStatus }): Promise<{ data: Employee[] | null; error: any }> {
    let query = supabase.from('employees').select('*, department:departments(*)');
    if (filter?.department_id) {
      query = query.eq('department_id', filter.department_id);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  }

  /**
   * Fetch single employee by ID
   */
  static async getEmployeeById(id: string): Promise<{ data: Employee | null; error: any }> {
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(*), manager:employees(*)')
      .eq('id', id)
      .single();
    return { data, error };
  }

  /**
   * Create a new employee
   */
  static async createEmployee(input: CreateEmployeeInput): Promise<{ data: Employee | null; error: any }> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...input,
        employee_type: input.employee_type || 'full_time',
        status: input.status || 'active',
      })
      .select()
      .single();
    return { data, error };
  }

  /**
   * Update employee details
   */
  static async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<{ data: Employee | null; error: any }> {
    const { data, error } = await supabase
      .from('employees')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  /**
   * Soft delete employee by marking terminated
   */
  static async terminateEmployee(id: string): Promise<{ data: Employee | null; error: any }> {
    return this.updateEmployee(id, { status: 'terminated' });
  }

  /**
   * Hard delete employee (admin only)
   */
  static async deleteEmployee(id: string): Promise<{ success: boolean; error: any }> {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    return { success: !error, error };
  }

  // ----------------------------------------------------------------------------
  // Department Methods
  // ----------------------------------------------------------------------------
  static async getDepartments(): Promise<{ data: Department[] | null; error: any }> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    return { data, error };
  }

  static async createDepartment(input: { name: string; code: string; manager_id?: string | null }): Promise<{ data: Department | null; error: any }> {
    const { data, error } = await supabase
      .from('departments')
      .insert(input)
      .select()
      .single();
    return { data, error };
  }
}
