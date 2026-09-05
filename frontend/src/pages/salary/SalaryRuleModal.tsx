import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { salaryService } from '../../services/salaryService';
import { SalaryRule, RuleCategory, ComputationType } from '../../types';
import { useToast } from '../../context/ToastContext';

interface SalaryRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  structureId: string;
  nextSequence: number;
  onSaved: () => void;
  initialData?: SalaryRule | null;
}

export const SalaryRuleModal: React.FC<SalaryRuleModalProps> = ({
  isOpen,
  onClose,
  structureId,
  nextSequence,
  onSaved,
  initialData
}) => {
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Allowance' as RuleCategory,
    computationType: 'Fixed' as ComputationType,
    value: '2000',
    sequence: nextSequence,
    status: 'Active' as 'Active' | 'Inactive',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        code: initialData.code,
        category: initialData.category,
        computationType: initialData.computationType,
        value: String(initialData.value),
        sequence: initialData.sequence,
        status: initialData.status,
        description: initialData.description || ''
      });
    } else {
      setFormData({
        name: '',
        code: '',
        category: 'Allowance',
        computationType: 'Fixed',
        value: '2000',
        sequence: nextSequence,
        status: 'Active',
        description: ''
      });
    }
    setFormErrors({});
  }, [initialData, nextSequence, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Rule name is required';
    if (!formData.code.trim()) errs.code = 'Rule code is required';
    if (!formData.value.trim()) errs.value = 'Value or formula is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (initialData) {
        await salaryService.updateRule(structureId, initialData.id, {
          name: formData.name,
          code: formData.code.toUpperCase(),
          category: formData.category,
          computationType: formData.computationType,
          value: formData.value,
          sequence: formData.sequence,
          status: formData.status,
          description: formData.description
        });
        success('Salary Rule Updated', `Rule ${formData.name} updated.`);
      } else {
        await salaryService.addRuleToStructure(structureId, {
          name: formData.name,
          code: formData.code.toUpperCase(),
          category: formData.category,
          computationType: formData.computationType,
          value: formData.value,
          sequence: formData.sequence,
          status: formData.status,
          description: formData.description
        });
        success('Salary Rule Added', `Rule ${formData.name} added to sequence.`);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      error('Failed to save salary rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Salary Calculation Rule' : 'Add Salary Component Rule'}
      description="Define earning/deduction parameters, sequence precedence, and calculation formulas."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Rule Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. House Rent Allowance"
            error={formErrors.name}
            required
          />

          <Input
            label="Rule Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g. HRA"
            error={formErrors.code}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as RuleCategory })}
            options={[
              { value: 'Basic', label: 'Basic Salary' },
              { value: 'Allowance', label: 'Allowance (Earning)' },
              { value: 'Deduction', label: 'Deduction' }
            ]}
          />

          <Select
            label="Computation Type"
            value={formData.computationType}
            onChange={(e) => setFormData({ ...formData, computationType: e.target.value as ComputationType })}
            options={[
              { value: 'Fixed', label: 'Fixed Amount (₹)' },
              { value: 'Percentage', label: 'Percentage (%)' },
              { value: 'Formula', label: 'Custom Formula' }
            ]}
          />

          <Input
            label="Sequence Order"
            type="number"
            value={formData.sequence}
            onChange={(e) => setFormData({ ...formData, sequence: Number(e.target.value) })}
            min={1}
            required
          />
        </div>

        <Input
          label="Value / Formula Specification"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          placeholder="e.g. 40% of Basic, 3000, or Gross - (Basic + HRA)"
          error={formErrors.value}
          hint="Specify fixed numbers or percentage/formula representations"
          required
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Rule Description / Statutory Reference
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Statutory EPF clause or allowance criteria..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Update Rule' : 'Append Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
