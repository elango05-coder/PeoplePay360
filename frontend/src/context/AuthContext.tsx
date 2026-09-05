import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authService, normalizeRole, getDashboardPath } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => User;
  canAccess: (allowedRoles: UserRole[]) => boolean;
  getRoleDashboardUrl: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user && mounted) {
            const profile = await authService.fetchProfileForUser(
              sessionData.session.user.id,
              sessionData.session.user.email || ''
            );
            if (mounted) setUser(profile);
          } else {
            const stored = authService.getCurrentUser();
            if (mounted) setUser(stored);
          }
        } else {
          const stored = authService.getCurrentUser();
          if (mounted) setUser(stored);
        }
      } catch (err) {
        console.warn('Session restoration exception:', err);
        if (mounted) {
          const stored = authService.getCurrentUser();
          setUser(stored);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED)
    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && session?.user) {
          try {
            const profile = await authService.fetchProfileForUser(
              session.user.id,
              session.user.email || ''
            );
            if (mounted) setUser(profile);
          } catch (e) {
            console.warn('Auth event profile refresh error:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) setUser(null);
        }
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string = 'Password123!'): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const switchRole = (newRole: UserRole): User => {
    const updated = authService.switchRole(newRole);
    setUser(updated);
    return updated;
  };

  const role: UserRole = user?.role ? normalizeRole(user.role) : 'employee';

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    const current = normalizeRole(user.role);
    if (current === 'admin') return true; // Admin has full platform access
    return allowedRoles.map(normalizeRole).includes(current);
  };

  const getRoleDashboardUrl = (): string => {
    return getDashboardPath(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        switchRole,
        canAccess,
        getRoleDashboardUrl
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { getDashboardPath };
