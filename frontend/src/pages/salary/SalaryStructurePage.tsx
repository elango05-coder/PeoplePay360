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
  Calculator,
  Percent,
  Coins
} from 'lucide-react';
import { salaryService } from '../../services/salaryService';
import { SalaryStructure, SalaryRule } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
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
      success('Sequence Updated', 'Calculation order adjusted.');
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
      success('Rule Removed', 'Salary rule deleted from structure.');
      setDeletingRuleId(null);
      await fetchStructures();
    } catch (err) {
      console.error(err);
      error('Failed to delete rule');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salary Structures & Computation Rules"
        description="Configure tiered earnings, statutory deductions, calculation sequences, and payroll formula engines."
        breadcrumbs={[
          { label: 'Payroll Configuration', path: '/salary' },
          { label: 'Salary Structures' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingRule(null);
              setIsRuleModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Salary Rule
          </Button>
        }
      />

      {/* Structure Selector Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {structures.map((str) => (
          <button
            key={str.id}
            onClick={() => setSelectedStructureId(str.id)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeStructure?.id === str.id
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{str.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeStructure?.id === str.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {str.rules?.length || 0} Rules
            </span>
          </button>
        ))}
      </div>

      {/* Main Structure Card */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : activeStructure ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {activeStructure.name}
                </h3>
                <Badge status={activeStructure.status} size="sm">{activeStructure.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeStructure.description || 'Standard monthly payroll structure for permanent full-time personnel.'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span>{activeStructure.rules?.length || 0} Sequence Rules</span>
              <span>&bull;</span>
              <span className="text-emerald-700 font-semibold">Ordered Execution Engine</span>
            </div>
          </div>

          {/* Sequence Explainer Alert */}
          <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-violet-900">
              <Calculator className="w-4 h-4 text-violet-700 shrink-0" />
              <span>
                <strong>Sequence Order Matters:</strong> Rules are computed sequentially from 01 to 07. Basic salary and allowances execute first before statutory deductions and net total.
              </span>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-subtle">
            <Table>
              <Thead>
                <Tr>
                  <Th>Sequence</Th>
                  <Th>Rule Name & Code</Th>
                  <Th>Category</Th>
                  <Th>Computation Method</Th>
                  <Th>Applied Value</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Reorder & Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activeStructure.rules
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((rule, idx, arr) => (
                    <Tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                      <Td className="font-mono text-xs font-bold text-slate-700">
                        {String(rule.sequence).padStart(2, '0')}
                      </Td>
                      <Td>
                        <div>
                          <span className="font-bold text-slate-900 text-xs font-heading block">
                            {rule.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {rule.code}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
                          rule.category === 'Basic'
                            ? 'bg-violet-50 text-violet-700'
                            : rule.category === 'Allowance'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {rule.category}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          {rule.computationType === 'Percentage' ? (
                            <Percent className="w-3.5 h-3.5 text-blue-600" />
                          ) : rule.computationType === 'Fixed' ? (
                            <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Calculator className="w-3.5 h-3.5 text-violet-600" />
                          )}
                          <span>{rule.computationType}</span>
                        </div>
                      </Td>
                      <Td className="font-mono font-semibold text-xs text-slate-900">
                        {rule.computationType === 'Percentage' ? `${rule.value}%` : `₹${rule.value}`}
                      </Td>
                      <Td>
                        <Badge status={rule.status} size="sm">{rule.status}</Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveRule(rule.id, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === arr.length - 1}
                            onClick={() => handleMoveRule(rule.id, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRule(rule);
                              setIsRuleModalOpen(true);
                            }}
                            title="Edit Rule"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRuleId(rule.id)}
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          </div>
        </div>
      ) : null}

      {/* Rule Create/Edit Modal */}
      {activeStructure && (
        <SalaryRuleModal
          isOpen={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          structureId={activeStructure.id}
          nextSequence={activeStructure.rules.length + 1}
          initialData={editingRule || undefined}
          onSaved={async () => {
            await fetchStructures();
            setIsRuleModalOpen(false);
          }}
        />
      )}

      {/* Delete Rule Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingRuleId}
        onClose={() => setDeletingRuleId(null)}
        onConfirm={handleDeleteRule}
        title="Remove Salary Rule"
        message="Are you sure you want to remove this rule from the salary structure? Existing historical payruns will not be affected."
        confirmText="Remove Rule"
      />
    </div>
  );
};
