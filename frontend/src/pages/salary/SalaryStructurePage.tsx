import React, { useEffect, useState } from 'react';
import { 
  Layers, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Sliders, 
  Sparkles 
} from 'lucide-react';
import { salaryService } from '../../services/salaryService';
import { SalaryStructure, SalaryRule } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SalaryRuleModal } from './SalaryRuleModal';
import { useToast } from '../../context/ToastContext';

export const SalaryStructurePage: React.FC = () => {
  const { success, error } = useToast();

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SalaryRule | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const fetchStructures = async () => {
    setIsLoading(true);
    try {
      const data = await salaryService.getStructures();
      setStructures(data);
      if (data.length > 0 && !selectedStructureId) {
        setSelectedStructureId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      error('Failed to load salary structures');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  const activeStructure = structures.find((s) => s.id === selectedStructureId) || structures[0];

  const handleMoveRule = async (ruleId: string, direction: 'up' | 'down') => {
    if (!activeStructure) return;
    const rules = [...activeStructure.rules].sort((a, b) => a.sequence - b.sequence);
    const index = rules.findIndex((r) => r.id === ruleId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const tempSeq = rules[index].sequence;
      rules[index].sequence = rules[index - 1].sequence;
      rules[index - 1].sequence = tempSeq;
    } else if (direction === 'down' && index < rules.length - 1) {
      const tempSeq = rules[index].sequence;
      rules[index].sequence = rules[index + 1].sequence;
      rules[index + 1].sequence = tempSeq;
    } else {
      return;
    }

    try {
      await salaryService.updateStructure(activeStructure.id, {
        rules: rules.sort((a, b) => a.sequence - b.sequence)
      });
      success('Sequence Updated', 'Rule priority reordered.');
      await fetchStructures();
    } catch (err) {
      console.error(err);
      error('Failed to reorder rules');
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRuleId || !activeStructure) return;
    try {
      await salaryService.deleteRule(activeStructure.id, deletingRuleId);
      success('Rule Deleted', 'Component removed from structure.');
      setDeletingRuleId(null);
      await fetchStructures();
    } catch (err) {
      console.error(err);
      error('Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Salary Structures & Rule Sequence</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure hierarchical rule sequences, allowances, and statutory deduction formulas for payruns.
          </p>
        </div>
      </div>

      {/* Structure Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {structures.map((st) => {
          const isSelected = st.id === activeStructure?.id;
          return (
            <div
              key={st.id}
              onClick={() => setSelectedStructureId(st.id)}
              className={`cursor-pointer p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-400/30 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                <Badge status={st.status} size="sm">
                  {st.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{st.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span>{st.rules.length} Calculation Rules</span>
                <span className="font-medium text-brand-600">Click to Inspect &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Structure Detail & Rule Sequences */}
      {activeStructure && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{activeStructure.name}</CardTitle>
                <Badge status={activeStructure.status}>{activeStructure.status}</Badge>
              </div>
              <CardDescription>{activeStructure.description}</CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setEditingRule(null);
                setIsRuleModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Rule Component
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Rule Sequence Explanation Note */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <strong>Sequence Evaluation Order:</strong> Rules are calculated sequentially from lowest sequence to highest. Allowances depending on Basic Salary should appear after Basic Salary. Deductions are evaluated after all earnings are computed.
              </div>
            </div>

            {/* Rule Table */}
            <Table>
              <Thead>
                <Tr>
                  <Th className="w-16">Seq #</Th>
                  <Th>Rule Name</Th>
                  <Th>Code</Th>
                  <Th>Category</Th>
                  <Th>Type</Th>
                  <Th>Value / Formula</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Reorder & Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activeStructure.rules
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((rule, idx, arr) => (
                    <Tr key={rule.id}>
                      <Td>
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {rule.sequence}
                        </span>
                      </Td>
                      <Td>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            {rule.name}
                          </span>
                          {rule.description && (
                            <span className="text-[11px] text-slate-400">{rule.description}</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {rule.code}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            rule.category === 'Basic'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : rule.category === 'Allowance'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {rule.category}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600 font-medium">
                          {rule.computationType}
                        </span>
                      </Td>
                      <Td className="font-mono text-xs font-semibold text-slate-800">
                        {rule.value}
                      </Td>
                      <Td>
                        <Badge status={rule.status} size="sm">
                          {rule.status}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Reorder Buttons */}
                          <button
                            onClick={() => handleMoveRule(rule.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveRule(rule.id, 'down')}
                            disabled={idx === arr.length - 1}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRule(rule);
                              setIsRuleModalOpen(true);
                            }}
                            className="p-1 h-7 w-7 ml-1"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRuleId(rule.id)}
                            className="p-1 h-7 w-7 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Salary Rule Modal */}
      {activeStructure && (
        <SalaryRuleModal
          isOpen={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          structureId={activeStructure.id}
          nextSequence={activeStructure.rules.length + 1}
          onSaved={fetchStructures}
          initialData={editingRule}
        />
      )}

      {/* Delete Rule Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingRuleId)}
        onClose={() => setDeletingRuleId(null)}
        onConfirm={handleDeleteRule}
        title="Delete Salary Rule"
        message="Are you sure you want to remove this calculation rule from the salary structure? Existing contracts and payruns may reference it."
        confirmLabel="Remove Rule"
        isDestructive
      />
    </div>
  );
};
