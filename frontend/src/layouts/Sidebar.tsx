import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Clock, 
  Calendar, 
  DollarSign, 
  Layers, 
  BarChart3, 
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { canAccess, role } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      label: 'Employees',
      path: '/employees',
      icon: <Users className="w-5 h-5" />,
      allowedRoles: ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
    },
    {
      label: 'Contracts',
      path: '/contracts',
      icon: <FileText className="w-5 h-5" />,
      allowedRoles: ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
    },
    {
      label: 'Attendance',
      path: '/attendance',
      icon: <Clock className="w-5 h-5" />
    },
    {
      label: 'Time Off',
      path: '/time-off',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      label: 'Salary Structures',
      path: '/salary',
      icon: <Layers className="w-5 h-5" />,
      allowedRoles: ['hr_payroll_manager', 'admin']
    },
    {
      label: 'Payroll',
      path: '/payroll',
      icon: <DollarSign className="w-5 h-5" />,
      allowedRoles: ['hr_payroll_user', 'hr_payroll_manager', 'admin']
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <BarChart3 className="w-5 h-5" />,
      allowedRoles: ['hr_manager', 'hr_payroll_manager', 'admin']
    }
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.allowedRoles || canAccess(item.allowedRoles)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">
                PeoplePay<span className="text-brand-400">360</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                HR & Payroll Platform
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* User Role Footnote */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[11px]">Active Persona</span>
              <span className="font-semibold text-slate-200 capitalize">
                {role.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
