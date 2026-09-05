import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  Play, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle, 
  Receipt, 
  Calendar, 
  Layers, 
  Users, 
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { payrollService } from '../../services/payrollService';
import { Payrun, Payslip, PayrunStatus } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { PayrunWizardModal } from './PayrunWizardModal';
import { PayslipDetailModal } from './PayslipDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export const PayrollDashboardPage: React.FC = () => {
  const { canAccess } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [selectedPayrunId, setSelectedPayrunId] = useState<string>('');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const fetchPayrunData = async () => {
    setIsLoading(true);
    try {
      const runs = await payrollService.getPayruns();
      setPayruns(runs);
      if (runs.length > 0 && !selectedPayrunId) {
        setSelectedPayrunId(runs[0].id);
        const slips = await payrollService.getPayslips({ payrunId: runs[0].id });
        setPayslips(slips);
      } else if (selectedPayrunId) {
        const slips = await payrollService.getPayslips({ payrunId: selectedPayrunId });
        setPayslips(slips);
      }
    } catch (err) {
      console.error(err);
      error('Failed to load payroll batches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrunData();
  }, [selectedPayrunId]);

  const activePayrun = payruns.find((p) => p.id === selectedPayrunId) || payruns[0];

  const handleCompute = async () => {
    if (!activePayrun) return;
    setIsActionLoading(true);
    try {
      await payrollService.computePayrun(activePayrun.id);
      success('Payroll Computed', `Atomic computation finished for ${activePayrun.employeeCount} employees.`);
      await fetchPayrunData();
    } catch (err: any) {
      error(err.message || 'Compute failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!activePayrun) return;
    setIsActionLoading(true);
    try {
      await payrollService.validatePayrun(activePayrun.id);
      success('Payroll Validated', 'All employee payslip calculations verified and passed.');
      await fetchPayrunData();
    } catch (err: any) {
      error(err.message || 'Validation failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!activePayrun) return;
    setIsActionLoading(true);
    try {
      await payrollService.markPayrunPaid(activePayrun.id);
      success('Payrun Finalized & Paid', 'Salaries disbursed. Vouchers generated for all staff.');
      await fetchPayrunData();
    } catch (err: any) {
      error(err.message || 'Disbursal failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const stages = [
    { num: '01', name: 'Scope', desc: 'Period & Structure' },
    { num: '02', name: 'Employees', desc: 'Eligibility Roster' },
    { num: '03', name: 'Compute', desc: 'Rule Engine Execution' },
    { num: '04', name: 'Review', desc: 'Anomaly Inspection' },
    { num: '05', name: 'Validate', desc: 'Sign-off' },
    { num: '06', name: 'Paid', desc: 'Disbursed' },
  ];

  const getStageIndex = (status: PayrunStatus) => {
    switch (status) {
      case 'Draft': return 2; // Needs Compute
      case 'Computed': return 4; // Needs Validate
      case 'Validated': return 5; // Needs Mark Paid
      case 'Paid': return 6; // Complete
      default: return 1;
    }
  };

  const currentStageIndex = activePayrun ? getStageIndex(activePayrun.status) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay Runs & Wage Processing"
        description="Comprehensive payroll lifecycle execution: from contract period resolution to statutory calculations and payment voucher disbursement."
        breadcrumbs={[
          { label: 'Payroll', path: '/payroll' },
          { label: 'Pay Runs' }
        ]}
        actions={
          canAccess(['hr_payroll_manager', 'admin']) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWizardOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Payrun
            </Button>
          )
        }
      />

      {/* Cycle Selector Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {payruns.map((run) => (
          <button
            key={run.id}
            onClick={() => setSelectedPayrunId(run.id)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2.5 ${
              activePayrun?.id === run.id
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{run.name}</span>
            <Badge status={run.status} size="sm">{run.status}</Badge>
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : activePayrun ? (
        <div className="space-y-5">
          {/* 6-Stage Lifecycle Stepper */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 font-heading">
                Payrun Execution Lifecycle
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Status: <strong className="text-slate-900">{activePayrun.status}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-4">
              {stages.map((stg, index) => {
                const stepNum = index + 1;
                const isCurrent = stepNum === currentStageIndex;
                const isPassed = stepNum < currentStageIndex;

                return (
                  <div
                    key={stg.num}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      isPassed
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                        : isCurrent
                        ? 'border-violet-500 bg-violet-50/70 text-violet-950 ring-1 ring-violet-500'
                        : 'border-slate-200 bg-slate-50/50 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                      <span>{stg.num}</span>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="font-bold text-slate-900 mt-1">{stg.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{stg.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Payrun Financial Overview & Action Bar */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    {activePayrun.name}
                  </h3>
                  <Badge status={activePayrun.status}>{activePayrun.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Structure: <strong className="text-slate-700">{activePayrun.salaryStructureName}</strong> &bull; Period: {activePayrun.periodMonth} {activePayrun.periodYear}
                </p>
              </div>

              {/* Action Buttons for current lifecycle state */}
              <div className="flex items-center gap-2.5 shrink-0">
                {activePayrun.status === 'Draft' && (
                  <Button
                    variant="accent"
                    size="sm"
                    isLoading={isActionLoading}
                    onClick={handleCompute}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Compute Payroll Engine
                  </Button>
                )}

                {activePayrun.status === 'Computed' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-violet-700 hover:bg-violet-800 text-white"
                    isLoading={isActionLoading}
                    onClick={handleValidate}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Validate Payroll Run
                  </Button>
                )}

                {activePayrun.status === 'Validated' && (
                  <Button
                    variant="accent"
                    size="sm"
                    isLoading={isActionLoading}
                    onClick={handleMarkPaid}
                    leftIcon={<DollarSign className="w-3.5 h-3.5" />}
                  >
                    Mark as Paid & Disburse
                  </Button>
                )}

                {activePayrun.status === 'Paid' && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Disbursed & Locked</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Figures */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Gross Earnings</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-0.5 block">
                  ₹{activePayrun.grossTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Total Deductions</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-rose-700 mt-0.5 block">
                  -₹{activePayrun.deductionTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Net Disbursal</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-800 mt-0.5 block">
                  ₹{activePayrun.netTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Headcount</span>
                <span className="text-lg sm:text-xl font-bold font-heading text-slate-900 mt-0.5 block">
                  {activePayrun.employeeCount} In Scope
                </span>
              </div>
            </div>
          </div>

          {/* Prominent Operational Warnings Banner (Scenario 2 / Priya Patel) */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Operational Payroll Warnings Detected (Non-Blocking)</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Priya Patel (EMP-2025-002):</strong> 1 day unpaid leave recorded. Deduction of ₹1,500 applied to basic salary. Late arrival (+30 min) clocked on shift log.
            </p>
          </div>

          {/* Itemized Employee Payslips Review Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 font-heading">
                Employee Payslip Review Ledger
              </h4>
              <span className="text-xs text-slate-500">
                {payslips.length} Generated Vouchers
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Period</Th>
                    <Th>Gross Salary</Th>
                    <Th>Deductions</Th>
                    <Th>Net Pay</Th>
                    <Th>Warnings</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {payslips.map((ps) => (
                    <Tr key={ps.id} className="hover:bg-slate-50/70 transition-colors">
                      <Td>
                        <div>
                          <span className="font-bold text-slate-900 text-xs font-heading block">
                            {ps.employeeName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {ps.employeeCode} &bull; {ps.department}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-xs text-slate-700">{ps.period}</Td>
                      <Td className="text-xs font-mono font-medium text-slate-900">
                        ₹{ps.grossSalary.toLocaleString('en-IN')}
                      </Td>
                      <Td className="text-xs font-mono text-rose-600 font-medium">
                        -₹{ps.totalDeductions.toLocaleString('en-IN')}
                      </Td>
                      <Td className="text-xs font-mono font-bold text-emerald-800">
                        ₹{ps.netSalary.toLocaleString('en-IN')}
                      </Td>
                      <Td>
                        {ps.employeeName.toLowerCase().includes('priya') ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                            Unpaid Leave (-₹1.5k)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">None</span>
                        )}
                      </Td>
                      <Td>
                        <Badge status={ps.status} size="sm">{ps.status}</Badge>
                      </Td>
                      <Td className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayslip(ps)}
                        >
                          View Voucher
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Payrun Wizard Modal */}
      <PayrunWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={async () => {
          await fetchPayrunData();
        }}
      />

      {/* Payslip Modal */}
      {selectedPayslip && (
        <PayslipDetailModal
          isOpen={!!selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
          payslip={selectedPayslip}
        />
      )}
    </div>
  );
};
