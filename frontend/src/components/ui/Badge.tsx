import React from 'react';

export type BadgeVariant = 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'neutral' 
  | 'purple'
  | 'violet';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  status?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  size = 'md',
  className = ''
}) => {
  // Infer variant from status string if variant is not explicitly provided
  let computedVariant: BadgeVariant = variant || 'neutral';

  if (!variant && status) {
    const s = status.toLowerCase();
    if (['active', 'present', 'approved', 'paid'].includes(s)) {
      computedVariant = 'success';
    } else if (['pending', 'late', 'draft', 'on leave'].includes(s)) {
      computedVariant = 'warning';
    } else if (['absent', 'rejected', 'terminated', 'missing checkout'].includes(s)) {
      computedVariant = 'danger';
    } else if (['validated', 'computed', 'corrected', 'overtime'].includes(s)) {
      computedVariant = 'violet';
    } else if (['expired', 'inactive'].includes(s)) {
      computedVariant = 'neutral';
    } else {
      computedVariant = 'info';
    }
  }

  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    info: 'bg-blue-50 text-blue-700 border-blue-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    violet: 'bg-violet-50 text-violet-700 border-violet-200/80'
  };

  const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
    purple: 'bg-purple-500',
    violet: 'bg-violet-600'
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeStyles[size]} ${variantStyles[computedVariant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[computedVariant]}`} />
      <span>{children}</span>
    </span>
  );
};
