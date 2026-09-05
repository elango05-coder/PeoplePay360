import React, { useState } from 'react';
import { Download, Mail, Printer, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Payslip } from '../../types';
import { payrollService } from '../../services/payrollService';
import { useToast } from '../../context/ToastContext';

interface PayslipDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip | null;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({
  isOpen,
  onClose,
  payslip
}) => {
  const { success, error } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  if (!payslip) return null;

  const earnings = payslip.lines.filter((l) => l.category === 'Earning');
  const deductions = payslip.lines.filter((l) => l.category === 'Deduction');

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await payrollService.triggerDownloadPayslipPdf(payslip.id);
      success('PDF Document Generated', `${res.filename} formatted for print & download.`);
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      console.error(err);
      error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setIsEmailing(true);
    try {
      const res = await payrollService.triggerEmailPayslip(payslip.id, `${payslip.employeeCode.toLowerCase()}@peoplepay360.com`);
      success('Email Dispatched', res.message);
    } catch (err) {
      console.error(err);
      error('Failed to dispatch email');
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Payslip Voucher"
      description={`Official statement of earnings and statutory deductions for ${payslip.period}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Printable Payslip Card Sheet */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 space-y-6">
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  PeoplePay<span className="text-brand-600">360</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                PeoplePay360 Operations Ltd. &bull; Enterprise Payroll Division
              </p>
              <p className="text-xs text-slate-400">
                Plot 42, Tech Park Central, Bangalore, India
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Payslip Period
              </span>
              <h3 className="text-lg font-bold text-slate-900">{payslip.period}</h3>
              <div className="mt-1">
                <Badge status={payslip.status} size="sm">
                  {payslip.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Employee Metadata Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Employee Name</span>
              <span className="font-bold text-slate-800 text-sm">{payslip.employeeName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Employee ID</span>
              <span className="font-mono font-bold text-slate-800">{payslip.employeeCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Department</span>
              <span className="font-semibold text-slate-800">{payslip.department}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Designation</span>
              <span className="font-semibold text-slate-800">{payslip.position}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Bank Account</span>
              <span className="font-mono font-medium text-slate-700">{payslip.bankAccount}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">PAN Number</span>
              <span className="font-mono font-medium text-slate-700">{payslip.pan}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Payrun Batch</span>
              <span className="font-medium text-slate-700">{payslip.payrunName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Payment Mode</span>
              <span className="text-emerald-700 font-semibold">Bank Direct Disbursal</span>
            </div>
          </div>

          {/* Earnings vs Deductions Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-1.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Earnings Component
                </h4>
                <span className="font-bold text-xs text-slate-500">Amount (₹)</span>
              </div>
              <div className="space-y-2 text-xs">
                {earnings.map((line, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100">
                    <div>
                      <span className="text-slate-700 font-medium">{line.name}</span>
                      {line.rate && (
                        <span className="text-[10px] text-slate-400 block">{line.rate}</span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      ₹{line.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
                <span>Gross Earnings:</span>
                <span className="text-emerald-700">₹{payslip.grossSalary.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b-2 border-rose-500 pb-1.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Statutory Deductions
                </h4>
                <span className="font-bold text-xs text-slate-500">Amount (₹)</span>
              </div>
              <div className="space-y-2 text-xs">
                {deductions.map((line, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100">
                    <div>
                      <span className="text-slate-700 font-medium">{line.name}</span>
                      {line.rate && (
                        <span className="text-[10px] text-slate-400 block">{line.rate}</span>
                      )}
                    </div>
                    <span className="font-semibold text-rose-600">
                      ₹{line.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
                <span>Total Deductions:</span>
                <span className="text-rose-600">₹{payslip.totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Banner */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Net Take-Home Salary
              </span>
              <p className="text-[11px] text-emerald-600">
                Transferred to beneficiary account upon payrun finalization
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                ₹{payslip.netSalary.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* System Footer Note */}
          <p className="text-[11px] text-center text-slate-400 border-t border-slate-100 pt-3">
            This is a computer-generated voucher issued by PeoplePay360 and does not require a physical signature.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              isLoading={isEmailing}
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Send Email
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isDownloading}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
