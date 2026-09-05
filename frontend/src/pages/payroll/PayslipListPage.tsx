import React, { useEffect, useState, useMemo } from 'react';
import { 
  Receipt, 
  Eye, 
  Download, 
  DollarSign, 
  Calendar, 
  Search,
  Filter,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { payrollService } from '../../services/payrollService';
import { Payslip } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { PayslipDetailModal } from './PayslipDetailModal';
import { useAuth } from '../../context/AuthContext';

export const PayslipListPage: React.FC = () => {
  const { user, role } = useAuth();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected for Modal
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      const empId = role === 'employee' ? user?.employeeId : undefined;
      const data = await payrollService.getPayslips({ employeeId: empId });
      setPayslips(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [role, user]);

  const periods = useMemo(() => {
    const list = Array.from(new Set(payslips.map((p) => p.period)));
    return [{ value: 'All', label: 'All Pay Periods' }, ...list.map((p) => ({ value: p, label: p }))];
  }, [payslips]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.period.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPeriod = selectedPeriod === 'All' || p.period === selectedPeriod;
      const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;

      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [payslips, searchQuery, selectedPeriod, selectedStatus]);

  const totalPages = Math.ceil(filteredPayslips.length / pageSize);
  const paginatedPayslips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayslips.slice(start, start + pageSize);
  }, [filteredPayslips, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employee Salary Vouchers & Payslips"
        description="Official earnings statements, statutory deductions, net bank transfers, and historical payroll vouchers."
        breadcrumbs={[
          { label: 'Payroll', path: '/payroll' },
          { label: 'Payslips' }
        ]}
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <div className="w-full sm:w-72">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by employee, voucher ID..."
          />
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <FilterBar
            options={periods}
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            placeholder="Period"
          />
          <FilterBar
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Validated', label: 'Validated' },
              { value: 'Computed', label: 'Computed' },
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Status"
          />
        </div>
      </div>

      {/* Payslips Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredPayslips.length === 0 ? (
        <EmptyState
          title="No payslips found"
          description="No salary vouchers have been generated for the selected criteria."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedPeriod('All');
            setSelectedStatus('All');
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Pay Period</Th>
                <Th>Department</Th>
                <Th>Gross Salary</Th>
                <Th>Total Deductions</Th>
                <Th>Net Disbursal</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedPayslips.map((ps) => (
                <Tr key={ps.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td>
                    <div>
                      <span className="font-bold text-slate-900 text-xs font-heading block">
                        {ps.employeeName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ps.employeeCode}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-xs font-semibold text-slate-800 font-mono">{ps.period}</Td>
                  <Td className="text-xs text-slate-600">{ps.department}</Td>
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
                    <Badge status={ps.status} size="sm">{ps.status}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPayslip(ps)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View Voucher
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {paginatedPayslips.length} of {filteredPayslips.length} payslips
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal: Payslip Financial Voucher */}
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
