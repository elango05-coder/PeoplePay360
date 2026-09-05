import React from 'react';

interface EmployeeAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'Present' | 'Late' | 'Absent' | 'On Leave';
  className?: string;
}

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  status,
  className = '',
}) => {
  const getInitials = (n: string) => {
    if (!n) return 'PP';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const statusColors = {
    Present: 'bg-emerald-500 ring-white',
    Late: 'bg-amber-500 ring-white',
    Absent: 'bg-rose-500 ring-white',
    'On Leave': 'bg-violet-500 ring-white',
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-violet-100 to-emerald-100 text-violet-900 border border-violet-200/70 font-semibold flex items-center justify-center select-none shadow-xs`}
        >
          {getInitials(name)}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ${statusColors[status] || 'bg-slate-400'}`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
