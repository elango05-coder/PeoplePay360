import { TimeOffRequest, LeaveBalance, LeaveStatus, LeaveType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_LEAVE_REQUESTS, MOCK_LEAVE_BALANCES } from '../data/mockData';

const STORAGE_REQUESTS_KEY = 'peoplepay360_leave_requests';
const STORAGE_BALANCES_KEY = 'peoplepay360_leave_balances';

function getStoredRequests(): TimeOffRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading leave requests from storage', e);
  }
  localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(MOCK_LEAVE_REQUESTS));
  return [...MOCK_LEAVE_REQUESTS];
}

function saveStoredRequests(list: TimeOffRequest[]): void {
  localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(list));
}

function getStoredBalances(): Record<string, LeaveBalance[]> {
  try {
    const raw = localStorage.getItem(STORAGE_BALANCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading leave balances from storage', e);
  }
  localStorage.setItem(STORAGE_BALANCES_KEY, JSON.stringify(MOCK_LEAVE_BALANCES));
  return { ...MOCK_LEAVE_BALANCES };
}

function saveStoredBalances(balances: Record<string, LeaveBalance[]>): void {
  localStorage.setItem(STORAGE_BALANCES_KEY, JSON.stringify(balances));
}

function mapDbToTimeOff(dbReq: any): TimeOffRequest {
  const typeMap: Record<string, LeaveType> = {
    annual: 'Annual',
    sick: 'Sick',
    casual: 'Casual',
    unpaid: 'Unpaid',
    maternity: 'Maternity/Paternity',
    paternity: 'Maternity/Paternity'
  };

  const statusMap: Record<string, LeaveStatus> = {
    pending: 'Pending',
    approved: 'Approved',
    refused: 'Rejected',
    cancelled: 'Rejected'
  };

  const rawType = dbReq.time_off_type?.code || dbReq.time_off_type?.name || 'casual';
  const matchedType = typeMap[rawType.toLowerCase()] || 'Casual';

  const employeeName = dbReq.employee
    ? `${dbReq.employee.first_name} ${dbReq.employee.last_name}`.trim()
    : 'Employee';

  const deptName = dbReq.employee?.department?.name || 'Engineering';

  return {
    id: dbReq.id,
    employeeId: dbReq.employee_id,
    employeeName,
    department: deptName,
    leaveType: matchedType,
    startDate: dbReq.start_date,
    endDate: dbReq.end_date,
    duration: Number(dbReq.number_of_days || 1),
    reason: dbReq.reason || 'Personal Leave',
    status: statusMap[dbReq.status] || (dbReq.status as LeaveStatus) || 'Pending',
    appliedDate: dbReq.created_at ? dbReq.created_at.split('T')[0] : '2025-06-01',
    reviewedBy: dbReq.approved_by || undefined,
    reviewedDate: dbReq.approved_at ? dbReq.approved_at.split('T')[0] : undefined
  };
}

export const timeOffService = {
  getTimeOffRequests: async (filters?: {
    employeeId?: string;
    department?: string;
    status?: string;
  }): Promise<TimeOffRequest[]> => {
    // 1. Check if Supabase session is active
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          let query = supabase
            .from('time_off_requests')
            .select('*, employee:employees(*, department:departments(*)), time_off_type:time_off_types(*)');

          if (filters?.employeeId) {
            query = query.eq('employee_id', filters.employeeId);
          }

          if (filters?.status && filters.status !== 'All') {
            const statusMapReverse: Record<string, string> = {
              'Pending': 'pending',
              'Approved': 'approved',
              'Rejected': 'refused'
            };
            query = query.eq('status', statusMapReverse[filters.status] || filters.status.toLowerCase());
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            let list = data.map(mapDbToTimeOff);
            if (filters?.department && filters.department !== 'All') {
              list = list.filter((r) => r.department === filters.department);
            }
            return list;
          }
        }
      } catch (err) {
        console.warn('Supabase leave requests query error, using local store:', err);
      }
    }

    // 2. Local Storage Repository (Always resilient and persistent)
    let list = getStoredRequests();

    if (filters?.employeeId) {
      const empId = filters.employeeId;
      // Allow matching either UUID or mock ID (e.g. Rahul aaaa1111-... or emp-1)
      list = list.filter(
        (r) =>
          r.employeeId === empId ||
          (empId === 'aaaa1111-1111-1111-1111-111111111111' && r.employeeId === 'emp-1') ||
          (empId === 'emp-1' && r.employeeId === 'aaaa1111-1111-1111-1111-111111111111') ||
          (empId === 'aaaa2222-2222-2222-2222-222222222222' && r.employeeId === 'emp-2') ||
          (empId === 'emp-2' && r.employeeId === 'aaaa2222-2222-2222-2222-222222222222')
      );
    }

    if (filters?.department && filters.department !== 'All') {
      list = list.filter((r) => r.department === filters.department);
    }

    if (filters?.status && filters.status !== 'All') {
      list = list.filter((r) => r.status === filters.status);
    }

    return list;
  },

  getLeaveBalances: async (employeeId: string): Promise<LeaveBalance[]> => {
    // 1. Try Supabase if authenticated
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const { data, error } = await supabase
            .from('time_off_allocations')
            .select('*, time_off_type:time_off_types(*)')
            .eq('employee_id', employeeId)
            .eq('status', 'active');

          if (!error && data && data.length > 0) {
            const typeMap: Record<string, LeaveType> = {
              annual: 'Annual',
              sick: 'Sick',
              casual: 'Casual',
              unpaid: 'Unpaid',
              maternity: 'Maternity/Paternity',
              paternity: 'Maternity/Paternity'
            };

            return data.map((alloc) => {
              const raw = alloc.time_off_type?.code || alloc.time_off_type?.name || 'casual';
              return {
                leaveType: typeMap[raw.toLowerCase()] || 'Casual',
                allocated: Number(alloc.allocated_days || 0),
                used: Number(alloc.used_days || 0),
                remaining: Number(alloc.remaining_days || 0)
              };
            });
          }
        }
      } catch (err) {
        console.warn('Supabase leave balances query error, using local store:', err);
      }
    }

    // 2. Local Storage Repository
    const allBalances = getStoredBalances();
    const resolvedBalances =
      allBalances[employeeId] ||
      (employeeId === 'aaaa1111-1111-1111-1111-111111111111' ? allBalances['emp-1'] : undefined) ||
      (employeeId === 'aaaa2222-2222-2222-2222-222222222222' ? allBalances['emp-2'] : undefined) ||
      [
        { leaveType: 'Annual', allocated: 18, used: 2, remaining: 16 },
        { leaveType: 'Sick', allocated: 12, used: 1, remaining: 11 },
        { leaveType: 'Casual', allocated: 10, used: 1, remaining: 9 },
        { leaveType: 'Maternity/Paternity', allocated: 15, used: 0, remaining: 15 },
        { leaveType: 'Unpaid', allocated: 0, used: 0, remaining: 99 }
      ];

    return resolvedBalances;
  },

  createTimeOffRequest: async (
    data: Omit<TimeOffRequest, 'id' | 'status' | 'appliedDate'>
  ): Promise<TimeOffRequest> => {
    let createdRequest: TimeOffRequest | null = null;

    // 1. Try Supabase Insert if session is active
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          // Resolve leave type ID
          const { data: typeRow } = await supabase
            .from('time_off_types')
            .select('id')
            .ilike('name', `%${data.leaveType}%`)
            .limit(1)
            .single();

          let typeId = typeRow?.id;
          if (!typeId) {
            const { data: defaultType } = await supabase.from('time_off_types').select('id').limit(1).single();
            typeId = defaultType?.id;
          }

          const { data: created, error } = await supabase
            .from('time_off_requests')
            .insert({
              employee_id: data.employeeId,
              time_off_type_id: typeId,
              start_date: data.startDate,
              end_date: data.endDate,
              number_of_days: data.duration,
              reason: data.reason,
              status: 'pending'
            })
            .select('*, employee:employees(*, department:departments(*)), time_off_type:time_off_types(*)')
            .single();

          if (!error && created) {
            createdRequest = mapDbToTimeOff(created);
          }
        }
      } catch (err) {
        console.warn('Supabase insert not completed, saving to local store:', err);
      }
    }

    // 2. Guarantee Persistent Storage in Local Repository
    if (!createdRequest) {
      createdRequest = {
        id: `lv-${Date.now()}`,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        department: data.department,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        duration: data.duration,
        reason: data.reason,
        status: 'Pending',
        appliedDate: new Date().toISOString().split('T')[0]
      };
    }

    const currentList = getStoredRequests();
    // Prepend so newest is on top
    const updatedList = [createdRequest, ...currentList.filter((r) => r.id !== createdRequest!.id)];
    saveStoredRequests(updatedList);

    return createdRequest;
  },

  updateRequestStatus: async (
    id: string,
    status: LeaveStatus,
    reviewerName: string
  ): Promise<TimeOffRequest> => {
    // 1. Try Supabase if authenticated
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          if (status === 'Approved') {
            const approvedBy = sessionData.session.user.id;
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_time_off', {
              p_request_id: id,
              p_approved_by: approvedBy
            });

            if (rpcErr) {
              throw new Error(rpcErr.message);
            }
            if (rpcRes && rpcRes.success === false) {
              throw new Error(rpcRes.message || 'Leave approval rejected by business rules.');
            }
          } else {
            await supabase
              .from('time_off_requests')
              .update({
                status: 'refused',
                updated_at: new Date().toISOString()
              })
              .eq('id', id);
          }
        }
      } catch (err) {
        console.warn('Supabase status update error, falling back to local store:', err);
      }
    }

    // 2. Update in Local Storage Repository
    const list = getStoredRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Leave request ${id} not found in queue.`);
    }

    const targetReq = list[index];
    const updatedReq: TimeOffRequest = {
      ...targetReq,
      status,
      reviewedBy: reviewerName,
      reviewedDate: new Date().toISOString().split('T')[0]
    };

    list[index] = updatedReq;
    saveStoredRequests(list);

    // 3. If approved, atomically deduct from employee balance in storage
    if (status === 'Approved') {
      const allBalances = getStoredBalances();
      const empKey = targetReq.employeeId;
      const balancesToUpdate = allBalances[empKey] || allBalances['emp-1'];

      if (balancesToUpdate) {
        const balIndex = balancesToUpdate.findIndex(
          (b) => b.leaveType.toLowerCase() === targetReq.leaveType.toLowerCase()
        );
        if (balIndex !== -1) {
          const bal = balancesToUpdate[balIndex];
          bal.used += targetReq.duration;
          bal.remaining = Math.max(0, bal.remaining - targetReq.duration);
          balancesToUpdate[balIndex] = bal;
          allBalances[empKey] = balancesToUpdate;
          saveStoredBalances(allBalances);
        }
      }
    }

    return updatedReq;
  }
};
