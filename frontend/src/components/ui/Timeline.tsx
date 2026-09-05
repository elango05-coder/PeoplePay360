import React from 'react';
import { Calendar, CheckCircle2, Clock, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from './Badge';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: 'contract' | 'attendance' | 'timeoff' | 'milestone' | 'warning';
  badgeText?: string;
  badgeStatus?: string;
  metadata?: Record<string, any>;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'contract':
        return <FileText className="w-3.5 h-3.5 text-violet-700" />;
      case 'attendance':
        return <Clock className="w-3.5 h-3.5 text-emerald-700" />;
      case 'timeoff':
        return <Calendar className="w-3.5 h-3.5 text-blue-700" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />;
    }
  };

  const getDotStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'contract':
        return 'bg-violet-50 border-violet-300 text-violet-700';
      case 'attendance':
        return 'bg-emerald-50 border-emerald-300 text-emerald-700';
      case 'timeoff':
        return 'bg-blue-50 border-blue-300 text-blue-700';
      case 'warning':
        return 'bg-amber-50 border-amber-300 text-amber-700';
      default:
        return 'bg-slate-50 border-slate-300 text-slate-700';
    }
  };

  return (
    <div className={`relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 ${className}`}>
      {events.map((event) => (
        <div key={event.id} className="relative group">
          {/* Dot Icon */}
          <div
            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center bg-white shadow-xs ${getDotStyle(
              event.type
            )}`}
          >
            {getIcon(event.type)}
          </div>

          {/* Event Content Box */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle hover:border-violet-200 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[11px] font-mono text-slate-600 font-semibold">
                {event.date}
              </span>
              {event.badgeText && (
                <Badge status={event.badgeStatus || 'Active'} size="sm">
                  {event.badgeText}
                </Badge>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 font-heading">
              {event.title}
            </h4>

            {event.description && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {event.description}
              </p>
            )}

            {event.metadata && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] text-slate-500">
                {Object.entries(event.metadata).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                    <strong className="text-slate-700 capitalize">{k}:</strong> {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
