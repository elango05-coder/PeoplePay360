import React, { useState } from 'react';
import { 
  Shield, 
  UserPlus, 
  CheckCircle2, 
  Mail, 
  Users, 
  Lock, 
  ShieldCheck 
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { MOCK_USERS } from '../../data/mockData';
import { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { success } = useToast();

  const [usersList, setUsersList] = useState<User[]>(MOCK_USERS);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    success('Role Assigned', `Updated user permission level to ${newRole}.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Accounts & Role Permissions"
        description="System authentication credentials, linked employee master profiles, and role-based access control assignments."
        breadcrumbs={[
          { label: 'Administration', path: '/admin/users' },
          { label: 'User Management' }
        ]}
      />

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
        <Table>
          <Thead>
            <Tr>
              <Th>User Profile</Th>
              <Th>Email Address</Th>
              <Th>Linked Employee</Th>
              <Th>System Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Permission Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {usersList.map((u) => (
              <Tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <Td>
                  <div>
                    <span className="font-bold text-slate-900 text-xs font-heading block">
                      {u.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {u.id}
                    </span>
                  </div>
                </Td>
                <Td className="text-xs font-mono text-slate-700">{u.email}</Td>
                <Td className="text-xs text-slate-800">
                  {u.employeeId ? (
                    <span className="font-semibold text-emerald-800 font-mono">
                      Linked ({u.employeeId})
                    </span>
                  ) : (
                    <span className="text-slate-400">System Account</span>
                  )}
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-800 border border-violet-200 capitalize">
                    <ShieldCheck className="w-3 h-3 text-violet-600" />
                    {u.role.replace(/_/g, ' ')}
                  </span>
                </Td>
                <Td>
                  <Badge status="Active" size="sm">Active</Badge>
                </Td>
                <Td className="text-right">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="hr_payroll_manager">HR Payroll Manager</option>
                    <option value="hr_payroll_user">HR Payroll User</option>
                    <option value="employee">Employee</option>
                  </select>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
};
