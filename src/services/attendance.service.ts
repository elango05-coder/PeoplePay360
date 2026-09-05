// ==============================================================================
// PeoplePay360: Attendance Service & Exception Analyzer
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import { Attendance, AttendanceStatus } from '../types/database.types.js';

export interface ClockInInput {
  employee_id: string;
  attendance_date?: string; // default today YYYY-MM-DD
  check_in?: string;        // ISO timestamp
  expected_hours?: number;
}

export interface ClockOutInput {
  attendance_id: string;
  check_out?: string;       // ISO timestamp
}

export interface AttendanceException {
  employee_id: string;
  attendance_date: string;
  type: 'missing_checkout' | 'late_arrival' | 'insufficient_hours' | 'absent';
  message: string;
}

export class AttendanceService {
  /**
   * Clock in for today
   */
  static async clockIn(input: ClockInInput): Promise<{ data: Attendance | null; error: any }> {
    const today = input.attendance_date || new Date().toISOString().split('T')[0];
    const checkInTime = input.check_in || new Date().toISOString();

    // Check if late (e.g., standard after 09:30)
    const checkInDate = new Date(checkInTime);
    const isLate = checkInDate.getUTCHours() > 9 || (checkInDate.getUTCHours() === 9 && checkInDate.getUTCMinutes() > 30);
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          employee_id: input.employee_id,
          attendance_date: today,
          check_in: checkInTime,
          expected_hours: input.expected_hours ?? 8.0,
          status,
        },
        { onConflict: 'employee_id,attendance_date' }
      )
      .select()
      .single();

    return { data, error };
  }

  /**
   * Clock out and calculate worked hours
   */
  static async clockOut(input: ClockOutInput): Promise<{ data: Attendance | null; error: any }> {
    const checkOutTime = input.check_out || new Date().toISOString();

    // Fetch existing attendance
    const { data: record, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('id', input.attendance_id)
      .single();

    if (fetchErr || !record || !record.check_in) {
      return { data: null, error: fetchErr || new Error('Missing check-in record to clock out.') };
    }

    const checkIn = new Date(record.check_in).getTime();
    const checkOut = new Date(checkOutTime).getTime();
    const diffHours = Math.max(0, (checkOut - checkIn) / (1000 * 60 * 60));
    // Deduct 1h lunch if shift > 5 hours
    const workedHours = Number((diffHours > 5 ? Math.max(0, diffHours - 1) : diffHours).toFixed(2));

    let status: AttendanceStatus = record.status;
    if (workedHours >= record.expected_hours) {
      status = workedHours > record.expected_hours + 1 ? 'overtime' : record.status === 'late' ? 'late' : 'present';
    } else if (workedHours >= record.expected_hours / 2) {
      status = 'half_day';
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out: checkOutTime,
        worked_hours: workedHours,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.attendance_id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get attendance for an employee within a period
   */
  static async getEmployeeAttendance(
    employeeId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ data: Attendance[] | null; error: any }> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('attendance_date', periodStart)
      .lte('attendance_date', periodEnd)
      .order('attendance_date', { ascending: true });

    return { data, error };
  }

  /**
   * Pure deterministic function to detect exceptions in attendance records
   */
  static analyzeExceptions(records: Attendance[]): AttendanceException[] {
    const exceptions: AttendanceException[] = [];

    for (const rec of records) {
      if (rec.status === 'absent') {
        exceptions.push({
          employee_id: rec.employee_id,
          attendance_date: rec.attendance_date,
          type: 'absent',
          message: `Employee marked absent on ${rec.attendance_date}`,
        });
      } else if (rec.check_in && !rec.check_out) {
        exceptions.push({
          employee_id: rec.employee_id,
          attendance_date: rec.attendance_date,
          type: 'missing_checkout',
          message: `Missing check-out record on ${rec.attendance_date}`,
        });
      } else if (rec.status === 'late') {
        exceptions.push({
          employee_id: rec.employee_id,
          attendance_date: rec.attendance_date,
          type: 'late_arrival',
          message: `Late arrival recorded on ${rec.attendance_date}`,
        });
      } else if (rec.worked_hours < rec.expected_hours && rec.worked_hours > 0) {
        exceptions.push({
          employee_id: rec.employee_id,
          attendance_date: rec.attendance_date,
          type: 'insufficient_hours',
          message: `Insufficient hours worked: ${rec.worked_hours}h / ${rec.expected_hours}h on ${rec.attendance_date}`,
        });
      }
    }

    return exceptions;
  }
}
