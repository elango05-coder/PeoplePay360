import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Employee, EmployeeType, EmployeeStatus } from '../../types';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Employee, 'id'>) => Promise<void>;
  initialData?: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    code: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '1995-01-01',
    joiningDate: new Date().toISOString().split('T')[0],
    department: 'Engineering',
    position: '',
    employeeType: 'Full-Time' as EmployeeType,
    status: 'Active' as EmployeeStatus,
    managerName: '',
    workingSchedule: 'Standard General Shift (9:00 AM - 6:00 PM)',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: '',
    panNumber: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code,
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        email: initialData.email,
        phone: initialData.phone,
        dob: initialData.dob,
        joiningDate: initialData.joiningDate,
        department: initialData.department,
        position: initialData.position,
        employeeType: initialData.employeeType,
        status: initialData.status,
        managerName: initialData.managerName || '',
        workingSchedule: initialData.workingSchedule || 'Standard General Shift (9:00 AM - 6:00 PM)',
        bankName: initialData.bankName || '',
        accountNumber: initialData.accountNumber || '',
        ifscCode: initialData.ifscCode || '',
        panNumber: initialData.panNumber || ''
      });
    } else {
      setFormData({
        code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '1995-01-01',
        joiningDate: new Date().toISOString().split('T')[0],
        department: 'Engineering',
        position: '',
        employeeType: 'Full-Time',
        status: 'Active',
        managerName: 'Arjun Patel',
        workingSchedule: 'Standard General Shift (9:00 AM - 6:00 PM)',
        bankName: 'HDFC Bank',
        accountNumber: '',
        ifscCode: 'HDFC0001234',
        panNumber: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid corporate email is required';
    if (!formData.code.trim()) errs.code = 'Employee code is required';
    if (!formData.position.trim()) errs.position = 'Designation/position is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        avatarUrl: initialData?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Employee Profile' : 'Add New Employee'}
      description="Enter personal, employment, and statutory bank details."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Basic Info */}
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            1. Identity & Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Employee Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={errors.code}
              required
            />
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              error={errors.lastName}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>
        </div>

        {/* Section 2: Department & Role */}
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            2. Employment & Schedule
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              options={[
                { value: 'Engineering', label: 'Engineering' },
                { value: 'Human Resources', label: 'Human Resources' },
                { value: 'Finance', label: 'Finance' },
                { value: 'Operations', label: 'Operations' },
                { value: 'Executive', label: 'Executive' }
              ]}
            />
            <Input
              label="Job Position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
              error={errors.position}
              required
            />
            <Input
              label="Reporting Manager"
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              placeholder="Manager name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <Select
              label="Employment Type"
              value={formData.employeeType}
              onChange={(e) => setFormData({ ...formData, employeeType: e.target.value as EmployeeType })}
              options={[
                { value: 'Full-Time', label: 'Full-Time' },
                { value: 'Part-Time', label: 'Part-Time' },
                { value: 'Contractor', label: 'Contractor' },
                { value: 'Intern', label: 'Intern' }
              ]}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'On Leave', label: 'On Leave' },
                { value: 'Terminated', label: 'Terminated' }
              ]}
            />
            <Input
              label="Joining Date"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
            />
          </div>
        </div>

        {/* Section 3: Statutory & Banking Details */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            3. Statutory & Bank Accounts (For Payroll Disbursal)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Bank Name"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="HDFC Bank"
            />
            <Input
              label="Bank Account Number"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="5010023498112"
            />
            <Input
              label="IFSC Code"
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
              placeholder="HDFC0001234"
            />
            <Input
              label="PAN Number"
              value={formData.panNumber}
              onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Save Changes' : 'Create Employee Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
