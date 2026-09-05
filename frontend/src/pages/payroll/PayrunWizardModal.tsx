import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Layers, 
  Calendar, 
  Users, 
  CheckCircle2, 
  DollarSign, 
  Building2,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { payrollService } from '../../services/payrollService';
import { salaryService } from '../../services/salaryService';
import { employeeService } from '../../services/employeeService';
import { SalaryStructure, Employee } from '../../types';
import { useToast } from '../../context/ToastContext';

interface PayrunWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PayrunWizardModal: React.FC<PayrunWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Step 1: Scope & Period
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [payrunName, setPayrunName] = useState('October 2026 Monthly Payrun');
  const [periodMonth, setPeriodMonth] = useState('October');
  const [periodYear, setPeriodYear] = useState(2026);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Step 2: Employee Selection
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [strList, empList] = await Promise.all([
        salaryService.getStructures(),
        employeeService.getEmployees()
      ]);
      setStructures(strList);
      setEmployees(empList);
      if (strList.length > 0) {
        setSelectedStructureId(strList[0].id);
      }
      setSelectedEmployeeIds(empList.map((e) => e.id)); // Default select all
    }
    if (isOpen) {
      loadData();
      setCurrentStep(1);
    }
  }, [isOpen]);

  const toggleEmployee = (empId: string) => {
    if (selectedEmployeeIds.includes(empId)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== empId));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, empId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map((e) => e.id));
    }
  };

  const selectedStructure = structures.find((s) => s.id === selectedStructureId);

  const handleSubmit = async () => {
    if (selectedEmployeeIds.length === 0) {
      error('Selection Required', 'Please select at least one employee for this payroll cycle.');
      return;
    }

    setIsSubmitting(true);
    try {
      const estimatedGross = selectedEmployeeIds.length * 52000;
      const estimatedDeductions = selectedEmployeeIds.length * 4800;

      await payrollService.createPayrun({
        name: payrunName,
        salaryStructureId: selectedStructureId,
        salaryStructureName: selectedStructure ? selectedStructure.name : 'Standard Structure',
        periodMonth,
        periodYear,
        startDate,
        endDate,
        employeeCount: selectedEmployeeIds.length,
        grossTotal: estimatedGross,
        deductionTotal: estimatedDeductions,
        netTotal: estimatedGross - estimatedDeductions,
        status: 'Draft'
      });

      success('Payrun Created', `Payrun "${payrunName}" initialized as Draft for review.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      error('Failed to create payrun');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Payroll Run"
      description="Two-step payroll initialization wizard: define scope & period, then select in-scope employees."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Header */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <div
            className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentStep === 1
                ? 'bg-white text-violet-950 shadow-xs font-bold'
                : 'text-slate-500'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 1 ? 'bg-violet-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              1
            </span>
            <span>Step 1: Scope & Period</span>
          </div>

          <div
            className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentStep === 2
                ? 'bg-white text-violet-950 shadow-xs font-bold'
                : 'text-slate-500'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 2 ? 'bg-violet-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              2
            </span>
            <span>Step 2: Employee Selection</span>
          </div>
        </div>

        {/* STEP 1: Payroll Scope & Period */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Input
              label="Payrun Batch Name"
              value={payrunName}
              onChange={(e) => setPayrunName(e.target.value)}
              placeholder="e.g. October 2026 Monthly Payrun"
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applied Salary Structure
              </label>
              <Select
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                options={structures.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.rules?.length || 0} Rules)`
                }))}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Defines the sequential computation rules (Earnings &rarr; Deductions &rarr; Net).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payroll Month
                </label>
                <Select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  options={[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m) => ({ value: m, label: m }))}
                />
              </div>
              <Input
                label="Payroll Year"
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(parseInt(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cycle Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="Cycle End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {/* STEP 2: Employee Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-heading">
                  Eligible Employees ({selectedEmployeeIds.length} of {employees.length} Selected)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select active staff to include in this calculation cycle.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-violet-700 hover:text-violet-800"
              >
                {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {employees.map((emp) => {
                const isSelected = selectedEmployeeIds.includes(emp.id);

                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {emp.code} &bull; {emp.department} &bull; {emp.position}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Eligible
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {currentStep === 1 ? (
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Back to Scope
            </Button>
          )}

          {currentStep === 1 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentStep(2)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Continue to Employee Selection
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSubmit}
              rightIcon={<Check className="w-4 h-4" />}
            >
              Create Payrun Batch
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
