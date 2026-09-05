import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center text-xs text-slate-500 font-medium ${className}`} aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-brand-700 transition-colors p-0.5 rounded"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-1 shrink-0" />
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="hover:text-brand-700 transition-colors whitespace-nowrap truncate max-w-[150px] sm:max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className={`whitespace-nowrap truncate max-w-[180px] sm:max-w-[260px] ${isLast ? 'text-slate-900 font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
