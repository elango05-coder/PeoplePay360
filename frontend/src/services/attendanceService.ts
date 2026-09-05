import { AttendanceRecord, AttendanceStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_ATTENDANCE } from '../data/mockData';

function formatTime(isoOrTime?: string | null): string {
  if (!isoOrTime) return '--:--';
  if (isoOrTime.includes('T')) {
    const d = new Date(isoOrTime);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return isoOrTime;
}

function mapDbToAttendance(dbAtt: any): AttendanceRecord {
  const employeeName = dbAtt.employee
    ? `${dbAtt.employee.first_name} ${dbAtt.employee.last_name}`.trim()
    : 'Staff Member';

  const employeeCode = dbAtt.employee?.employee_code || 'EMP';
  const deptName = dbAtt.employee?.department?.name || 'Operations';

  let status: AttendanceStatus = 'Present';
  if (dbAtt.status === 'late') status = 'Late';
  else if (dbAtt.status === 'absent') status = 'Absent';
  else if (dbAtt.status === 'overtime') status = 'Overtime';
  else if (dbAtt.check_in && !dbAtt.check_out) status = 'Missing Checkout';
  else if (dbAtt.notes?.includes('Corrected')) status = 'Corrected';

  const workedHoursStr = dbAtt.worked_hours
    ? `${Number(dbAtt.worked_hours).toFixed(1)}h`
    : dbAtt.check_in && dbAtt.check_out
    ? '8.0h'
    : '0.0h';

  return {
    id: dbAtt.id,
    employeeId: dbAtt.employee_id,
    employeeName,
    employeeCode,
    department: deptName,
    date: dbAtt.attendance_date,
    checkIn: formatTime(dbAtt.check_in),
    checkOut: formatTime(dbAtt.check_out),
    workedHours: workedHoursStr,
    status,
    notes: dbAtt.notes || undefined
  };
}

export const attendanceService = {
  getAttendanceRecords: async (filters?: {
    date?: string;
    department?: string;
    status?: string;
    employeeId?: string;
  }): Promise<AttendanceRecord[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('attendance')
          .select('*, employee:employees(*, department:departments(*))');

        if (filters?.employeeId) {
          query = query.eq('employee_id', filters.employeeId);
        }

        if (filters?.date) {
          query = query.eq('attendance_date', filters.date);
        }

        const { data, error } = await query.order('attendance_date', { ascending: false });

        if (error) {
          console.warn('Supabase attendance query error, fallback to local', error);
        } else if (data && data.length > 0) {
          let list = data.map(mapDbToAttendance);

          if (filters?.department && filters.department !== 'All') {
            list = list.filter((r) => r.department === filters.department);
          }

          if (filters?.status && filters.status !== 'All') {
            list = list.filter((r) => r.status === filters.status);
          }

          return list;
        }
      } catch (err) {
        console.error('Supabase attendance error:', err);
      }
    }

    // Fallback to local / mock
    let list = [...MOCK_ATTENDANCE];
    if (filters?.employeeId) {
      const empId = filters.employeeId;
      list = list.filter((r) =>
        r.employeeId === empId ||
        (empId === 'aaaa1111-1111-1111-1111-111111111111' && r.employeeId === 'emp-1') ||
        (empId === 'emp-1' && r.employeeId === 'aaaa1111-1111-1111-1111-111111111111') ||
        (empId === 'aaaa2222-2222-2222-2222-222222222222' && r.employeeId === 'emp-2') ||
        (empId === 'emp-2' && r.employeeId === 'aaaa2222-2222-2222-2222-222222222222')
      );
    }
    if (filters?.date) {
      list = list.filter((r) => r.date === filters.date);
    }
    if (filters?.department && filters.department !== 'All') {
      list = list.filter((r) => r.department === filters.department);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter((r) => r.status === filters.status);
    }
    return list;
  },

  getAttendanceMetrics: async (params?: { date?: string; employeeId?: string }) => {
    const records = await attendanceService.getAttendanceRecords(params);
    const present = records.filter((r) => r.status === 'Present' || r.status === 'Overtime' || r.status === 'Corrected').length;
    const late = records.filter((r) => r.status === 'Late').length;
    const absent = records.filter((r) => r.status === 'Absent').length;
    const missingCheckout = records.filter((r) => r.status === 'Missing Checkout').length;

    return {
      total: records.length,
      present,
      late,
      absent,
      missingCheckout
    };
  },

  recordAttendance: async (data: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const checkInIso = data.checkIn !== '--:--' ? `${data.date}T${data.checkIn}:00Z` : null;
        const checkOutIso = data.checkOut !== '--:--' ? `${data.date}T${data.checkOut}:00Z` : null;

        let statusStr = 'present';
        if (data.status === 'Late') statusStr = 'late';
        else if (data.status === 'Absent') statusStr = 'absent';
        else if (data.status === 'Overtime') statusStr = 'overtime';

        const workedNum = parseFloat(data.workedHours.replace('h', '')) || 8.0;

        const { data: upserted, error } = await supabase
          .from('attendance')
          .upsert(
            {
              employee_id: data.employeeId,
              attendance_date: data.date,
              check_in: checkInIso,
              check_out: checkOutIso,
              worked_hours: workedNum,
              expected_hours: 8.0,
              status: statusStr,
              notes: data.notes || null
            },
            { onConflict: 'employee_id,attendance_date' }
          )
          .select('*, employee:employees(*, department:departments(*))')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapDbToAttendance(upserted);
      } catch (err) {
        console.error('Supabase recordAttendance error:', err);
        throw err;
      }
    }

    const newRecord: AttendanceRecord = {
      ...data,
      id: `att-${Date.now()}`
    };
    return newRecord;
  },

  correctAttendance: async (
    id: string,
    changes: { checkIn?: string; checkOut?: string; status?: AttendanceStatus; notes?: string }
  ): Promise<AttendanceRecord> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: any = {
          notes: changes.notes || 'Corrected manually',
          updated_at: new Date().toISOString()
        };

        if (changes.status) {
          let statusStr = 'present';
          if (changes.status === 'Late') statusStr = 'late';
          else if (changes.status === 'Absent') statusStr = 'absent';
          else if (changes.status === 'Overtime') statusStr = 'overtime';
          updatePayload.status = statusStr;
        }

        const { data: updated, error } = await supabase
          .from('attendance')
          .update(updatePayload)
          .eq('id', id)
          .select('*, employee:employees(*, department:departments(*))')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapDbToAttendance(updated);
      } catch (err) {
        console.error('Supabase correctAttendance error:', err);
        throw err;
      }
    }

    const records = await attendanceService.getAttendanceRecords();
    const existing = records.find((r) => r.id === id);
    if (!existing) throw new Error('Attendance entry not found');
    return {
      ...existing,
      ...changes,
      status: changes.status || 'Corrected'
    };
  }
};
