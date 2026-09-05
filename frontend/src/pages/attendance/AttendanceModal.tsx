import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { AttendanceRecord, AttendanceStatus, Employee } from '../../types';
import { useToast } from '../../context/ToastContext';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: AttendanceRecord | null;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData
}) => {
  const { success, error } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00 AM',
    checkOut: '06:00 PM',
    workedHours: '9.0 hrs',
    status: 'Present' as AttendanceStatus,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadEmployees() {
      const list = await employeeService.getEmployees();
      setEmployees(list);
      if (!initialData && list.length > 0) {
        setFormData((prev) => ({ ...prev, employeeId: list[0].id }));
      }
    }
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId,
        date: initialData.date,
        checkIn: initialData.checkIn,
        checkOut: initialData.checkOut,
        workedHours: initialData.workedHours,
        status: initialData.status,
        notes: initialData.notes || ''
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find((e) => e.id === formData.employeeId);

      if (initialData) {
        await attendanceService.correctAttendance(initialData.id, {
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          status: 'Corrected',
          notes: formData.notes ? `Correction: ${formData.notes}` : 'Manual time correction applied'
        });
        success('Attendance Corrected', 'Punches updated and flagged as corrected.');
      } else {
        await attendanceService.recordAttendance({
          employeeId: formData.employeeId,
          employeeName: selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Employee',
          employeeCode: selectedEmp?.code || 'EMP-0000',
          department: selectedEmp?.department || 'Engineering',
          date: formData.date,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          workedHours: formData.workedHours,
          status: formData.status,
          notes: formData.notes
        });
        success('Attendance Logged', 'Attendance record added.');
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      error('Failed to update attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Correct Attendance Record' : 'Manual Attendance Entry'}
      description="Record check-in/out timestamps and regularize shift hours."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialData ? (
          <Select
            label="Employee"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.code})`
            }))}
            required
          />
        ) : (
          <div className="p-3 bg-slate-50 rounded-lg text-xs">
            <span className="text-slate-500">Correcting record for: </span>
            <strong className="text-slate-900">{initialData.employeeName}</strong> &bull; {initialData.date}
          </div>
        )}

        <Input
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Check In Time"
            value={formData.checkIn}
            onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
            placeholder="09:00 AM"
            required
          />
          <Input
            label="Check Out Time"
            value={formData.checkOut}
            onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
            placeholder="06:00 PM"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Worked Hours"
            value={formData.workedHours}
            onChange={(e) => setFormData({ ...formData, workedHours: e.target.value })}
            placeholder="e.g. 9.0 hrs"
            required
          />

          <Select
            label="Attendance Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
            options={[
              { value: 'Present', label: 'Present' },
              { value: 'Late', label: 'Late' },
              { value: 'Absent', label: 'Absent' },
              { value: 'Overtime', label: 'Overtime' },
              { value: 'Missing Checkout', label: 'Missing Checkout' },
              { value: 'Corrected', label: 'Corrected' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Correction Justification / Reason
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Reason for biometric regularization or timing correction..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Save Correction' : 'Log Attendance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
