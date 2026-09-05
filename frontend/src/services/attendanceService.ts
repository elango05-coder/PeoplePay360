import { AttendanceRecord, AttendanceStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_ATTENDANCE } from '../data/mockData';

const STORAGE_ATTENDANCE_KEY = 'peoplepay360_attendance_records';

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(isoOrTime?: string | null): string {
  if (!isoOrTime) return '--:--';
  if (isoOrTime.includes('T')) {
    const d = new Date(isoOrTime);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }
  return isoOrTime;
}

function getStoredAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_ATTENDANCE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading attendance from storage', e);
  }
  localStorage.setItem(STORAGE_ATTENDANCE_KEY, JSON.stringify(MOCK_ATTENDANCE));
  return [...MOCK_ATTENDANCE];
}

function saveStoredAttendance(list: AttendanceRecord[]): void {
  localStorage.setItem(STORAGE_ATTENDANCE_KEY, JSON.stringify(list));
}

function syncToLocalStorage(record: AttendanceRecord): void {
  const list = getStoredAttendance();
  const idx = list.findIndex(
    (r) =>
      r.id === record.id ||
      (r.employeeId === record.employeeId && r.date === record.date)
  );
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  saveStoredAttendance(list);
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

function matchesEmployeeId(recordEmpId: string, queryEmpId: string): boolean {
  if (recordEmpId === queryEmpId) return true;
  if (queryEmpId === 'aaaa1111-1111-1111-1111-111111111111' && recordEmpId === 'emp-1') return true;
  if (queryEmpId === 'emp-1' && recordEmpId === 'aaaa1111-1111-1111-1111-111111111111') return true;
  if (queryEmpId === 'aaaa2222-2222-2222-2222-222222222222' && recordEmpId === 'emp-2') return true;
  if (queryEmpId === 'emp-2' && recordEmpId === 'aaaa2222-2222-2222-2222-222222222222') return true;
  return false;
}

export const attendanceService = {
  getAttendanceRecords: async (filters?: {
    date?: string;
    department?: string;
    status?: string;
    employeeId?: string;
  }): Promise<AttendanceRecord[]> => {
    // 1. Try Supabase
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

        if (!error && data && data.length > 0) {
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
        console.warn('Supabase attendance query error, using local store:', err);
      }
    }

    // 2. Local Storage Repository
    let list = getStoredAttendance();
    if (filters?.employeeId) {
      const empId = filters.employeeId;
      list = list.filter((r) => matchesEmployeeId(r.employeeId, empId));
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

  getTodayAttendance: async (employeeId: string, dateStr?: string): Promise<AttendanceRecord | null> => {
    const targetDate = dateStr || getLocalDateString();

    // 1. Check Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('*, employee:employees(*, department:departments(*))')
          .eq('employee_id', employeeId)
          .eq('attendance_date', targetDate)
          .maybeSingle();

        if (!error && data) {
          const mapped = mapDbToAttendance(data);
          syncToLocalStorage(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getTodayAttendance error:', err);
      }
    }

    // 2. Local Storage check
    const list = getStoredAttendance();
    const found = list.find((r) => matchesEmployeeId(r.employeeId, employeeId) && r.date === targetDate);
    return found || null;
  },

  checkIn: async (
    employeeId: string,
    employeeName: string = 'Rahul Sharma',
    department: string = 'Engineering'
  ): Promise<AttendanceRecord> => {
    const today = getLocalDateString();

    // 1. Check if today's record already exists
    const existing = await attendanceService.getTodayAttendance(employeeId, today);
    if (existing && existing.checkIn && existing.checkIn !== '--:--') {
      throw new Error('You have already checked in today.');
    }

    const now = new Date();
    const checkInIso = now.toISOString();
    const checkInFormatted = formatTime(checkInIso);

    // Determine status (Punctual vs Late: cutoff 09:30 AM)
    let status: AttendanceStatus = 'Present';
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours > 9 || (hours === 9 && minutes > 30)) {
      status = 'Late';
    }

    // 2. Insert into Supabase if connected
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .upsert(
            {
              employee_id: employeeId,
              attendance_date: today,
              check_in: checkInIso,
              check_out: null,
              worked_hours: 0,
              expected_hours: 8.0,
              status: status.toLowerCase(),
              notes: status === 'Late' ? 'Late arrival recorded' : 'Standard shift check-in'
            },
            { onConflict: 'employee_id,attendance_date' }
          )
          .select('*, employee:employees(*, department:departments(*))')
          .single();

        if (!error && data) {
          const rec = mapDbToAttendance(data);
          syncToLocalStorage(rec);
          return rec;
        }
      } catch (err) {
        console.warn('Supabase check-in upsert failed, using local store:', err);
      }
    }

    // 3. Persist locally
    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `att-${Date.now()}`,
      employeeId,
      employeeName,
      employeeCode: employeeId.includes('2') ? 'EMP-1002' : 'EMP-1001',
      department,
      date: today,
      checkIn: checkInFormatted,
      checkOut: '--:--',
      workedHours: '0.0h',
      status,
      notes: status === 'Late' ? 'Late arrival recorded' : undefined
    };

    syncToLocalStorage(newRecord);
    return newRecord;
  },

  checkOut: async (employeeId: string): Promise<AttendanceRecord> => {
    const today = getLocalDateString();

    // 1. Find today's record
    const existing = await attendanceService.getTodayAttendance(employeeId, today);

    // Case 1: Check-out without check-in
    if (!existing || !existing.checkIn || existing.checkIn === '--:--') {
      throw new Error('Please check in before checking out.');
    }

    // Case 2: Check-out twice
    if (existing.checkOut && existing.checkOut !== '--:--') {
      throw new Error('You have already checked out today.');
    }

    const now = new Date();
    const checkOutIso = now.toISOString();
    const checkOutFormatted = formatTime(checkOutIso);

    // Calculate worked hours from check-in
    let workedHours = 8.0;
    if (existing.checkIn) {
      const parts = existing.checkIn.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (parts) {
        let h = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        const ampm = parts[3];
        if (ampm && ampm.toUpperCase() === 'PM' && h < 12) h += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
        const inMinutes = h * 60 + m;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (nowMinutes > inMinutes) {
          workedHours = Math.round(((nowMinutes - inMinutes) / 60) * 10) / 10;
        }
      }
    }

    // 2. Update Supabase record
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .update({
            check_out: checkOutIso,
            worked_hours: workedHours,
            updated_at: now.toISOString()
          })
          .eq('employee_id', employeeId)
          .eq('attendance_date', today)
          .select('*, employee:employees(*, department:departments(*))')
          .single();

        if (!error && data) {
          const rec = mapDbToAttendance(data);
          syncToLocalStorage(rec);
          return rec;
        }
      } catch (err) {
        console.warn('Supabase checkout update error, using local store:', err);
      }
    }

    // 3. Update local store
    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOut: checkOutFormatted,
      workedHours: `${workedHours}h`
    };

    syncToLocalStorage(updatedRecord);
    return updatedRecord;
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

        const mapped = mapDbToAttendance(upserted);
        syncToLocalStorage(mapped);
        return mapped;
      } catch (err) {
        console.error('Supabase recordAttendance error:', err);
        throw err;
      }
    }

    const newRecord: AttendanceRecord = {
      ...data,
      id: `att-${Date.now()}`
    };
    syncToLocalStorage(newRecord);
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

        const mapped = mapDbToAttendance(updated);
        syncToLocalStorage(mapped);
        return mapped;
      } catch (err) {
        console.error('Supabase correctAttendance error:', err);
        throw err;
      }
    }

    const records = await attendanceService.getAttendanceRecords();
    const existing = records.find((r) => r.id === id);
    if (!existing) throw new Error('Attendance entry not found');
    const updated: AttendanceRecord = {
      ...existing,
      ...changes,
      status: changes.status || 'Corrected'
    };
    syncToLocalStorage(updated);
    return updated;
  }
};
