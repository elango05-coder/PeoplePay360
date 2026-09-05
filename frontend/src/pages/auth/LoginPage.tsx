import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { getDashboardPath } from '../../services/authService';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading: sessionLoading, role } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // If already authenticated and session loaded, redirect immediately to role dashboard
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      const fromPath = (location.state as any)?.from?.pathname;
      const target = fromPath && fromPath !== '/login' ? fromPath : getDashboardPath(role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, sessionLoading, role, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('Please enter your corporate email address');
      return;
    }
    if (!password) {
      setFormError('Please enter your password');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const authUser = await login(email, password);
      success('Welcome to PeoplePay360', `Signed in as ${authUser.name}`);
      
      const roleDashboard = getDashboardPath(authUser.role);
      navigate(roleDashboard, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setFormError(msg);
      error('Authentication Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8b008b] to-[#90ee90] flex items-center justify-center text-white shadow-lg animate-pulse">
            <span className="font-bold text-xl">P</span>
          </div>
          <p className="text-sm font-semibold text-slate-300 tracking-wide">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#8b008b]/90 via-slate-950 to-[#90ee90]/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8b008b] to-[#90ee90] text-white font-bold text-xl shadow-lg mb-3">
          P
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
          PeoplePay<span className="text-[#90ee90]">360</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-300">
          Enterprise Human Resources & Payroll Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-card">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <Input
                label="Corporate Email Address"
                type="email"
                placeholder="name@peoplepay360.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                required
              />

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center bg-[#8b008b] hover:bg-[#8b008b]/90 text-white py-2.5 font-medium shadow-sm"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In to Workspace
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
