import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS } from '../data/mockData';

const AUTH_STORAGE_KEY = 'peoplepay360_auth_user';

export function normalizeRole(rawRole: string | undefined | null): UserRole {
  if (!rawRole) return 'employee';
  const r = rawRole.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'hr_manager') return 'hr_manager';
  if (r === 'hr_payroll_manager') return 'hr_payroll_manager';
  if (r === 'hr_payroll_user') return 'hr_payroll_user';
  if (r === 'employee') return 'employee';
  return 'employee';
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'employee':
      return '/employee/dashboard';
    case 'hr_manager':
      return '/hr-manager/dashboard';
    case 'hr_payroll_manager':
    case 'hr_payroll_user':
      return '/hr-payroll/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/employee/dashboard';
  }
}

export const authService = {
  getCurrentUser: (): User | null => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed.role) {
          return {
            ...parsed,
            role: normalizeRole(parsed.role)
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse saved user from storage:', e);
    }
    // Return null if no authenticated session exists — NEVER default to admin
    return null;
  },

  setCurrentUser: (user: User | null): void => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  fetchProfileForUser: async (userId: string, email: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*, employee:employees(*, department:departments(*))')
          .eq('id', userId)
          .single();

        if (!error && profile) {
          const emp = profile.employee as any;
          const deptName = emp?.department?.name || 'Operations';
          const userRole = normalizeRole(profile.role);

          const userObj: User = {
            id: profile.id,
            email: profile.email || cleanEmail,
            name: profile.full_name || cleanEmail.split('@')[0],
            role: userRole,
            employeeId: profile.employee_id || undefined,
            department: deptName,
          };

          authService.setCurrentUser(userObj);
          return userObj;
        }
      } catch (err) {
        console.warn('Supabase profile fetch error, checking local store:', err);
      }
    }

    // Match known profile from seed / mock
    const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
    if (matched) {
      authService.setCurrentUser(matched);
      return matched;
    }

    throw new Error('Your account is not assigned a role. Please contact the administrator.');
  },

  login: async (email: string, password?: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Invalid email or password.');
    }

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!error && data?.user) {
          const userObj = await authService.fetchProfileForUser(data.user.id, data.user.email || cleanEmail);
          return userObj;
        }
      } catch (err: any) {
        console.warn('Supabase signInWithPassword failed, testing demo fallback:', err?.message);
      }
    }

    // 2. Demo Persona validation (Standard password check: 'Password123!')
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const matched = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (!matched) {
      throw new Error('Invalid email or password.');
    }

    // Strictly validate password for demo accounts
    if (cleanPassword !== 'Password123!') {
      throw new Error('Invalid email or password.');
    }

    if (!matched.role) {
      throw new Error('Your account is not assigned a role. Please contact the administrator.');
    }

    const verifiedUser: User = {
      ...matched,
      role: normalizeRole(matched.role)
    };

    authService.setCurrentUser(verifiedUser);
    return verifiedUser;
  },

  switchRole: (role: UserRole): User => {
    // Find the authentic demo user corresponding to that role
    const matched = MOCK_USERS.find((u) => normalizeRole(u.role) === normalizeRole(role));
    if (matched) {
      authService.setCurrentUser(matched);
      return matched;
    }

    const existing = authService.getCurrentUser();
    if (!existing) {
      throw new Error('Your session has expired. Please log in again.');
    }
    const updated: User = {
      ...existing,
      role: normalizeRole(role)
    };
    authService.setCurrentUser(updated);
    return updated;
  },

  logout: async (): Promise<void> => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('SignOut exception:', e);
    } finally {
      authService.setCurrentUser(null);
    }
  },

  getAllDemoUsers: (): User[] => {
    return MOCK_USERS;
  }
};
