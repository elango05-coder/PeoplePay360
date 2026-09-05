import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, getRoleDashboardUrl } = useAuth();
  const attemptedUrl = (location.state as any)?.attemptedUrl;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-5 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            Access Restricted
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">
            You don't have permission to access this page.
          </p>
          {attemptedUrl && (
            <p className="text-xs text-slate-400 font-mono mt-1">
              Attempted path: {attemptedUrl}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Your authenticated role is <strong className="capitalize text-slate-800 font-semibold">{role.replace(/_/g, ' ')}</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(getRoleDashboardUrl())}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Go to Your Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
