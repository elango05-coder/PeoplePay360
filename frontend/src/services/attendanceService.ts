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

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateDeterministic365Attendance(
  employeeId: string,
  employeeName?: string,
  employeeCode?: string,
  department?: string,
  existingRealRecords: AttendanceRecord[] = []
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();

  // Known employee metadata fallback
  let empName: string = employeeName || '';
  let empCode: string = employeeCode || '';
  let dept: string = department || '';

  if (!empName || empName === 'Staff Member') {
    if (employeeId.includes('1111') || employeeId === 'emp-1') {
      empName = 'Rahul Sharma';
      empCode = 'EMP-1001';
      dept = 'Engineering';
    } else if (employeeId.includes('2222') || employeeId === 'emp-2') {
      empName = 'Priya Sharma';
      empCode = 'EMP-1002';
      dept = 'Human Resources';
    } else if (employeeId.includes('3333') || employeeId === 'emp-3') {
      empName = 'Arjun Patel';
      empCode = 'EMP-1003';
      dept = 'Operations';
    } else if (employeeId.includes('4444') || employeeId === 'emp-4') {
      empName = 'Ananya Desai';
      empCode = 'EMP-1004';
      dept = 'Finance';
    } else {
      empName = 'Staff Member';
      empCode = 'EMP-1099';
      dept = 'Operations';
    }
  }

  // Ensure non-empty fallback strings
  if (!empName) empName = 'Staff Member';
  if (!empCode) empCode = 'EMP-1001';
  if (!dept) dept = 'Operations';

  // Lookup map of real records by date for this employee
  const realMap = new Map<string, AttendanceRecord>();
  for (const r of existingRealRecords) {
    if (matchesEmployeeId(r.employeeId, employeeId)) {
      realMap.set(r.date, r);
    }
  }

  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateStr = getLocalDateString(d);

    // If a real record exists for this date, ALWAYS use it!
    if (realMap.has(dateStr)) {
      const real = realMap.get(dateStr)!;
      records.push({
        ...real,
        employeeName: real.employeeName || empName,
        employeeCode: real.employeeCode || empCode,
        department: real.department || dept
      });
      continue;
    }

    // If day 0 (Today) and no real punch exists yet:
    if (i === 0) {
      records.push({
        id: `att-today-${employeeId}`,
        employeeId,
        employeeName: empName,
        employeeCode: empCode,
        department: dept,
        date: dateStr,
        checkIn: '--:--',
        checkOut: '--:--',
        workedHours: '0.0h',
        status: 'Present',
        notes: 'Shift scheduled • Awaiting punch'
      });
      continue;
    }

    // Historical days: deterministic calculation from hash
    const h = hashString(`${employeeId}:${dateStr}`);
    const mod = h % 100;

    let checkIn = '09:00 AM';
    let checkOut = '06:00 PM';
    let workedHours = '9.0h';
    let status: AttendanceStatus = 'Present';
    let notes = 'Normal biometric punch';

    if (mod < 75) {
      // 75% On-Time Present
      status = 'Present';
      const inOffset = (h % 26) - 12; // -12 to +13 mins from 09:00 AM
      const inTotalMin = 9 * 60 + inOffset;
      const inH = Math.floor(inTotalMin / 60);
      const inM = inTotalMin % 60;
      checkIn = `${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')} AM`;

      const outOffset = (h >> 3) % 36; // 0 to 35 mins after 06:00 PM
      const outTotalMin = 18 * 60 + outOffset;
      const outH = Math.floor(outTotalMin / 60) - 12;
      const outM = outTotalMin % 60;
      checkOut = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')} PM`;

      const durationHours = Math.round(((outTotalMin - inTotalMin) / 60) * 10) / 10;
      workedHours = `${durationHours.toFixed(1)}h`;
      notes = 'Punctual shift logged';
    } else if (mod < 87) {
      // 12% Late arrival
      status = 'Late';
      const inOffset = 35 + ((h >> 2) % 45); // 09:35 AM - 10:19 AM
      const inTotalMin = 9 * 60 + inOffset;
      const inH = Math.floor(inTotalMin / 60);
      const inM = inTotalMin % 60;
      checkIn = `${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')} AM`;

      const outOffset = 30 + ((h >> 4) % 40); // 06:30 PM - 07:09 PM
      const outTotalMin = 18 * 60 + outOffset;
      const outH = Math.floor(outTotalMin / 60) - 12;
      const outM = outTotalMin % 60;
      checkOut = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')} PM`;

      const durationHours = Math.round(((outTotalMin - inTotalMin) / 60) * 10) / 10;
      workedHours = `${durationHours.toFixed(1)}h`;
      const lateNotes = [
        'Traffic congestion on arterial road',
        'Metro transport signal delay',
        'Commute weather delay'
      ];
      notes = lateNotes[h % lateNotes.length];
    } else if (mod < 92) {
      // 5% Absent
      status = 'Absent';
      checkIn = '--:--';
      checkOut = '--:--';
      workedHours = '0.0h';
      const absentNotes = [
        'Approved Casual Leave',
        'Medical / Sick Leave with documentation',
        'Authorized personal leave'
      ];
      notes = absentNotes[h % absentNotes.length];
    } else if (mod < 96) {
      // 4% Half Day
      status = 'Half Day';
      checkIn = '09:05 AM';
      checkOut = '01:15 PM';
      workedHours = '4.2h';
      notes = 'Half-day approved personal emergency';
    } else {
      // 4% Overtime
      status = 'Overtime';
      checkIn = '08:50 AM';
      const outOffset = 30 + ((h >> 5) % 60); // 08:30 PM - 09:29 PM
      const outTotalMin = 20 * 60 + outOffset;
      const outH = Math.floor(outTotalMin / 60) - 12;
      const outM = outTotalMin % 60;
      checkOut = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')} PM`;
      const durationHours = Math.round(((outTotalMin - (8 * 60 + 50)) / 60) * 10) / 10;
      workedHours = `${durationHours.toFixed(1)}h`;
      const otNotes = [
        'Release deployment sprint overtime',
        'Quarterly financial reconciliation audit',
        'Critical client onboarding deployment'
      ];
      notes = otNotes[h % otNotes.length];
    }

    records.push({
      id: `att-mock-${employeeId}-${dateStr}`,
      employeeId,
      employeeName: empName,
      employeeCode: empCode,
      department: dept,
      date: dateStr,
      checkIn,
      checkOut,
      workedHours,
      status,
      notes
    });
  }

  return records;
}

export const attendanceService = {
  getAttendanceRecords: async (filters?: {
    date?: string;
    department?: string;
    status?: string;
    employeeId?: string;
  }): Promise<AttendanceRecord[]> => {
    // 1. Gather all real records from Supabase and local store
    const realRecords: AttendanceRecord[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('attendance')
          .select('*, employee:employees(*, department:departments(*))');

        if (filters?.employeeId) {
          query = query.eq('employee_id', filters.employeeId);
        }

        const { data, error } = await query.order('attendance_date', { ascending: false });
        if (!error && data && data.length > 0) {
          realRecords.push(...data.map(mapDbToAttendance));
        }
      } catch (err) {
        console.warn('Supabase query error:', err);
      }
    }

    // Merge in any records from local store that are not yet in realRecords
    const stored = getStoredAttendance();
    for (const s of stored) {
      if (!realRecords.some((r) => r.id === s.id || (r.employeeId === s.employeeId && r.date === s.date))) {
        realRecords.push(s);
      }
    }

    // 2. Generate 365-day dataset
    const targetEmployeeId = filters?.employeeId || 'aaaa1111-1111-1111-1111-111111111111';
    let records = generateDeterministic365Attendance(
      targetEmployeeId,
      undefined,
      undefined,
      filters?.department !== 'All' ? filters?.department : undefined,
      realRecords
    );

    // 3. Apply optional filters
    if (filters?.date) {
      records = records.filter((r) => r.date === filters.date);
    }
    if (filters?.department && filters.department !== 'All') {
      records = records.filter((r) => r.department === filters.department);
    }
    if (filters?.status && filters.status !== 'All') {
      records = records.filter((r) => r.status === filters.status);
    }

    return records;
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
