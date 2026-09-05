// ==============================================================================
// PeoplePay360: Salary Structure & Rules Service
// ==============================================================================

import { supabase } from '../lib/supabase.js';
import {
  ComputationType,
  SalaryRule,
  SalaryRuleCategory,
  SalaryStructure,
} from '../types/database.types.js';

export interface CreateSalaryStructureInput {
  name: string;
  code: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateSalaryRuleInput {
  salary_structure_id: string;
  name: string;
  code: string;
  sequence: number;
  category: SalaryRuleCategory;
  computation_type: ComputationType;
  value?: number;
  percentage?: number;
  formula?: string | null;
  is_taxable?: boolean;
  is_active?: boolean;
}

export class SalaryService {
  /**
   * Fetch all active salary structures with their rules
   */
  static async getSalaryStructures(): Promise<{ data: (SalaryStructure & { rules: SalaryRule[] })[] | null; error: any }> {
    const { data, error } = await supabase
      .from('salary_structures')
      .select('*, rules:salary_rules(*)')
      .order('created_at', { ascending: true });

    if (data) {
      data.forEach((st) => {
        if (st.rules) {
          st.rules.sort((a: SalaryRule, b: SalaryRule) => a.sequence - b.sequence);
        }
      });
    }

    return { data, error };
  }

  /**
   * Get rules for a structure sorted by sequence ASC
   */
  static async getRulesByStructure(structureId: string): Promise<{ data: SalaryRule[] | null; error: any }> {
    const { data, error } = await supabase
      .from('salary_rules')
      .select('*')
      .eq('salary_structure_id', structureId)
      .eq('is_active', true)
      .order('sequence', { ascending: true });

    return { data, error };
  }

  /**
   * Create a new salary structure
   */
  static async createSalaryStructure(input: CreateSalaryStructureInput): Promise<{ data: SalaryStructure | null; error: any }> {
    const { data, error } = await supabase
      .from('salary_structures')
      .insert({
        ...input,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    return { data, error };
  }

  /**
   * Add a rule to a salary structure
   */
  static async createSalaryRule(input: CreateSalaryRuleInput): Promise<{ data: SalaryRule | null; error: any }> {
    const { data, error } = await supabase
      .from('salary_rules')
      .insert({
        ...input,
        value: input.value ?? 0.0,
        percentage: input.percentage ?? 0.0,
        is_taxable: input.is_taxable ?? true,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    return { data, error };
  }
}
