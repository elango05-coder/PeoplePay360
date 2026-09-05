// ==============================================================================
// PeoplePay360: Contract Service & Period Selection Logic
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import { Contract, ContractStatus } from '../types/database.types.js';

export interface CreateContractInput {
  employee_id: string;
  contract_number: string;
  start_date: string;
  end_date?: string | null;
  wage: number;
  department_id?: string | null;
  job_position: string;
  salary_structure_id: string;
  working_schedule_id?: string | null;
  status?: ContractStatus;
}

export class ContractService {
  /**
   * Get all contracts for an employee (Contract History)
   */
  static async getEmployeeContracts(employeeId: string): Promise<{ data: Contract[] | null; error: any }> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, salary_structure:salary_structures(*)')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });
    return { data, error };
  }

  /**
   * CORE BUSINESS LOGIC:
   * Selects the contract applicable to the specified payroll period.
   * Never simply selects the employee's latest contract.
   *
   * Condition:
   * start_date <= period_end AND (end_date IS NULL OR end_date >= period_start)
   */
  static async getApplicableContract(
    employeeId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ data: Contract | null; error: any }> {
    // 1. Try DB RPC first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_applicable_contract', {
        p_employee_id: employeeId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return { data: rpcData[0], error: null };
      }
    } catch {
      // Fallback to table query
    }

    // 2. Direct Supabase query fallback
    const { data, error } = await supabase
      .from('contracts')
      .select('*, salary_structure:salary_structures(*)')
      .eq('employee_id', employeeId)
      .lte('start_date', periodEnd)
      .or(`end_date.is.null,end_date.gte.${periodStart}`)
      .in('status', ['active', 'draft'])
      .order('start_date', { ascending: false })
      .limit(1);

    if (error) {
      return { data: null, error };
    }

    return { data: data && data.length > 0 ? data[0] : null, error: null };
  }

  /**
   * Pure deterministic in-memory contract resolver for offline / testing / engine
   */
  static resolveContractFromList(
    contracts: Contract[],
    periodStart: string,
    periodEnd: string
  ): Contract | null {
    const matching = contracts
      .filter((c) => {
        const isStarted = c.start_date <= periodEnd;
        const isNotEnded = !c.end_date || c.end_date >= periodStart;
        const isActive = c.status === 'active' || c.status === 'draft';
        return isStarted && isNotEnded && isActive;
      })
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    return matching.length > 0 ? matching[0] : null;
  }

  /**
   * Create a new contract
   */
  static async createContract(input: CreateContractInput): Promise<{ data: Contract | null; error: any }> {
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        ...input,
        status: input.status || 'active',
      })
      .select()
      .single();
    return { data, error };
  }

  /**
   * Update an existing contract
   */
  static async updateContract(id: string, input: Partial<CreateContractInput>): Promise<{ data: Contract | null; error: any }> {
    const { data, error } = await supabase
      .from('contracts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
}
