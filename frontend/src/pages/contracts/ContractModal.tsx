import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { contractService } from '../../services/contractService';
import { employeeService } from '../../services/employeeService';
import { salaryService } from '../../services/salaryService';
import { Contract, Employee, SalaryStructure, ContractStatus } from '../../types';
import { useToast } from '../../context/ToastContext';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Contract | null;
  preselectedEmployeeId?: string;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
  preselectedEmployeeId
}) => {
  const { success, error } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);

  const [formData, setFormData] = useState({
    employeeId: '',
    contractNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    wage: 50000,
    department: 'Engineering',
    jobPosition: '',
    salaryStructureId: '',
    status: 'Active' as ContractStatus,
    terms: 'Standard employment agreement governing hours, compensation, and confidentiality.'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadDropdowns() {
      const [empList, strList] = await Promise.all([
        employeeService.getEmployees(),
        salaryService.getStructures()
      ]);
      setEmployees(empList);
      setStructures(strList);

      if (!initialData) {
        const empId = preselectedEmployeeId || (empList[0]?.id || '');
        const targetEmp = empList.find((e) => e.id === empId);
        setFormData((prev) => ({
          ...prev,
          employeeId: empId,
          contractNumber: `CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          department: targetEmp?.department || 'Engineering',
          jobPosition: targetEmp?.position || '',
          salaryStructureId: strList[0]?.id || ''
        }));
      }
    }
    if (isOpen) {
      loadDropdowns();
    }
  }, [isOpen, initialData, preselectedEmployeeId]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId,
        contractNumber: initialData.contractNumber,
        startDate: initialData.startDate,
        endDate: initialData.endDate || '',
        wage: initialData.wage,
        department: initialData.department,
        jobPosition: initialData.jobPosition,
        salaryStructureId: initialData.salaryStructureId,
        status: initialData.status,
        terms: initialData.terms || ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setFormData((prev) => ({
      ...prev,
      employeeId: empId,
      department: emp?.department || prev.department,
      jobPosition: emp?.position || prev.jobPosition
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.employeeId) errs.employeeId = 'Employee selection is required';
    if (!formData.contractNumber) errs.contractNumber = 'Contract number is required';
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (formData.wage <= 0) errs.wage = 'Wage must be greater than zero';
    if (!formData.jobPosition) errs.jobPosition = 'Job position is required';
    if (!formData.salaryStructureId) errs.salaryStructureId = 'Salary structure must be assigned';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find((e) => e.id === formData.employeeId);
      const selectedStr = structures.find((s) => s.id === formData.salaryStructureId);

      const payload = {
        ...formData,
        employeeName: selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Employee',
        salaryStructureName: selectedStr ? selectedStr.name : 'Standard Structure'
      };

      if (initialData) {
        await contractService.updateContract(initialData.id, payload);
        success('Contract Updated', `Contract ${formData.contractNumber} successfully revised.`);
      } else {
        await contractService.createContract(payload);
        success('Contract Created', `Contract ${formData.contractNumber} registered.`);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      error('Failed to save contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Contract Agreement' : 'New Employment Contract'}
      description="Define wage, tenure, and applicable compensation rule structure."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Employee"
            value={formData.employeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.code})`
            }))}
            error={errors.employeeId}
            required
          />

          <Input
            label="Contract Number"
            value={formData.contractNumber}
            onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
            placeholder="CTR-2026-001"
            error={errors.contractNumber}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
          />

          <Input
            label="Job Position"
            value={formData.jobPosition}
            onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
            placeholder="e.g. Senior Software Engineer"
            error={errors.jobPosition}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Gross Monthly Wage (₹)"
            type="number"
            value={formData.wage}
            onChange={(e) => setFormData({ ...formData, wage: Number(e.target.value) })}
            error={errors.wage}
            required
          />

          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />

          <Input
            label="End Date (Optional)"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            hint="Leave blank for permanent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Assigned Salary Structure"
            value={formData.salaryStructureId}
            onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
            options={structures.map((s) => ({
              value: s.id,
              label: s.name
            }))}
            error={errors.salaryStructureId}
            required
          />

          <Select
            label="Contract Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ContractStatus })}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Expired', label: 'Expired' },
              { value: 'Terminated', label: 'Terminated' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Contract Terms & Notes
          </label>
          <textarea
            value={formData.terms}
            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
            rows={3}
            className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Special allowances, bonus schedules, or probation terms..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Update Contract' : 'Register Contract'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
