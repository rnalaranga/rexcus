import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Landmark, FileText,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, BookOpen
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAccounts, useCostCenters, useJournals } from '@/hooks/useFinance';
import { useCustomers, useSuppliers } from '@/hooks/useData';
import { createJournal } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalLine {
  id: string;
  accountId: string;
  partyType: string;
  partyId: string;
  costCenterId: string;
  description: string;
  debit: number;
  credit: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const JournalBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: costCenters } = useCostCenters();
  const { data: customers } = useCustomers();
  const { data: suppliers } = useSuppliers();
  const { refetch: refetchJournals } = useJournals();
  const { toast, showError } = useDialog();

  // Form state
  const [docNo] = useState('JE-' + Date.now().toString().slice(-6));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', partyType: '', partyId: '', costCenterId: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountId: '', partyType: '', partyId: '', costCenterId: '', description: '', debit: 0, credit: 0 },
  ]);

  const addLine = () => setLines(prev => [...prev, {
    id: crypto.randomUUID(), accountId: '', partyType: '', partyId: '',
    costCenterId: '', description: '', debit: 0, credit: 0
  }]);

  const updateLine = (id: string, field: string, value: any) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'debit' && Number(value) > 0) updated.credit = 0;
      if (field === 'credit' && Number(value) > 0) updated.debit = 0;
      return updated;
    }));
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return showError('A journal entry must have at least 2 lines.', 'Cannot Remove Line');
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const totalDebit  = lines.reduce((s, l) => s + Number(l.debit  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced  = totalDebit === totalCredit && totalDebit > 0;
  const difference  = Math.abs(totalDebit - totalCredit);

  const handleSave = async () => {
    if (!isBalanced) {
      return showError(`Journal is out of balance by ${formatCurrency(difference)}. Debits must equal Credits.`, 'Not Balanced');
    }
    const hasEmptyAccount = lines.some(l => !l.accountId);
    if (hasEmptyAccount) {
      return showError('All lines must have an account selected.', 'Missing Account');
    }

    setSaving(true);
    try {
      await createJournal({
        id: docNo, date, reference, description,
        totalAmount: totalDebit, lines, createdBy: 'Admin'
      });
      toast('Journal entry posted successfully!', 'success');
      refetchJournals();
      navigate('/finance');
    } catch (e) {
      showError('Failed to post journal entry. Please try again.', 'Post Failed');
    }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-white dark:bg-zinc-900 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/finance')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-muted hover:text-primary"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-base font-black text-primary tracking-tight">New Journal Entry</h1>
            <p className="text-[11px] mt-0.5 flex items-center gap-2">
              <span className="text-muted font-mono">{docNo}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isBalanced
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : totalDebit > 0
                  ? 'bg-red-500/10 text-red-600 border-red-500/20'
                  : 'bg-gray-100 dark:bg-zinc-800 text-muted border-transparent'
              }`}>
                {isBalanced ? '✓ BALANCED' : totalDebit > 0 ? `⚠ OFF BY ${formatCurrency(difference)}` : 'DRAFT'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/finance')} className="px-4 py-1.5 text-sm text-muted hover:text-primary border border-theme-subtle rounded-lg transition-colors">
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={handleSave}
            disabled={!isBalanced || saving}
            className="bg-rex-600 hover:bg-rex-700 disabled:opacity-40"
          >
            {saving ? 'Posting...' : 'Post Entry'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Header Fields */}
        <GlassCard className="p-5">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-4">
            <FileText size={14} /> Entry Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-muted uppercase mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-rex-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted uppercase mb-1">Reference #</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. INV-1002"
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:border-rex-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-muted uppercase mb-1">Memo / Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explain the purpose of this entry..."
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-rex-500"
              />
            </div>
          </div>
        </GlassCard>

        {/* Lines Table */}
        <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
          {/* Table Header */}
          <div className="px-5 py-3 border-b border-theme-subtle flex justify-between items-center bg-surface/40">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
              <Landmark size={14} /> Ledger Lines
            </h2>
            <button
              onClick={addLine}
              className="flex items-center gap-1.5 text-xs text-rex-600 hover:text-rex-500 font-semibold transition-colors"
            >
              <Plus size={14} /> Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface/50 border-b border-theme-subtle">
                <tr className="text-[10px] uppercase tracking-widest text-muted">
                  <th className="px-4 py-2.5 w-8">#</th>
                  <th className="px-2 py-2.5 min-w-[220px]">Account</th>
                  <th className="px-2 py-2.5 min-w-[180px]">Partner (AR/AP)</th>
                  <th className="px-2 py-2.5 min-w-[120px]">Cost Center</th>
                  <th className="px-2 py-2.5 min-w-[160px]">Memo</th>
                  <th className="px-2 py-2.5 w-32 text-right text-emerald-600 dark:text-emerald-400">Debit</th>
                  <th className="px-2 py-2.5 w-32 text-right text-amber-600 dark:text-amber-400">Credit</th>
                  <th className="px-2 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/40">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-surface/40 transition-colors group">
                    {/* Row number */}
                    <td className="px-4 py-2 text-[10px] text-muted font-mono">{idx + 1}</td>

                    {/* Account */}
                    <td className="px-2 py-2">
                      <select
                        value={line.accountId}
                        onChange={e => updateLine(line.id, 'accountId', e.target.value)}
                        className={`w-full bg-surface border px-2 py-1.5 rounded text-xs font-medium focus:outline-none transition-colors ${
                          !line.accountId ? 'border-theme-subtle text-muted' : 'border-rex-500/40 text-primary'
                        }`}
                      >
                        <option value="">-- Select Account --</option>
                        {(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as string[]).map(type => (
                          <optgroup key={type} label={type}>
                            {accounts.filter((a: any) => a.type === type).map((a: any) => (
                              <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>

                    {/* Party */}
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <select
                          value={line.partyType}
                          onChange={e => updateLine(line.id, 'partyType', e.target.value)}
                          className="w-[70px] bg-surface border border-theme-subtle px-1 py-1.5 rounded text-[10px] focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="Customer">Cust</option>
                          <option value="Supplier">Supp</option>
                        </select>
                        <select
                          value={line.partyId}
                          onChange={e => updateLine(line.id, 'partyId', e.target.value)}
                          disabled={!line.partyType}
                          className="flex-1 bg-surface border border-theme-subtle px-1 py-1.5 rounded text-[10px] focus:outline-none disabled:opacity-40"
                        >
                          <option value="">-- Select --</option>
                          {line.partyType === 'Customer'
                            ? customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)
                            : suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)
                          }
                        </select>
                      </div>
                    </td>

                    {/* Cost Center */}
                    <td className="px-2 py-2">
                      <select
                        value={line.costCenterId}
                        onChange={e => updateLine(line.id, 'costCenterId', e.target.value)}
                        className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-[10px] focus:outline-none"
                      >
                        <option value="">-- None --</option>
                        {costCenters?.map((cc: any) => (
                          <option key={cc.id} value={cc.id}>{cc.name || cc.code}</option>
                        ))}
                      </select>
                    </td>

                    {/* Memo */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={e => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Optional memo..."
                        className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-theme-subtle px-2 py-1.5 rounded text-xs focus:outline-none"
                      />
                    </td>

                    {/* Debit */}
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={line.debit || ''}
                        onChange={e => updateLine(line.id, 'debit', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-28 bg-surface border border-theme-subtle focus:border-emerald-500 px-2 py-1.5 rounded text-xs text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none transition-colors"
                      />
                    </td>

                    {/* Credit */}
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={line.credit || ''}
                        onChange={e => updateLine(line.id, 'credit', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-28 bg-surface border border-theme-subtle focus:border-amber-500 px-2 py-1.5 rounded text-xs text-right font-bold font-mono text-amber-600 dark:text-amber-400 focus:outline-none transition-colors"
                      />
                    </td>

                    {/* Remove */}
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeLine(line.id)}
                        className="p-1.5 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-theme-subtle bg-surface/40">
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={16} />
                  <span className="text-xs font-bold">Balanced</span>
                </div>
              ) : totalDebit > 0 ? (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle size={16} />
                  <span className="text-xs font-bold">Out of balance by {formatCurrency(difference)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">Total Debit</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalDebit)}</p>
              </div>
              <div className="w-px h-10 bg-theme-subtle" />
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">Total Credit</p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(totalCredit)}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
