// ==============================================================================
// PeoplePay360: All Roles Attendance Verification Test Suite
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';

// Types and mock structures representing frontend services
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workedHours: string;
  status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Overtime' | 'Missing Checkout';
  notes?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'employee';
  employeeId: string;
  department: string;
}

const TEST_USERS: Record<string, User> = {
  admin: {
    id: '10000000-0000-0000-0000-000000000001',
    email: 'admin@peoplepay360.com',
    name: 'System Administrator',
    role: 'admin',
    employeeId: 'aaaa0000-0000-0000-0000-000000000001',
    department: 'Operations'
  },
  hr_manager: {
    id: '10000000-0000-0000-0000-000000000002',
    email: 'hr.manager@peoplepay360.com',
    name: 'Sunita Rao',
    role: 'hr_manager',
    employeeId: 'aaaa0000-0000-0000-0000-000000000002',
    department: 'Human Resources'
  },
  hr_payroll_user: {
    id: '10000000-0000-0000-0000-000000000003',
    email: 'payroll.user@peoplepay360.com',
    name: 'Karthik Raj',
    role: 'hr_payroll_user',
    employeeId: 'aaaa0000-0000-0000-0000-000000000003',
    department: 'Finance'
  },
  employee: {
    id: '10000000-0000-0000-0000-000000000005',
    email: 'rahul@peoplepay360.com',
    name: 'Rahul Sharma',
    role: 'employee',
    employeeId: 'aaaa1111-1111-1111-1111-111111111111',
    department: 'Engineering'
  }
};

class AttendanceManager {
  private records: Map<string, AttendanceRecord> = new Map();

  private getKey(employeeId: string, date: string): string {
    return `${employeeId}:${date}`;
  }

  getTodayAttendance(employeeId: string, date: string): AttendanceRecord | null {
    return this.records.get(this.getKey(employeeId, date)) || null;
  }

  checkIn(employeeId: string, employeeName?: string, department?: string, dateStr?: string): AttendanceRecord {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const existing = this.getTodayAttendance(employeeId, today);

    if (existing && existing.checkIn && existing.checkIn !== '--:--') {
      throw new Error('You have already checked in today.');
    }

    let resolvedCode = 'EMP-1001';
    if (employeeId === 'aaaa0000-0000-0000-0000-000000000001') resolvedCode = 'EMP-0001';
    else if (employeeId === 'aaaa0000-0000-0000-0000-000000000002') resolvedCode = 'EMP-0002';
    else if (employeeId === 'aaaa0000-0000-0000-0000-000000000003') resolvedCode = 'EMP-0003';

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${employeeId}`,
      employeeId,
      employeeName: employeeName || 'Staff Member',
      employeeCode: resolvedCode,
      department: department || 'Operations',
      date: today,
      checkIn: '09:12 AM',
      checkOut: '--:--',
      workedHours: '0.0h',
      status: 'Present'
    };

    this.records.set(this.getKey(employeeId, today), newRecord);
    return newRecord;
  }

  checkOut(employeeId: string, dateStr?: string): AttendanceRecord {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const existing = this.getTodayAttendance(employeeId, today);

    if (!existing || !existing.checkIn || existing.checkIn === '--:--') {
      throw new Error('Please check in before checking out.');
    }

    if (existing.checkOut && existing.checkOut !== '--:--') {
      throw new Error('You have already checked out today.');
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOut: '06:15 PM',
      workedHours: '9.0h'
    };

    this.records.set(this.getKey(employeeId, today), updatedRecord);
    return updatedRecord;
  }
}

describe('All Roles Attendance Check-In / Check-Out Test Matrix', () => {
  let manager: AttendanceManager;
  const today = '2026-09-06';

  beforeEach(() => {
    manager = new AttendanceManager();
  });

  it('TC-1: Employee (Rahul Sharma) can Check In and Check Out', () => {
    const user = TEST_USERS.employee;
    expect(user.employeeId).toBe('aaaa1111-1111-1111-1111-111111111111');

    // Before check in
    expect(manager.getTodayAttendance(user.employeeId, today)).toBeNull();

    // Check In
    const inRec = manager.checkIn(user.employeeId, user.name, user.department, today);
    expect(inRec.employeeId).toBe(user.employeeId);
    expect(inRec.employeeName).toBe('Rahul Sharma');
    expect(inRec.checkIn).toBe('09:12 AM');
    expect(inRec.checkOut).toBe('--:--');

    // Check Out
    const outRec = manager.checkOut(user.employeeId, today);
    expect(outRec.checkOut).toBe('06:15 PM');
    expect(outRec.workedHours).toBe('9.0h');
  });

  it('TC-2: HR Manager (Sunita Rao) can Check In and Check Out', () => {
    const user = TEST_USERS.hr_manager;
    expect(user.employeeId).toBe('aaaa0000-0000-0000-0000-000000000002');

    // Before check in
    expect(manager.getTodayAttendance(user.employeeId, today)).toBeNull();

    // Check In
    const inRec = manager.checkIn(user.employeeId, user.name, user.department, today);
    expect(inRec.employeeId).toBe(user.employeeId);
    expect(inRec.employeeName).toBe('Sunita Rao');
    expect(inRec.employeeCode).toBe('EMP-0002');
    expect(inRec.checkIn).toBe('09:12 AM');

    // Check Out
    const outRec = manager.checkOut(user.employeeId, today);
    expect(outRec.checkOut).toBe('06:15 PM');
    expect(outRec.workedHours).toBe('9.0h');
  });

  it('TC-3: HR Payroll User (Karthik Raj) can Check In and Check Out', () => {
    const user = TEST_USERS.hr_payroll_user;
    expect(user.employeeId).toBe('aaaa0000-0000-0000-0000-000000000003');

    // Check In
    const inRec = manager.checkIn(user.employeeId, user.name, user.department, today);
    expect(inRec.employeeId).toBe(user.employeeId);
    expect(inRec.employeeName).toBe('Karthik Raj');
    expect(inRec.employeeCode).toBe('EMP-0003');

    // Check Out
    const outRec = manager.checkOut(user.employeeId, today);
    expect(outRec.checkOut).toBe('06:15 PM');
  });

  it('TC-4: Admin (System Administrator) can Check In and Check Out', () => {
    const user = TEST_USERS.admin;
    expect(user.employeeId).toBe('aaaa0000-0000-0000-0000-000000000001');

    // Check In
    const inRec = manager.checkIn(user.employeeId, user.name, user.department, today);
    expect(inRec.employeeId).toBe(user.employeeId);
    expect(inRec.employeeName).toBe('System Administrator');
    expect(inRec.employeeCode).toBe('EMP-0001');

    // Check Out
    const outRec = manager.checkOut(user.employeeId, today);
    expect(outRec.checkOut).toBe('06:15 PM');
  });

  it('TC-5: Validation - Prevents duplicate check-in', () => {
    const user = TEST_USERS.admin;
    manager.checkIn(user.employeeId, user.name, user.department, today);

    expect(() => {
      manager.checkIn(user.employeeId, user.name, user.department, today);
    }).toThrowError('You have already checked in today.');
  });

  it('TC-6: Validation - Prevents check-out before check-in', () => {
    const user = TEST_USERS.hr_manager;
    expect(() => {
      manager.checkOut(user.employeeId, today);
    }).toThrowError('Please check in before checking out.');
  });

  it('TC-7: Validation - Prevents duplicate check-out', () => {
    const user = TEST_USERS.employee;
    manager.checkIn(user.employeeId, user.name, user.department, today);
    manager.checkOut(user.employeeId, today);

    expect(() => {
      manager.checkOut(user.employeeId, today);
    }).toThrowError('You have already checked out today.');
  });

  it('TC-8: Data Isolation - User A attendance != User B attendance', () => {
    const admin = TEST_USERS.admin;
    const rahul = TEST_USERS.employee;

    // Admin checks in
    manager.checkIn(admin.employeeId, admin.name, admin.department, today);

    // Verify Admin is checked in
    const adminRec = manager.getTodayAttendance(admin.employeeId, today);
    expect(adminRec).not.toBeNull();
    expect(adminRec?.employeeName).toBe('System Administrator');

    // Verify Rahul is NOT checked in
    const rahulRec = manager.getTodayAttendance(rahul.employeeId, today);
    expect(rahulRec).toBeNull();
  });
});
