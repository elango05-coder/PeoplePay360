import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, UserCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setFormError('Please enter your company email address');
      return;
    }

    setFormError('');
    setIsLoading(true);

    try {
      await login(email, password);
      success('Welcome back to PeoplePay360', 'Signed in successfully');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials provided';
      setFormError(msg);
      error('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-white">
          PeoplePay<span className="text-brand-400">360</span>
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-300">
          Integrated HR & Payroll Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <Card className="border-slate-800 shadow-2xl bg-white/95 backdrop-blur-xl">
          <CardContent className="pt-6 sm:p-8">
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
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center text-slate-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 mr-2" />
                  Remember this device
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact Member 1 or system administrator to reset password.'); }} className="font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </a>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full justify-center"
                  size="lg"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In to Dashboard
                </Button>
              </div>
            </form>

            {/* Demo Quick Logins for Hackathon Evaluators */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand-600" />
                Quick-Login Personas (Hackathon Ready):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin@peoplepay360.com')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-800">Admin</p>
                  <p className="text-[10px] text-slate-500">System Admin</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('hr.manager@peoplepay360.com')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-800">HR Manager</p>
                  <p className="text-[10px] text-slate-500">Sunita Rao</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('payroll.manager@peoplepay360.com')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-800">Payroll Mgr</p>
                  <p className="text-[10px] text-slate-500">Priya Sharma</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('payroll.user@peoplepay360.com')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-800">Payroll User</p>
                  <p className="text-[10px] text-slate-500">Karthik Raj</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('rahul@peoplepay360.com')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-800">Rahul (EMP001)</p>
                  <p className="text-[10px] text-slate-500">Contract Demo</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('priya@peoplepay360.com')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-800">Priya (EMP002)</p>
                  <p className="text-[10px] text-slate-500">Exception Demo</p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          PeoplePay360 Platform &bull; Frontend Built for Hackathon Demo
        </p>
      </div>
    </div>
  );
};
