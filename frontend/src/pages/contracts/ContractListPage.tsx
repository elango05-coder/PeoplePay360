import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Eye, 
  FileText, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Clock
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import { Contract } from '../../types';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { ContractModal } from './ContractModal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ContractListPage: React.FC = () => {
  const { canAccess } = useAuth();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const data = await contractService.getContracts();
      setContracts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const departments = useMemo(() => {
    const list = Array.from(new Set(contracts.map((c) => c.department).filter(Boolean)));
    return [{ value: 'All', label: 'All Departments' }, ...list.map((d) => ({ value: d, label: d }))];
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.jobPosition.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
      const matchesDept = selectedDept === 'All' || c.department === selectedDept;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [contracts, searchQuery, selectedStatus, selectedDept]);

  const totalPages = Math.ceil(filteredContracts.length / pageSize);
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employment Contracts & Agreements"
        description="Active wage agreements, salary structures, and contractual period histories across all personnel."
        breadcrumbs={[
          { label: 'Workspace', path: '/dashboard' },
          { label: 'Contracts' }
        ]}
        actions={
          canAccess(['hr_manager', 'admin']) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingContract(null);
                setIsModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Contract
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <div className="w-full sm:w-72">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by employee, contract ID..."
          />
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <FilterBar
            options={departments}
            value={selectedDept}
            onChange={setSelectedDept}
            placeholder="Department"
          />
          <FilterBar
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Active', label: 'Active / Running' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Expired', label: 'Expired' },
              { value: 'Terminated', label: 'Terminated' },
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Status"
          />
        </div>
      </div>

      {/* Contract Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          title="No contracts found"
          description="Try clearing your search query or adjusting your filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedStatus('All');
            setSelectedDept('All');
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
          <Table>
            <Thead>
              <Tr>
                <Th>Contract ID</Th>
                <Th>Employee</Th>
                <Th>Department & Role</Th>
                <Th>Period</Th>
                <Th>Monthly Wage</Th>
                <Th>Structure</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedContracts.map((c) => (
                <Tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs font-semibold text-slate-900">
                    {c.contractNumber}
                  </Td>
                  <Td>
                    <button
                      onClick={() => navigate(`/employees/${c.employeeId}`)}
                      className="text-left group"
                    >
                      <span className="font-bold text-slate-900 text-xs font-heading group-hover:text-violet-700 transition-colors block">
                        {c.employeeName}
                      </span>
                    </button>
                  </Td>
                  <Td>
                    <div>
                      <span className="text-xs font-medium text-slate-800">{c.jobPosition}</span>
                      <span className="block text-[11px] text-slate-400">{c.department}</span>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-600">
                    {c.startDate} &rarr; {c.endDate || 'Ongoing'}
                  </Td>
                  <Td className="text-xs font-bold text-emerald-800 font-mono">
                    ₹{c.wage.toLocaleString('en-IN')}/mo
                  </Td>
                  <Td className="text-xs text-slate-700">
                    {c.salaryStructureName || 'Standard Structure'}
                  </Td>
                  <Td>
                    <Badge status={c.status} size="sm">{c.status}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/employees/${c.employeeId}`)}
                      title="View Employee History"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {paginatedContracts.length} of {filteredContracts.length} contracts
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

      {/* Contract Modal */}
      <ContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await fetchContracts();
          setIsModalOpen(false);
        }}
        initialData={editingContract || undefined}
      />
    </div>
  );
};
