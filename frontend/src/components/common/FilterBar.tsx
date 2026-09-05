import React from 'react';
import { Filter } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  label?: string;
  options: FilterOption[];
  selectedValue: string;
  onChange: (val: string) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto py-1 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          {label}:
        </span>
      )}
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors border ${
              isSelected
                ? 'bg-brand-50 border-brand-300 text-brand-700 font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
