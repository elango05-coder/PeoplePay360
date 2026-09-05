import { Contract, ContractStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_CONTRACTS } from '../data/mockData';

function mapDbToContract(dbCnt: any): Contract {
  const statusMap: Record<string, ContractStatus> = {
    active: 'Active',
    draft: 'Draft',
    expired: 'Expired',
    terminated: 'Terminated'
  };

  const employeeName = dbCnt.employee
    ? `${dbCnt.employee.first_name} ${dbCnt.employee.last_name}`.trim()
    : 'Unknown Employee';

  const deptName = dbCnt.department?.name || dbCnt.employee?.department?.name || 'Engineering';

  return {
    id: dbCnt.id,
    employeeId: dbCnt.employee_id,
    employeeName,
    contractNumber: dbCnt.contract_number || 'CNT-000',
    startDate: dbCnt.start_date,
    endDate: dbCnt.end_date || undefined,
    wage: Number(dbCnt.wage || 0),
    department: deptName,
    jobPosition: dbCnt.job_position || dbCnt.employee?.job_position || 'Staff',
    salaryStructureId: dbCnt.salary_structure_id || '',
    salaryStructureName: dbCnt.salary_structure?.name || 'Standard Structure',
    status: statusMap[dbCnt.status] || (dbCnt.status as ContractStatus) || 'Active',
    terms: 'Standard Employment Agreement with regular Indian statutory benefits',
    createdAt: dbCnt.created_at ? dbCnt.created_at.split('T')[0] : '2025-01-01'
  };
}

export const contractService = {
  getContracts: async (filters?: { employeeId?: string; status?: string; search?: string }): Promise<Contract[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('contracts')
          .select('*, employee:employees(*, department:departments(*)), salary_structure:salary_structures(*)');

        if (filters?.employeeId) {
          query = query.eq('employee_id', filters.employeeId);
        }

        if (filters?.status && filters.status !== 'All') {
          query = query.eq('status', filters.status.toLowerCase());
        }

        const { data, error } = await query.order('start_date', { ascending: false });

        if (error) {
          console.warn('Supabase getContracts error, fallback to local', error);
        } else if (data && data.length > 0) {
          let list = data.map(mapDbToContract);

          if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(
              (c) =>
                c.employeeName.toLowerCase().includes(q) ||
                c.contractNumber.toLowerCase().includes(q) ||
                c.jobPosition.toLowerCase().includes(q) ||
                c.department.toLowerCase().includes(q)
            );
          }

          return list;
        }
      } catch (err) {
        console.error('Supabase contract error:', err);
      }
    }

    // Fallback to local / mock
    let list = [...MOCK_CONTRACTS];
    if (filters?.employeeId) {
      list = list.filter((c) => c.employeeId === filters.employeeId);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(q) ||
          c.contractNumber.toLowerCase().includes(q) ||
          c.jobPosition.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },

  getContractById: async (id: string): Promise<Contract | undefined> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*, employee:employees(*, department:departments(*)), salary_structure:salary_structures(*)')
          .eq('id', id)
          .single();

        if (!error && data) {
          return mapDbToContract(data);
        }
      } catch (err) {
        console.error('Supabase getContractById error', err);
      }
    }

    return MOCK_CONTRACTS.find((c) => c.id === id);
  },

  createContract: async (data: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const statusMapReverse: Record<ContractStatus, string> = {
          'Active': 'active',
          'Draft': 'draft',
          'Expired': 'expired',
          'Terminated': 'terminated'
        };

        const { data: created, error } = await supabase
          .from('contracts')
          .insert({
            employee_id: data.employeeId,
            contract_number: data.contractNumber,
            start_date: data.startDate,
            end_date: data.endDate || null,
            wage: data.wage,
            job_position: data.jobPosition,
            salary_structure_id: data.salaryStructureId,
            status: statusMapReverse[data.status] || 'active'
          })
          .select('*, employee:employees(*, department:departments(*)), salary_structure:salary_structures(*)')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapDbToContract(created);
      } catch (err) {
        console.error('Supabase createContract error:', err);
        throw err;
      }
    }

    const newContract: Contract = {
      ...data,
      id: `cnt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    return newContract;
  },

  updateContract: async (id: string, data: Partial<Contract>): Promise<Contract> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };

        if (data.contractNumber) updatePayload.contract_number = data.contractNumber;
        if (data.startDate) updatePayload.start_date = data.startDate;
        if (data.endDate !== undefined) updatePayload.end_date = data.endDate || null;
        if (data.wage !== undefined) updatePayload.wage = data.wage;
        if (data.jobPosition) updatePayload.job_position = data.jobPosition;
        if (data.salaryStructureId) updatePayload.salary_structure_id = data.salaryStructureId;
        if (data.status) {
          const statusMapReverse: Record<ContractStatus, string> = {
            'Active': 'active',
            'Draft': 'draft',
            'Expired': 'expired',
            'Terminated': 'terminated'
          };
          updatePayload.status = statusMapReverse[data.status] || 'active';
        }

        const { data: updated, error } = await supabase
          .from('contracts')
          .update(updatePayload)
          .eq('id', id)
          .select('*, employee:employees(*, department:departments(*)), salary_structure:salary_structures(*)')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapDbToContract(updated);
      } catch (err) {
        console.error('Supabase updateContract error:', err);
        throw err;
      }
    }

    const current = await contractService.getContractById(id);
    if (!current) throw new Error(`Contract ${id} not found`);
    return { ...current, ...data };
  }
};
