import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, FileText } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { Contract } from '../../types';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { ContractModal } from './ContractModal';
import { useAuth } from '../../context/AuthContext';

export const ContractListPage: React.FC = () => {
  const navigate = useNavigate();
  const { canAccess } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

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

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.jobPosition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, selectedStatus]);

  const totalPages = Math.ceil(filteredContracts.length / pageSize);
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Employment Contracts</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor active agreements, salary structure allocations, and compensation terms.
          </p>
        </div>

        {canAccess(['hr_manager', 'admin']) && (
          <Button
            onClick={() => {
              setEditingContract(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Contract
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <SearchBar
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search contract number, employee, role..."
        />

        <FilterBar
          label="Contract Status"
          options={[
            { value: 'All', label: 'All Contracts' },
            { value: 'Active', label: 'Active' },
            { value: 'Draft', label: 'Draft' },
            { value: 'Expired', label: 'Expired' },
            { value: 'Terminated', label: 'Terminated' }
          ]}
          selectedValue={selectedStatus}
          onChange={(val) => {
            setSelectedStatus(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Contract Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No contracts found"
          description="Adjust your search or register an employment agreement."
          actionLabel="Register Contract"
          onAction={() => {
            setEditingContract(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Contract No.</Th>
                <Th>Employee</Th>
                <Th>Designation</Th>
                <Th>Department</Th>
                <Th>Wage</Th>
                <Th>Duration</Th>
                <Th>Structure</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedContracts.map((cnt) => (
                <Tr key={cnt.id}>
                  <Td>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {cnt.contractNumber}
                    </span>
                  </Td>
                  <Td>
                    <span
                      onClick={() => navigate(`/employees/${cnt.employeeId}`)}
                      className="font-semibold text-slate-900 hover:text-brand-600 cursor-pointer"
                    >
                      {cnt.employeeName}
                    </span>
                  </Td>
                  <Td className="text-slate-600">{cnt.jobPosition}</Td>
                  <Td className="text-slate-600">{cnt.department}</Td>
                  <Td className="font-bold text-slate-900">
                    ₹{cnt.wage.toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                  </Td>
                  <Td className="text-xs text-slate-600">
                    {cnt.startDate} &rarr; {cnt.endDate || 'Ongoing'}
                  </Td>
                  <Td className="text-xs text-brand-700 font-medium">
                    {cnt.salaryStructureName}
                  </Td>
                  <Td>
                    <Badge status={cnt.status} size="sm">
                      {cnt.status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    {canAccess(['hr_manager', 'admin']) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingContract(cnt);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 h-8 w-8"
                        title="Edit Contract"
                      >
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredContracts.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Contract Modal */}
      <ContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchContracts}
        initialData={editingContract}
      />
    </div>
  );
};
