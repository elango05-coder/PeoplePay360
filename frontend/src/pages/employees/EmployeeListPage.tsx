import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { Employee } from '../../types';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
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
        success('Employee Created', `Successfully enrolled ${data.firstName} ${data.lastName}.`);
      }
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      error('Operation Failed', 'Could not save employee data');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await employeeService.deleteEmployee(deletingId);
      success('Employee Removed', 'The employee record has been deleted.');
      setDeletingId(null);
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      error('Delete Failed', 'Could not remove employee');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage personnel profiles, contracts, and employment records.
          </p>
        </div>

        {canAccess(['hr_manager', 'admin']) && (
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Employee
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <SearchBar
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search by name, ID code, designation..."
        />

        <div className="flex flex-wrap items-center gap-3">
          <FilterBar
            label="Department"
            options={departments}
            selectedValue={selectedDepartment}
            onChange={(val) => {
              setSelectedDepartment(val);
              setCurrentPage(1);
            }}
          />

          <FilterBar
            label="Status"
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'On Leave', label: 'On Leave' },
              { value: 'Terminated', label: 'Terminated' }
            ]}
            selectedValue={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Table View */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="w-6 h-6" />}
          title="No employees found"
          description="Try adjusting your search criteria or add a new employee profile."
          actionLabel="Add Employee"
          onAction={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Code</Th>
                <Th>Department</Th>
                <Th>Role / Position</Th>
                <Th>Type</Th>
                <Th>Joining Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedEmployees.map((emp) => (
                <Tr key={emp.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={`${emp.firstName} ${emp.lastName}`}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          className="font-semibold text-slate-900 hover:text-brand-600 cursor-pointer block leading-tight"
                        >
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-xs text-slate-400">{emp.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {emp.code}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-slate-700 font-medium">{emp.department}</span>
                  </Td>
                  <Td>
                    <span className="text-slate-600">{emp.position}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500 font-medium">{emp.employeeType}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-600">{emp.joiningDate}</span>
                  </Td>
                  <Td>
                    <Badge status={emp.status} size="sm">
                      {emp.status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        title="View Details"
                        className="p-1.5 h-8 w-8"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
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
                            title="Edit Employee"
                            className="p-1.5 h-8 w-8"
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(emp.id)}
                            title="Delete Employee"
                            className="p-1.5 h-8 w-8 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEmployees.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateOrUpdate}
        initialData={editingEmployee}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee Profile"
        message="Are you sure you want to permanently delete this employee record? This action cannot be reversed."
        confirmLabel="Delete Record"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};
