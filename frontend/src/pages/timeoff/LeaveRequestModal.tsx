import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { timeOffService } from '../../services/timeOffService';
import { employeeService } from '../../services/employeeService';
import { LeaveType, Employee, LeaveBalance } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const isEmployeeRole = user?.role === 'employee';
  const defaultEmpId = user?.employeeId || (isEmployeeRole ? 'aaaa1111-1111-1111-1111-111111111111' : '');

  const [formData, setFormData] = useState({
    employeeId: defaultEmpId,
    leaveType: 'Casual' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    duration: 1,
    reason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load employees and initial balances when modal opens
  useEffect(() => {
    async function loadData() {
      const list = await employeeService.getEmployees();
      setEmployees(list);

      const targetEmpId = isEmployeeRole ? (user?.employeeId || 'aaaa1111-1111-1111-1111-111111111111') : (list[0]?.id || '');
      setFormData((prev) => ({
        ...prev,
        employeeId: targetEmpId
      }));

      if (targetEmpId) {
        const balList = await timeOffService.getLeaveBalances(targetEmpId);
        setBalances(balList);
      }
    }

    if (isOpen) {
      setFormError('');
      loadData();
    }
  }, [isOpen, user?.employeeId, isEmployeeRole]);

  // Compute duration automatically from dates
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end >= start) {
        const diffDays = Math.round((end - start) / (1000 * 3600 * 24)) + 1;
        setFormData((prev) => ({ ...prev, duration: diffDays }));
      } else {
        setFormData((prev) => ({ ...prev, duration: 0 }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  // When selected employee changes (for HR/Admin), update their balances
  const handleEmployeeChange = async (empId: string) => {
    setFormData((prev) => ({ ...prev, employeeId: empId }));
    const balList = await timeOffService.getLeaveBalances(empId);
    setBalances(balList);
  };

  const currentTypeBalance = balances.find(
    (b) => b.leaveType.toLowerCase() === formData.leaveType.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      setFormError('Please enter a justification for your leave request.');
      return;
    }

    if (new Date(formData.endDate).getTime() < new Date(formData.startDate).getTime()) {
      setFormError('End Date must be after or on Start Date.');
      return;
    }

    // Check balance if leave is paid
    if (formData.leaveType !== 'Unpaid' && currentTypeBalance) {
      if (formData.duration > currentTypeBalance.remaining) {
        setFormError(
          `Insufficient leave balance. You requested ${formData.duration} day(s), but only ${currentTypeBalance.remaining} day(s) remain for ${formData.leaveType} Leave.`
        );
        return;
      }
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const emp = employees.find((e) => e.id === formData.employeeId);
      const applicantName = emp ? `${emp.firstName} ${emp.lastName}` : (user?.name || 'Rahul Sharma');
      const applicantDept = emp?.department || (user?.department || 'Engineering');

      await timeOffService.createTimeOffRequest({
        employeeId: formData.employeeId,
        employeeName: applicantName,
        department: applicantDept,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        duration: formData.duration,
        reason: formData.reason
      });

      success('Leave Request Submitted', `Your application for ${formData.duration} day(s) of ${formData.leaveType} Leave has been submitted as Pending.`);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Leave submission error:', err);
      const msg = err.message || 'Failed to submit leave request';
      setFormError(msg);
      error('Submission Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply for Time Off"
      description="Submit a leave application for supervisor and HR review."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {formError}
          </div>
        )}

        {/* Dynamic Employee Selector / Display */}
        {isEmployeeRole ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Applicant (Self)</span>
              <span className="text-sm font-bold text-slate-900">{user?.name || 'Rahul Sharma'}</span>
              <span className="text-xs text-slate-400 block">{user?.department || 'Engineering'} Department</span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-brand-100 text-brand-800 font-semibold rounded-full">
              {user?.role}
            </span>
          </div>
        ) : (
          <Select
            label="Employee Applicant"
            value={formData.employeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.department})`
            }))}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Leave Type"
            value={formData.leaveType}
            onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as LeaveType })}
            options={[
              { value: 'Casual', label: 'Casual Leave' },
              ...(!isEmployeeRole ? [{ value: 'Annual', label: 'Annual Leave' }] : []),
              { value: 'Sick', label: 'Sick Leave' },
              { value: 'Maternity/Paternity', label: 'Maternity / Paternity Leave' },
              ...(!isEmployeeRole ? [{ value: 'Unpaid', label: 'Unpaid Leave (LWP)' }] : [])
            ]}
            required
          />

          <div className="flex flex-col justify-end">
            <span className="text-xs text-slate-500 font-medium mb-1">Current Leave Balance</span>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
              <span className="text-slate-600 font-medium">{formData.leaveType}:</span>
              <span className="font-bold text-brand-700">
                {currentTypeBalance ? `${currentTypeBalance.remaining} day(s) remaining` : 'Unlimited'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>

        <div className="flex items-center justify-between text-xs bg-brand-50/60 p-3 rounded-lg border border-brand-100 text-brand-900">
          <span>Calculated Leave Duration:</span>
          <span className="font-bold text-sm">{formData.duration} working day(s)</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Justification <span className="text-rose-500">*</span>
          </label>
          <textarea
            className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            rows={3}
            placeholder="Explain the reason for time off (e.g., family commitment, personal travel)..."
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Submit Application
          </Button>
        </div>
      </form>
    </Modal>
  );
};
