import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Shield,
  Briefcase,
  ChevronDown,
  UserCheck,
  Building2,
  CalendarCheck,
  Receipt,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ReactNode;
    allowedRoles?: UserRole[];
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { canAccess, role, user, logout } = useAuth();
  const navigate = useNavigate();

  const sections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        {
          label: 'Overview',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />
        },
        {
          label: 'People',
          path: '/employees',
          icon: <Users className="w-4 h-4" />,
          allowedRoles: ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
        },
        {
          label: 'Attendance',
          path: '/attendance',
          icon: <Clock className="w-4 h-4" />
        },
        {
          label: 'Time Off',
          path: '/time-off',
          icon: <Calendar className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Payroll',
      items: [
        {
          label: 'Pay Runs',
          path: '/payroll',
          icon: <DollarSign className="w-4 h-4" />,
          allowedRoles: ['hr_payroll_user', 'hr_payroll_manager', 'admin']
        },
        {
          label: 'Payslips',
          path: '/payroll/payslips',
          icon: <Receipt className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Organization',
      items: [
        {
          label: 'Contracts',
          path: '/contracts',
          icon: <FileText className="w-4 h-4" />,
          allowedRoles: ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
        },
        {
          label: 'Working Schedules',
          path: '/schedules',
          icon: <Briefcase className="w-4 h-4" />,
          allowedRoles: ['hr_manager', 'hr_payroll_manager', 'admin']
        }
      ]
    },
    {
      title: 'Payroll Configuration',
      items: [
        {
          label: 'Salary Structures',
          path: '/salary',
          icon: <Layers className="w-4 h-4" />,
          allowedRoles: ['hr_payroll_manager', 'admin']
        }
      ]
    },
    {
      title: 'Insights',
      items: [
        {
          label: 'Reports & Analytics',
          path: '/reports',
          icon: <BarChart3 className="w-4 h-4" />,
          allowedRoles: ['hr_manager', 'hr_payroll_manager', 'admin']
        }
      ]
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'User Management',
          path: '/admin/users',
          icon: <Shield className="w-4 h-4" />,
          allowedRoles: ['admin']
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 border-r border-slate-800/80 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8b008b] to-[#90ee90] flex items-center justify-center text-white font-bold text-sm shadow-md">
              P
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none font-heading">
                PEOPLEPAY<span className="text-[#90ee90]">360</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                HR & Payroll System
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.allowedRoles || canAccess(item.allowedRoles)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#8b008b] text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#90ee90]/20 text-[#90ee90] font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom Role Status & Sign Out */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0 space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#90ee90] animate-pulse" />
              <span className="text-[11px] text-slate-300 capitalize font-medium">
                {role.replace(/_/g, ' ')}
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 transition-colors p-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
