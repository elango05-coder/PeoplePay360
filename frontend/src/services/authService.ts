import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS } from '../data/mockData';

const AUTH_STORAGE_KEY = 'peoplepay360_auth_user';

export const authService = {
  getCurrentUser: (): User => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved user', e);
    }
    // Default to admin for full visibility demo if no saved session
    return MOCK_USERS[0];
  },

  setCurrentUser: (user: User): void => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  },

  fetchProfileForUser: async (userId: string, email: string): Promise<User> => {
    if (!supabase) {
      return {
        id: userId,
        email,
        name: email.split('@')[0].replace('.', ' '),
        role: 'admin',
        department: 'Operations'
      };
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, employee:employees(*, department:departments(*))')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.warn('Profile not found in Supabase profiles, fallback from email/meta', error);
        const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (matched) return matched;
        return {
          id: userId,
          email,
          name: email.split('@')[0].replace('.', ' '),
          role: 'admin',
          department: 'Operations'
        };
      }

      const emp = profile.employee as any;
      const deptName = emp?.department?.name || 'Operations';

      const userObj: User = {
        id: profile.id,
        email: profile.email || email,
        name: profile.full_name || email.split('@')[0],
        role: profile.role as UserRole,
        employeeId: profile.employee_id || undefined,
        department: deptName,
      };

      authService.setCurrentUser(userObj);
      return userObj;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return matched || MOCK_USERS[0];
    }
  },

  login: async (email: string, password: string = 'Password123!'): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        console.warn('Supabase auth failed with entered password, attempting demo check:', error.message);
        // If password failed or user not yet in auth.users, check if it's a known demo persona
        const matchedMock = MOCK_USERS.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (!matchedMock) {
          throw new Error(error.message || 'Invalid credentials');
        }
        // Use demo persona fallback
        authService.setCurrentUser(matchedMock);
        return matchedMock;
      }

      if (data?.user) {
        const userObj = await authService.fetchProfileForUser(data.user.id, data.user.email || cleanEmail);
        authService.setCurrentUser(userObj);
        return userObj;
      }
    }

    // 2. Offline / Mock fallback
    await new Promise((resolve) => setTimeout(resolve, 250));
    const matched = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (matched) {
      authService.setCurrentUser(matched);
      return matched;
    }

    const genericUser: User = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0].replace('.', ' '),
      role: 'admin',
      department: 'General'
    };
    authService.setCurrentUser(genericUser);
    return genericUser;
  },

  switchRole: (role: UserRole): User => {
    const existing = authService.getCurrentUser();
    const updated: User = {
      ...existing,
      role
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
      console.warn('SignOut error:', e);
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  getAllDemoUsers: (): User[] => {
    return MOCK_USERS;
  }
};
