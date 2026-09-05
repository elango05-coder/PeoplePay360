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
  Sparkles 
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

  const [currentStep, setCurrentStep] = useState(1);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Wizard state
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [payrunName, setPayrunName] = useState('September 2026 Monthly Payrun');
  const [periodMonth, setPeriodMonth] = useState('September');
  const [periodYear, setPeriodYear] = useState(2026);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
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

  // Approximate totals for review step presentation
  const estimatedGross = selectedEmployeeIds.length * 68000;
  const estimatedDeductions = selectedEmployeeIds.length * 6200;
  const estimatedNet = estimatedGross - estimatedDeductions;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
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
        netTotal: estimatedNet,
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

  const steps = [
    { number: 1, title: 'Structure' },
    { number: 2, title: 'Period' },
    { number: 3, title: 'Employees' },
    { number: 4, title: 'Review' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Payrun (Wizard)"
      description="Step-by-step wizard to initialize a company payroll cycle."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          {steps.map((s, index) => {
            const isDone = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            return (
              <React.Fragment key={s.number}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline ${
                      isCurrent ? 'text-brand-700' : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${currentStep > index + 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1: Select Structure */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800">
              Step 1: Select Salary Structure Rules
            </h4>
            <p className="text-xs text-slate-500">
              Choose the statutory ruleset to calculate basic salary, allowances, and tax deductions.
            </p>

            <div className="space-y-3">
              {structures.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setSelectedStructureId(st.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                    selectedStructureId === st.id
                      ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-300 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <h5 className="font-semibold text-slate-900 text-sm">{st.name}</h5>
                    <p className="text-xs text-slate-500 mt-0.5">{st.description}</p>
                    <span className="inline-block mt-2 text-[11px] font-medium text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                      {st.rules.length} configured rules
                    </span>
                  </div>
                  {selectedStructureId === st.id && (
                    <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Payroll Period */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800">
              Step 2: Select Payroll Period & Schedule
            </h4>

            <Input
              label="Payrun Name"
              value={payrunName}
              onChange={(e) => setPayrunName(e.target.value)}
              placeholder="e.g. September 2026 Regular Payrun"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Period Month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                options={[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m) => ({ value: m, label: m }))}
              />

              <Input
                label="Period Year"
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

        {/* Step 3: Select Employees */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Step 3: Select Eligible Employees
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedEmployeeIds.length} of {employees.length} employees selected for this payrun.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
              {employees.map((emp) => {
                const isChecked = selectedEmployeeIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                      isChecked ? 'bg-brand-50/70 text-slate-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="font-semibold block">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {emp.position} &bull; {emp.department}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-slate-500">{emp.code}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800">
              Step 4: Review Payrun Parameters
            </h4>
            <p className="text-xs text-slate-500">
              Confirm payrun parameters before generating computation drafts.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payrun Name:</span>
                <span className="font-semibold text-slate-800">{payrunName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salary Structure:</span>
                <span className="font-semibold text-brand-700">{selectedStructure?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Period:</span>
                <span className="font-semibold text-slate-800">{periodMonth} {periodYear} ({startDate} &rarr; {endDate})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Included Employees:</span>
                <span className="font-semibold text-slate-800">{selectedEmployeeIds.length} members</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Estimated Net Payout:</span>
                <span className="text-emerald-600">₹{estimatedNet.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Submitting will create this payrun with status <strong>Draft</strong>. You can compute, review payslips, validate, and mark as paid in the payroll dashboard.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentStep === 1) onClose();
              else setCurrentStep(currentStep - 1);
            }}
            disabled={isSubmitting}
            leftIcon={currentStep > 1 ? <ChevronLeft className="w-4 h-4" /> : undefined}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 4 ? (
            <Button
              size="sm"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && !selectedStructureId) ||
                (currentStep === 3 && selectedEmployeeIds.length === 0)
              }
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Generate Payrun
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
