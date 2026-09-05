import React, { TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

export const Table: React.FC<TableHTMLAttributes<HTMLTableElement>> = ({ children, className = '', ...props }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
    <table className={`w-full text-left border-collapse text-sm ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => (
  <thead className={`bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 ${className}`} {...props}>
    {children}
  </thead>
);

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => (
  <tbody className={`divide-y divide-slate-100 bg-white ${className}`} {...props}>
    {children}
  </tbody>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-slate-50/60 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const Th: React.FC<ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => (
  <th className={`px-4 py-3.5 tracking-wider font-semibold ${className}`} {...props}>
    {children}
  </th>
);

export const Td: React.FC<TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => (
  <td className={`px-4 py-3.5 text-slate-700 align-middle ${className}`} {...props}>
    {children}
  </td>
);
