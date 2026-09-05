import { SalaryStructure, SalaryRule, RuleCategory, ComputationType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_SALARY_STRUCTURES } from '../data/mockData';

function mapDbRuleToFrontend(dbRule: any): SalaryRule {
  const catMap: Record<string, RuleCategory> = {
    basic: 'Basic',
    allowance: 'Allowance',
    deduction: 'Deduction',
    employer_contribution: 'Deduction',
    other: 'Allowance'
  };

  const compMap: Record<string, ComputationType> = {
    fixed: 'Fixed',
    percentage: 'Percentage',
    formula: 'Formula'
  };

  let val: number | string = Number(dbRule.value || 0);
  if (dbRule.computation_type === 'percentage') {
    val = Number(dbRule.percentage || 0);
  } else if (dbRule.computation_type === 'formula') {
    val = dbRule.formula || 'wage * 0.4';
  }

  return {
    id: dbRule.id,
    structureId: dbRule.salary_structure_id,
    sequence: Number(dbRule.sequence || 1),
    name: dbRule.name,
    code: dbRule.code,
    category: catMap[dbRule.category] || 'Allowance',
    computationType: compMap[dbRule.computation_type] || 'Fixed',
    value: val,
    status: dbRule.is_active ? 'Active' : 'Inactive',
    description: dbRule.formula ? `Formula: ${dbRule.formula}` : undefined
  };
}

function mapDbStructureToFrontend(dbStruct: any): SalaryStructure {
  const rawRules = dbStruct.rules || [];
  const rules = rawRules
    .map(mapDbRuleToFrontend)
    .sort((a: SalaryRule, b: SalaryRule) => a.sequence - b.sequence);

  return {
    id: dbStruct.id,
    name: dbStruct.name,
    description: dbStruct.description || 'Standard compensation structure',
    ruleCount: rules.length,
    status: dbStruct.is_active ? 'Active' : 'Archived',
    rules,
    createdAt: dbStruct.created_at ? dbStruct.created_at.split('T')[0] : '2025-01-01'
  };
}

export const salaryService = {
  getStructures: async (): Promise<SalaryStructure[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('salary_structures')
          .select('*, rules:salary_rules(*)')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Supabase getStructures error, fallback to local', error);
        } else if (data && data.length > 0) {
          return data.map(mapDbStructureToFrontend);
        }
      } catch (err) {
        console.error('Supabase salary structures error:', err);
      }
    }

    return MOCK_SALARY_STRUCTURES;
  },

  getStructureById: async (id: string): Promise<SalaryStructure | undefined> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('salary_structures')
          .select('*, rules:salary_rules(*)')
          .eq('id', id)
          .single();

        if (!error && data) {
          return mapDbStructureToFrontend(data);
        }
      } catch (err) {
        console.error('Supabase getStructureById error', err);
      }
    }

    const list = MOCK_SALARY_STRUCTURES;
    return list.find((s) => s.id === id);
  },

  createStructure: async (data: Omit<SalaryStructure, 'id' | 'createdAt' | 'ruleCount'>): Promise<SalaryStructure> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: created, error } = await supabase
          .from('salary_structures')
          .insert({
            name: data.name,
            code: data.name.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
            description: data.description,
            is_active: data.status === 'Active'
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Insert rules if provided
        if (data.rules && data.rules.length > 0) {
          const ruleInserts = data.rules.map((r, idx) => ({
            salary_structure_id: created.id,
            name: r.name,
            code: r.code,
            sequence: r.sequence || (idx + 1) * 10,
            category: r.category.toLowerCase(),
            computation_type: r.computationType.toLowerCase(),
            value: typeof r.value === 'number' ? r.value : 0,
            percentage: r.computationType === 'Percentage' ? Number(r.value) : 0,
            formula: r.computationType === 'Formula' ? String(r.value) : null,
            is_active: r.status === 'Active'
          }));

          await supabase.from('salary_rules').insert(ruleInserts);
        }

        const full = await salaryService.getStructureById(created.id);
        if (full) return full;
      } catch (err) {
        console.error('Supabase createStructure error:', err);
        throw err;
      }
    }

    const newStructure: SalaryStructure = {
      ...data,
      id: `str-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      ruleCount: data.rules.length
    };
    return newStructure;
  },

  updateStructure: async (id: string, data: Partial<SalaryStructure>): Promise<SalaryStructure> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };
        if (data.name) updatePayload.name = data.name;
        if (data.description !== undefined) updatePayload.description = data.description;
        if (data.status) updatePayload.is_active = data.status === 'Active';

        const { error } = await supabase
          .from('salary_structures')
          .update(updatePayload)
          .eq('id', id);

        if (error) throw new Error(error.message);

        const refreshed = await salaryService.getStructureById(id);
        if (refreshed) return refreshed;
      } catch (err) {
        console.error('Supabase updateStructure error:', err);
        throw err;
      }
    }

    const current = await salaryService.getStructureById(id);
    if (!current) throw new Error('Structure not found');
    return { ...current, ...data };
  },

  addRuleToStructure: async (
    structureId: string,
    rule: Omit<SalaryRule, 'id' | 'structureId'>
  ): Promise<SalaryStructure> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('salary_rules').insert({
          salary_structure_id: structureId,
          name: rule.name,
          code: rule.code,
          sequence: rule.sequence,
          category: rule.category.toLowerCase(),
          computation_type: rule.computationType.toLowerCase(),
          value: typeof rule.value === 'number' ? rule.value : 0,
          percentage: rule.computationType === 'Percentage' ? Number(rule.value) : 0,
          formula: rule.computationType === 'Formula' ? String(rule.value) : null,
          is_active: rule.status === 'Active'
        });

        if (error) throw new Error(error.message);

        const refreshed = await salaryService.getStructureById(structureId);
        if (refreshed) return refreshed;
      } catch (err) {
        console.error('Supabase addRuleToStructure error:', err);
        throw err;
      }
    }

    const structure = await salaryService.getStructureById(structureId);
    if (!structure) throw new Error('Structure not found');
    const newRule: SalaryRule = {
      ...rule,
      id: `rul-${Date.now()}`,
      structureId
    };
    const updatedRules = [...structure.rules, newRule].sort((a, b) => a.sequence - b.sequence);
    return salaryService.updateStructure(structureId, {
      rules: updatedRules,
      ruleCount: updatedRules.length
    });
  },

  updateRule: async (
    structureId: string,
    ruleId: string,
    data: Partial<SalaryRule>
  ): Promise<SalaryStructure> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };
        if (data.name) updatePayload.name = data.name;
        if (data.code) updatePayload.code = data.code;
        if (data.sequence !== undefined) updatePayload.sequence = data.sequence;
        if (data.category) updatePayload.category = data.category.toLowerCase();
        if (data.computationType) updatePayload.computation_type = data.computationType.toLowerCase();
        if (data.value !== undefined) {
          updatePayload.value = typeof data.value === 'number' ? data.value : 0;
          if (data.computationType === 'Percentage') updatePayload.percentage = Number(data.value);
          if (data.computationType === 'Formula') updatePayload.formula = String(data.value);
        }
        if (data.status) updatePayload.is_active = data.status === 'Active';

        const { error } = await supabase.from('salary_rules').update(updatePayload).eq('id', ruleId);
        if (error) throw new Error(error.message);

        const refreshed = await salaryService.getStructureById(structureId);
        if (refreshed) return refreshed;
      } catch (err) {
        console.error('Supabase updateRule error:', err);
        throw err;
      }
    }

    const structure = await salaryService.getStructureById(structureId);
    if (!structure) throw new Error('Structure not found');
    const updatedRules = structure.rules.map((r) =>
      r.id === ruleId ? { ...r, ...data } : r
    ).sort((a, b) => a.sequence - b.sequence);
    return salaryService.updateStructure(structureId, { rules: updatedRules });
  },

  deleteRule: async (structureId: string, ruleId: string): Promise<SalaryStructure> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('salary_rules').delete().eq('id', ruleId);
        if (error) throw new Error(error.message);

        const refreshed = await salaryService.getStructureById(structureId);
        if (refreshed) return refreshed;
      } catch (err) {
        console.error('Supabase deleteRule error:', err);
        throw err;
      }
    }

    const structure = await salaryService.getStructureById(structureId);
    if (!structure) throw new Error('Structure not found');
    const updatedRules = structure.rules.filter((r) => r.id !== ruleId);
    return salaryService.updateStructure(structureId, {
      rules: updatedRules,
      ruleCount: updatedRules.length
    });
  }
};
