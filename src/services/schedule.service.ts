// ==============================================================================
// PeoplePay360: Working Schedule Service
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import { WorkingSchedule, WorkingScheduleDay } from '../types/database.types.js';

export interface CreateScheduleInput {
  name: string;
  description?: string | null;
  weekly_hours?: number;
  is_active?: boolean;
}

export interface ScheduleDayInput {
  day_of_week: number;
  is_working_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  break_minutes?: number;
}

export class ScheduleService {
  static async getSchedules(): Promise<{ data: (WorkingSchedule & { days: WorkingScheduleDay[] })[] | null; error: any }> {
    const { data, error } = await supabase
      .from('working_schedules')
      .select('*, days:working_schedule_days(*)')
      .order('created_at', { ascending: true });
    return { data, error };
  }

  static async getScheduleById(id: string): Promise<{ data: (WorkingSchedule & { days: WorkingScheduleDay[] }) | null; error: any }> {
    const { data, error } = await supabase
      .from('working_schedules')
      .select('*, days:working_schedule_days(*)')
      .eq('id', id)
      .single();
    return { data, error };
  }

  static async createSchedule(input: CreateScheduleInput, days: ScheduleDayInput[] = []): Promise<{ data: WorkingSchedule | null; error: any }> {
    const { data: schedule, error } = await supabase
      .from('working_schedules')
      .insert({
        ...input,
        weekly_hours: input.weekly_hours ?? 40.0,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error || !schedule) {
      return { data: null, error };
    }

    if (days.length > 0) {
      const daysPayload = days.map((d) => ({
        schedule_id: schedule.id,
        day_of_week: d.day_of_week,
        is_working_day: d.is_working_day,
        start_time: d.start_time || '09:00:00',
        end_time: d.end_time || '18:00:00',
        break_minutes: d.break_minutes ?? 60,
      }));

      await supabase.from('working_schedule_days').upsert(daysPayload, {
        onConflict: 'schedule_id,day_of_week',
      });
    }

    return { data: schedule, error: null };
  }
}
