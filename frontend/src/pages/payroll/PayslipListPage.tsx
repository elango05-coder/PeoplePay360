import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  Eye, 
  Download, 
  Mail, 
  CheckCircle2 
} from 'lucide-react';
import { payrollService } from '../../services/payrollService';
import { Payslip } from '../../types';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { PayslipDetailModal } from './PayslipDetailModal';
import { useToast } from '../../context/ToastContext';

export const PayslipListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const payrunFilter = searchParams.get('payrunId');

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      const list = await payrollService.getPayslips({
        payrunId: payrunFilter || undefined
      });
      setPayslips(list);
    } catch (err) {
      console.error(err);
      error('Failed to load payslips');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [payrunFilter]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter((ps) => {
      return (
        searchQuery === '' ||
        ps.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [payslips, searchQuery]);

  const totalPages = Math.ceil(filteredPayslips.length / pageSize);
  const paginatedPayslips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayslips.slice(start, start + pageSize);
  }, [filteredPayslips, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/payroll')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Payroll Overview
          </button>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Employee Payslips & Vouchers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {payrunFilter ? `Filtered by Batch ID: ${payrunFilter}` : 'All processed salary compensation vouchers.'}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <SearchBar
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search by employee name, code, or department..."
        />

        {payrunFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/payroll/payslips')}
          >
            Clear Batch Filter
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : filteredPayslips.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No payslips found"
          description="Try running a payrun or clearing your search filters."
        />
      ) : (
        <div className="space-y-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Department</Th>
                <Th>Payrun Period</Th>
                <Th>Gross Salary</Th>
                <Th>Deductions</Th>
                <Th>Net Payout</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedPayslips.map((ps) => (
                <Tr key={ps.id}>
                  <Td>
                    <div>
                      <span className="font-semibold text-slate-900 block leading-tight">
                        {ps.employeeName}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {ps.employeeCode}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{ps.department}</Td>
                  <Td className="text-xs font-semibold text-slate-800">{ps.period}</Td>
                  <Td className="font-medium text-slate-800">
                    ₹{ps.grossSalary.toLocaleString('en-IN')}
                  </Td>
                  <Td className="text-rose-600">
                    ₹{ps.totalDeductions.toLocaleString('en-IN')}
                  </Td>
                  <Td className="font-bold text-emerald-600">
                    ₹{ps.netSalary.toLocaleString('en-IN')}
                  </Td>
                  <Td>
                    <Badge status={ps.status} size="sm">
                      {ps.status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPayslip(ps)}
                      className="text-xs"
                      leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                    >
                      View Voucher
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPayslips.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Payslip Voucher Modal */}
      <PayslipDetailModal
        isOpen={Boolean(selectedPayslip)}
        onClose={() => setSelectedPayslip(null)}
        payslip={selectedPayslip}
      />
    </div>
  );
};
