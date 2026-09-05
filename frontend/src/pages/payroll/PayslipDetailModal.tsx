import React, { useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Building2, 
  User, 
  Calendar, 
  CreditCard,
  Receipt,
  FileCheck2,
  Lock
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Payslip } from '../../types';

interface PayslipDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({
  isOpen,
  onClose,
  payslip
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const earnings = payslip.lines.filter((l) => l.category === 'Earning');
  const deductions = payslip.lines.filter((l) => l.category === 'Deduction');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Salary Voucher: ${payslip.employeeName}`}
      description={`Official payroll statement for ${payslip.period}.`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Printable Corporate Salary Voucher */}
        <div 
          ref={printRef}
          className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl shadow-xs space-y-6 text-slate-900"
          id="printable-payslip"
        >
          {/* Company & Voucher Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-700 text-white font-bold flex items-center justify-center text-base shadow-sm">
                P
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 font-heading">
                  PEOPLEPAY<span className="text-emerald-600">360</span> TECHNOLOGIES
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Corporate Payroll & Compensation Disbursal Voucher
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                {payslip.status === 'Paid' ? 'PAID & DISBURSED' : 'VALIDATED SALARY SLIP'}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Voucher Ref: {payslip.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Employee & Period Master Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Employee Name</span>
              <span className="font-bold text-slate-900 block mt-0.5">{payslip.employeeName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Employee ID</span>
              <span className="font-semibold text-slate-900 font-mono block mt-0.5">{payslip.employeeCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Department / Role</span>
              <span className="font-semibold text-slate-900 block mt-0.5">{payslip.department} - {payslip.position}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Pay Period</span>
              <span className="font-bold text-slate-900 font-mono block mt-0.5">{payslip.period}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Bank Account</span>
              <span className="font-mono text-slate-700 block mt-0.5">{payslip.bankAccount || '••••••••4819'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">PAN Number</span>
              <span className="font-mono text-slate-700 block mt-0.5">{payslip.pan || 'ABCDE1234F'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Joining Date</span>
              <span className="text-slate-700 block mt-0.5">{payslip.joiningDate || '2025-01-15'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Disbursal Batch</span>
              <span className="text-slate-700 block mt-0.5 truncate">{payslip.payrunName}</span>
            </div>
          </div>

          {/* Earnings vs Deductions Split Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Earnings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                  Earnings & Allowances
                </span>
                <span className="text-xs font-bold text-slate-600">Amount (INR)</span>
              </div>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                {earnings.map((line, i) => (
                  <div key={i} className="pt-2 flex items-center justify-between">
                    <span className="text-slate-700">{line.name}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ₹{line.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs font-bold">
                <span>TOTAL GROSS EARNINGS</span>
                <span className="font-mono text-sm">
                  ₹{payslip.grossSalary.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Column 2: Deductions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                  Statutory & Other Deductions
                </span>
                <span className="text-xs font-bold text-slate-600">Amount (INR)</span>
              </div>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                {deductions.map((line, i) => (
                  <div key={i} className="pt-2 flex items-center justify-between">
                    <span className="text-slate-700">{line.name}</span>
                    <span className="font-mono font-semibold text-rose-700">
                      -₹{line.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs font-bold">
                <span>TOTAL DEDUCTIONS</span>
                <span className="font-mono text-sm text-rose-700">
                  -₹{payslip.totalDeductions.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* NET SALARY HIGHLIGHT BOX */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-violet-50 via-slate-50 to-emerald-50 border-2 border-emerald-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block font-heading">
                Net Take-Home Salary (Disbursed)
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Transferred directly to registered bank account.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-800 block">
                ₹{payslip.netSalary.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Indian National Rupees
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
            Generated automatically by PeoplePay360 HR & Payroll Engine • System Verified No Signature Required
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print / Save PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
