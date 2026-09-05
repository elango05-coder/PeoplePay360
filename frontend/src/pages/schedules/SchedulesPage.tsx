import React, { useState } from 'react';
import { 
  Briefcase, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Building2, 
  ChevronRight 
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const SchedulesPage: React.FC = () => {
  const [selectedScheduleId, setSelectedScheduleId] = useState('sch-001');

  const schedules = [
    {
      id: 'sch-001',
      name: 'Standard Full-Time (40h/week)',
      type: 'Weekly Fixed Calendar',
      daysPerWeek: 5,
      hoursPerWeek: 40,
      status: 'Active',
      pattern: [
        { day: 'Monday', in: '09:00 AM', out: '06:00 PM', break: '1 hr (Unpaid)', hours: 8 },
        { day: 'Tuesday', in: '09:00 AM', out: '06:00 PM', break: '1 hr (Unpaid)', hours: 8 },
        { day: 'Wednesday', in: '09:00 AM', out: '06:00 PM', break: '1 hr (Unpaid)', hours: 8 },
        { day: 'Thursday', in: '09:00 AM', out: '06:00 PM', break: '1 hr (Unpaid)', hours: 8 },
        { day: 'Friday', in: '09:00 AM', out: '06:00 PM', break: '1 hr (Unpaid)', hours: 8 },
        { day: 'Saturday', in: 'Off', out: 'Off', break: '--', hours: 0 },
        { day: 'Sunday', in: 'Off', out: 'Off', break: '--', hours: 0 },
      ]
    },
    {
      id: 'sch-002',
      name: 'Operations Extended (45h/week)',
      type: 'Shift Rotational',
      daysPerWeek: 5,
      hoursPerWeek: 45,
      status: 'Active',
      pattern: [
        { day: 'Monday', in: '08:30 AM', out: '06:30 PM', break: '1 hr (Unpaid)', hours: 9 },
        { day: 'Tuesday', in: '08:30 AM', out: '06:30 PM', break: '1 hr (Unpaid)', hours: 9 },
        { day: 'Wednesday', in: '08:30 AM', out: '06:30 PM', break: '1 hr (Unpaid)', hours: 9 },
        { day: 'Thursday', in: '08:30 AM', out: '06:30 PM', break: '1 hr (Unpaid)', hours: 9 },
        { day: 'Friday', in: '08:30 AM', out: '06:30 PM', break: '1 hr (Unpaid)', hours: 9 },
        { day: 'Saturday', in: 'Off', out: 'Off', break: '--', hours: 0 },
        { day: 'Sunday', in: 'Off', out: 'Off', break: '--', hours: 0 },
      ]
    }
  ];

  const active = schedules.find((s) => s.id === selectedScheduleId) || schedules[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Working Schedules & Shift Patterns"
        description="Define standard weekly working hours, daily shift spans, lunch break policies, and expected attendance quotas."
        breadcrumbs={[
          { label: 'Organization', path: '/schedules' },
          { label: 'Working Schedules' }
        ]}
      />

      {/* Schedule Selection Buttons */}
      <div className="flex items-center gap-3">
        {schedules.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedScheduleId(s.id)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              active.id === s.id
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Schedule Detail Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {active.name}
              </h3>
              <Badge status={active.status} size="sm">{active.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Calendar: {active.type} &bull; {active.daysPerWeek} Working Days per Week
            </p>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-right">
            <span className="text-[11px] text-violet-700 font-semibold uppercase block">
              Weekly Quota
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 block mt-0.5">
              {active.hoursPerWeek} Hours / Week
            </span>
          </div>
        </div>

        {/* Weekly Day-by-Day Pattern */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-heading">
            Weekly Working Hours Pattern
          </h4>
          <Table>
            <Thead>
              <Tr>
                <Th>Day of Week</Th>
                <Th>Shift Check-In</Th>
                <Th>Shift Check-Out</Th>
                <Th>Meal Break</Th>
                <Th>Daily Net Hours</Th>
              </Tr>
            </Thead>
            <Tbody>
              {active.pattern.map((p) => (
                <Tr key={p.day}>
                  <Td className="text-xs font-bold text-slate-900">{p.day}</Td>
                  <Td className="text-xs font-mono">{p.in}</Td>
                  <Td className="text-xs font-mono">{p.out}</Td>
                  <Td className="text-xs text-slate-500">{p.break}</Td>
                  <Td className="text-xs font-bold font-mono text-emerald-800">
                    {p.hours > 0 ? `${p.hours}.0h` : 'Rest Day'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};
