// ==============================================================================
// PeoplePay360: Time Off & Leave Management Service
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import {
  TimeOffAllocation,
  TimeOffRequest,
  TimeOffStatus,
  TimeOffType,
} from '../types/database.types.js';

export interface CreateTimeOffRequestInput {
  employee_id: string;
  time_off_type_id: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason?: string | null;
}

export class TimeOffService {
  /**
   * Get all active leave types
   */
  static async getTimeOffTypes(): Promise<{ data: TimeOffType[] | null; error: any }> {
    const { data, error } = await supabase
      .from('time_off_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    return { data, error };
  }

  /**
   * Get an employee's leave allocations and remaining balances
   */
  static async getEmployeeAllocations(employeeId: string): Promise<{ data: TimeOffAllocation[] | null; error: any }> {
    const { data, error } = await supabase
      .from('time_off_allocations')
      .select('*, time_off_type:time_off_types(*)')
      .eq('employee_id', employeeId)
      .eq('status', 'active');
    return { data, error };
  }

  /**
   * Submit a new time off request
   */
  static async createRequest(input: CreateTimeOffRequestInput): Promise<{ data: TimeOffRequest | null; error: any }> {
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert({
        ...input,
        status: 'pending',
      })
      .select('*, time_off_type:time_off_types(*)')
      .single();
    return { data, error };
  }

  /**
   * Approve a time off request with leave balance verification
   */
  static async approveRequest(
    requestId: string,
    approvedBy: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    // 1. Try DB RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_time_off', {
        p_request_id: requestId,
        p_approved_by: approvedBy,
      });

      if (!rpcErr && rpcRes) {
        return rpcRes;
      }
    } catch {
      // Fallback to application level transaction
    }

    // 2. Fetch request
    const { data: req, error: reqErr } = await supabase
      .from('time_off_requests')
      .select('*, time_off_type:time_off_types(*)')
      .eq('id', requestId)
      .single();

    if (reqErr || !req) {
      return { success: false, error: 'REQUEST_NOT_FOUND', message: 'Time off request not found.' };
    }

    if (req.status !== 'pending') {
      return { success: false, error: 'INVALID_STATUS', message: 'Only pending requests can be approved.' };
    }

    // 3. If paid, verify balance
    if (req.time_off_type?.is_paid) {
      const { data: alloc, error: allocErr } = await supabase
        .from('time_off_allocations')
        .select('*')
        .eq('employee_id', req.employee_id)
        .eq('time_off_type_id', req.time_off_type_id)
        .eq('status', 'active')
        .single();

      if (allocErr || !alloc) {
        return { success: false, error: 'NO_ALLOCATION', message: 'No active leave allocation found.' };
      }

      if (alloc.remaining_days < req.number_of_days) {
        return {
          success: false,
          error: 'INSUFFICIENT_LEAVE_BALANCE',
          message: `Insufficient leave balance. Remaining: ${alloc.remaining_days}, Requested: ${req.number_of_days}`,
        };
      }

      // Deduct used days
      await supabase
        .from('time_off_allocations')
        .update({
          used_days: alloc.used_days + req.number_of_days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alloc.id);
    }

    // 4. Update request status to approved
    await supabase
      .from('time_off_requests')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return { success: true, message: 'Time off approved successfully.' };
  }

  /**
   * Refuse / reject time off request
   */
  static async refuseRequest(requestId: string, approvedBy: string, reason?: string): Promise<{ success: boolean; error: any }> {
    const { error } = await supabase
      .from('time_off_requests')
      .update({
        status: 'refused',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        reason: reason ? `Refused: ${reason}` : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return { success: !error, error };
  }
}
