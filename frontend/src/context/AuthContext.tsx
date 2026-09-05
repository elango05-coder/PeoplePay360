import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user && mounted) {
            const profile = await authService.fetchProfileForUser(
              sessionData.session.user.id,
              sessionData.session.user.email || ''
            );
            setUser(profile);
          } else {
            setUser(authService.getCurrentUser());
          }
        } else {
          setUser(authService.getCurrentUser());
        }
      } catch (err) {
        console.error('Session init error:', err);
        if (mounted) setUser(authService.getCurrentUser());
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth events
    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await authService.fetchProfileForUser(
            session.user.id,
            session.user.email || ''
          );
          if (mounted) setUser(profile);
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

  const login = async (email: string, password: string = 'Password123!') => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    const updated = authService.switchRole(newRole);
    setUser(updated);
  };

  const role: UserRole = user?.role || 'employee';

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has full access
    return allowedRoles.includes(user.role);
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
        canAccess
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
