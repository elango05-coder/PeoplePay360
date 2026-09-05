import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus,
  LayoutList,
  LayoutGrid,
  Building2,
  Briefcase,
  Mail,
  Phone,
  ChevronRight
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { contractService } from '../../services/contractService';
import { Employee, Contract } from '../../types';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmployeeAvatar } from '../../components/ui/EmployeeAvatar';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmployeeFormModal } from './EmployeeFormModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { canAccess } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const [empList, cntList] = await Promise.all([
        employeeService.getEmployees(),
        contractService.getContracts(),
      ]);
      setEmployees(empList);
      setContracts(cntList);
    } catch (err) {
      console.error(err);
      error('Failed to load employee list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const departments = useMemo(() => {
    const list = Array.from(new Set(employees.map((e) => e.department)));
    return [{ value: 'All', label: 'All Departments' }, ...list.map((d) => ({ value: d, label: d }))];
  }, [employees]);

  const contractMap = useMemo(() => {
    const map = new Map<string, Contract>();
    contracts.forEach((c) => {
      if (c.status === 'Active') {
        map.set(c.employeeId, c);
      }
    });
    return map;
  }, [contracts]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch =
        searchQuery === '' ||
        e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDepartment === 'All' || e.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'All' || e.status === selectedStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, selectedDepartment, selectedStatus]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const handleCreateOrUpdate = async (data: Omit<Employee, 'id'>) => {
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, data);
        success('Employee Updated', `${data.firstName} ${data.lastName} record updated.`);
      } else {
        await employeeService.createEmployee(data);
        success('Employee Enrolled', `Successfully enrolled ${data.firstName} ${data.lastName}.`);
      }
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      error('Operation Failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await employeeService.deleteEmployee(deletingId);
      success('Employee Removed', 'Employee record archived.');
      setDeletingId(null);
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      error('Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="People & Talent Roster"
        description="Employee master records, employment status, active contracts, and departmental distribution."
        breadcrumbs={[
          { label: 'Workspace', path: '/dashboard' },
          { label: 'People' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: [ List ] [ Kanban ] */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            {canAccess(['hr_manager', 'admin']) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingEmployee(null);
                  setIsModalOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Enroll Employee
              </Button>
            )}
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <div className="w-full sm:w-72">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, ID, or job title..."
          />
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <FilterBar
            options={departments}
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            placeholder="Department"
          />
          <FilterBar
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'On Leave', label: 'On Leave' },
              { value: 'Terminated', label: 'Terminated' },
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Status"
          />
        </div>
      </div>

      {/* Main Content Area: List or Kanban */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          title="No employees match your criteria"
          description="Try modifying your search keywords or adjusting the department/status filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedDepartment('All');
            setSelectedStatus('All');
          }}
        />
      ) : viewMode === 'list' ? (
        /* List Table View */
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Department & Role</Th>
                <Th>Type</Th>
                <Th>Active Contract</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedEmployees.map((emp) => {
                const activeContract = contractMap.get(emp.id);

                return (
                  <Tr
                    key={emp.id}
                    className="cursor-pointer hover:bg-slate-50/70 transition-colors"
                    onClick={() => navigate(`/employees/${emp.id}`)}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar name={`${emp.firstName} ${emp.lastName}`} size="md" />
                        <div>
                          <p className="font-bold text-slate-900 text-xs font-heading">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {emp.code} &bull; {emp.email}
                          </p>
                        </div>
                      </div>
                    </Td>

                    <Td>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{emp.position}</p>
                        <p className="text-[11px] text-slate-400">{emp.department}</p>
                      </div>
                    </Td>

                    <Td>
                      <span className="text-xs text-slate-600">{emp.employeeType}</span>
                    </Td>

                    <Td>
                      {activeContract ? (
                        <div>
                          <span className="text-xs font-bold text-emerald-800 font-mono">
                            ₹{activeContract.wage.toLocaleString('en-IN')}/mo
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {activeContract.contractNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No active agreement</span>
                      )}
                    </Td>

                    <Td>
                      <Badge status={emp.status} size="sm">{emp.status}</Badge>
                    </Td>

                    <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          title="View Profile & Timeline"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        {canAccess(['hr_manager', 'admin']) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsModalOpen(true);
                              }}
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(emp.id)}
                              title="Archive Employee"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {paginatedEmployees.length} of {filteredEmployees.length} people
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      ) : (
        /* Kanban Card View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedEmployees.map((emp) => {
              const activeContract = contractMap.get(emp.id);

              return (
                <div
                  key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-violet-300 hover:shadow-card transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <EmployeeAvatar name={`${emp.firstName} ${emp.lastName}`} size="lg" />
                      <Badge status={emp.status} size="sm">{emp.status}</Badge>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-slate-900 font-heading">
                        {emp.firstName} {emp.lastName}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">{emp.position}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{emp.department}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Agreement:</span>
                        <span className="font-mono font-semibold text-emerald-700 text-[11px]">
                          {activeContract ? `₹${activeContract.wage.toLocaleString('en-IN')}` : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Type:</span>
                        <span className="text-slate-700 text-[11px]">{emp.employeeType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-violet-700 font-medium">
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
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

      {/* Employee Form Modal */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateOrUpdate}
        initialData={editingEmployee || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Archive Employee Record"
        message="Are you sure you want to archive this employee? Their historical contracts and payslips will be retained for audit compliance."
        confirmText="Archive Record"
        isLoading={isDeleting}
      />
    </div>
  );
};
