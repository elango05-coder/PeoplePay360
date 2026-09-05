import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Play, 
  CheckCircle, 
  FileCheck, 
  Send 
} from 'lucide-react';
import { payrollService } from '../../services/payrollService';
import { Payrun, PayrunStatus } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { PayrunWizardModal } from './PayrunWizardModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const PayrollDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  const { success, error } = useToast();

  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchPayruns = async () => {
    setIsLoading(true);
    try {
      const data = await payrollService.getPayruns();
      setPayruns(data);
    } catch (err) {
      console.error(err);
      error('Failed to load payruns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayruns();
  }, []);

  const currentPayrun = payruns[0] || null;

  const handleStatusTransition = async (payrun: Payrun, nextStatus: PayrunStatus) => {
    try {
      if (nextStatus === 'Computed') {
        const res = await payrollService.computePayrun(payrun.id);
        success('Payroll Computed', res.message || `Computed payroll for payrun "${payrun.name}".`);
      } else if (nextStatus === 'Validated') {
        const res = await payrollService.validatePayrun(payrun.id);
        if (res.warnings && res.warnings.length > 0) {
          success('Payrun Validated with Warnings', `Validated with ${res.warnings.length} warning(s). Ready for disbursement.`);
        } else {
          success('Payrun Validated', 'All employee calculations and checks passed.');
        }
      } else if (nextStatus === 'Paid') {
        const res = await payrollService.markPayrunPaid(payrun.id);
        success('Payrun Disbursed & Paid', res.message || `Disbursed and marked "${payrun.name}" as Paid.`);
      } else {
        await payrollService.updatePayrunStatus(payrun.id, nextStatus);
        success('Payrun State Updated', `Payrun "${payrun.name}" transitioned to status "${nextStatus}".`);
      }
      await fetchPayruns();
    } catch (err: any) {
      console.error(err);
      error('Action Failed', err.message || 'Failed to update payrun status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payroll Operations & Payruns</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Execute batch payruns, compute statutory deductions, validate disbursals, and generate employee payslips.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/payroll/payslips')}
          >
            All Payslips
          </Button>
          {canAccess(['hr_payroll_manager', 'admin']) && (
            <Button
              onClick={() => setIsWizardOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Payrun (Wizard)
            </Button>
          )}
        </div>
      </div>

      {/* Primary Payroll Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Active Payrun
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900 truncate">
                {currentPayrun ? `${currentPayrun.periodMonth} ${currentPayrun.periodYear}` : 'None'}
              </span>
              {currentPayrun && <Badge status={currentPayrun.status} size="sm">{currentPayrun.status}</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Covering {currentPayrun?.employeeCount || 0} active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Gross Payroll
            </span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{currentPayrun ? currentPayrun.grossTotal.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Before statutory withholding</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Deductions
            </span>
            <div className="mt-2 text-2xl font-bold text-rose-600">
              ₹{currentPayrun ? currentPayrun.deductionTotal.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">EPF, Professional Tax, TDS</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Net Disbursal
            </span>
            <div className="mt-2 text-2xl font-bold text-emerald-600">
              ₹{currentPayrun ? currentPayrun.netTotal.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">To be credited to accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Payrun History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Execution History</CardTitle>
          <CardDescription>
            Lifecycle of monthly payruns: Draft &rarr; Computed &rarr; Validated &rarr; Paid
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={4} cols={8} />
          ) : payruns.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="w-6 h-6" />}
              title="No payruns recorded"
              description="Launch the Payrun Wizard to schedule your first cycle."
              actionLabel="Launch Payrun Wizard"
              onAction={() => setIsWizardOpen(true)}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Payrun Name</Th>
                  <Th>Structure</Th>
                  <Th>Period</Th>
                  <Th>Employees</Th>
                  <Th>Gross</Th>
                  <Th>Deductions</Th>
                  <Th>Net</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payruns.map((pr) => (
                  <Tr key={pr.id}>
                    <Td>
                      <span className="font-semibold text-slate-900 block leading-tight">
                        {pr.name}
                      </span>
                      <span className="text-[11px] text-slate-400">Created: {pr.createdAt}</span>
                    </Td>
                    <Td className="text-xs text-brand-700 font-medium">
                      {pr.salaryStructureName}
                    </Td>
                    <Td className="text-xs text-slate-700 font-medium">
                      {pr.periodMonth} {pr.periodYear}
                    </Td>
                    <Td className="text-slate-800 font-medium">{pr.employeeCount}</Td>
                    <Td className="font-medium text-slate-800">
                      ₹{pr.grossTotal.toLocaleString('en-IN')}
                    </Td>
                    <Td className="text-rose-600">
                      ₹{pr.deductionTotal.toLocaleString('en-IN')}
                    </Td>
                    <Td className="font-bold text-emerald-600">
                      ₹{pr.netTotal.toLocaleString('en-IN')}
                    </Td>
                    <Td>
                      <Badge status={pr.status} size="sm">
                        {pr.status}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Status Progression Workflow Actions */}
                        {pr.status === 'Draft' && canAccess(['hr_payroll_user', 'hr_payroll_manager', 'admin']) && (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => handleStatusTransition(pr, 'Computed')}
                            className="text-xs py-1"
                            leftIcon={<Play className="w-3 h-3" />}
                          >
                            Compute
                          </Button>
                        )}

                        {pr.status === 'Computed' && canAccess(['hr_payroll_manager', 'admin']) && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusTransition(pr, 'Validated')}
                            className="text-xs py-1"
                            leftIcon={<FileCheck className="w-3 h-3" />}
                          >
                            Validate
                          </Button>
                        )}

                        {pr.status === 'Validated' && canAccess(['hr_payroll_manager', 'admin']) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusTransition(pr, 'Paid')}
                            className="text-xs py-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            leftIcon={<CheckCircle className="w-3 h-3" />}
                          >
                            Disburse
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/payroll/payslips?payrunId=${pr.id}`)}
                          className="text-xs py-1"
                        >
                          Payslips
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payrun Wizard Modal */}
      <PayrunWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={fetchPayruns}
      />
    </div>
  );
};
