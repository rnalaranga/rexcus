import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Landmark, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAccounts, useCostCenters } from '@/hooks/useFinance';
import { useCustomers, useSuppliers } from '@/hooks/useData';
import { createJournal } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export const JournalBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: costCenters } = useCostCenters();
  const { data: customers } = useCustomers();
  const { data: suppliers } = useSuppliers();

  const [docNo] = useState('JE-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  
  const [lines, setLines] = useState<any[]>([
    { id: '1', accountId: '', partyType: '', partyId: '', costCenterId: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountId: '', partyType: '', partyId: '', costCenterId: '', description: '', debit: 0, credit: 0 }
  ]);

  const addLine = () => setLines([...lines, { id: Date.now().toString(), accountId: '', partyType: '', partyId: '', costCenterId: '', description: '', debit: 0, credit: 0 }]);

  const updateLine = (id: string, field: string, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'debit' && value > 0) updated.credit = 0;
        if (field === 'credit' && value > 0) updated.debit = 0;
        return updated;
      }
      return l;
    }));
  };

  const removeLine = (id: string) => setLines(lines.filter(l => l.id !== id));

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const difference = Math.abs(totalDebit - totalCredit);

  const handleSave = async () => {
    if (!isBalanced) return alert("Journal is not balanced!");
    await createJournal({
      id: docNo, date, reference, description, totalAmount: totalDebit, lines, createdBy: 'Admin'
    });
    navigate('/finance');
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Enterprise Journal Builder</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo} • <span className={isBalanced ? 'text-emerald-500' : 'text-red-500'}>{isBalanced ? 'BALANCED' : 'OUT OF BALANCE'}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={!isBalanced}>Post Entry</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="w-full mx-auto space-y-5">
          <GlassCard className="p-5 border-t-2 border-t-primary">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
              <FileText size={16} /> Entry Header
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Journal Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Reference</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. INV-1002" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Description / Memo</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain the purpose of this journal entry..." className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
            <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex justify-between items-center">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Landmark size={16} /> Ledger Lines & Analytics
              </h2>
              <Button variant="ghost" size="sm" icon={Plus} onClick={addLine} className="text-primary hover:bg-primary/10">Add Line</Button>
            </div>
            
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-surface/50 border-b border-theme-subtle">
                  <tr className="text-[10px] uppercase tracking-widest text-muted">
                    <th className="px-3 py-3 w-64">Account</th>
                    <th className="px-3 py-3 w-40">Partner (AR/AP)</th>
                    <th className="px-3 py-3 w-32">Cost Center</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3 text-right w-28">Debit</th>
                    <th className="px-3 py-3 text-right w-28">Credit</th>
                    <th className="px-3 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle/50">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-surface/30 transition-colors">
                      <td className="p-2">
                        <select value={line.accountId} onChange={e => updateLine(line.id, 'accountId', e.target.value)} className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs font-medium focus:border-primary">
                          <option value="">-- Select Account --</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </td>
                      <td className="p-2 flex gap-1">
                        <select value={line.partyType} onChange={e => updateLine(line.id, 'partyType', e.target.value)} className="w-1/3 bg-surface border border-theme-subtle px-1 py-1.5 rounded text-[10px] focus:border-primary">
                          <option value="">-</option><option value="Customer">CUST</option><option value="Supplier">SUPP</option>
                        </select>
                        <select value={line.partyId} onChange={e => updateLine(line.id, 'partyId', e.target.value)} className="w-2/3 bg-surface border border-theme-subtle px-1 py-1.5 rounded text-[10px] focus:border-primary" disabled={!line.partyType}>
                          <option value="">-- Select --</option>
                          {line.partyType === 'Customer' ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <select value={line.costCenterId} onChange={e => updateLine(line.id, 'costCenterId', e.target.value)} className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-[10px] focus:border-primary">
                          <option value="">-- Analytical --</option>
                          {costCenters?.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.code}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input type="text" value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} placeholder="Memo..." className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-theme-subtle px-2 py-1.5 rounded text-xs" />
                      </td>
                      <td className="p-2 text-right">
                        <input type="number" value={line.debit || ''} onChange={e => updateLine(line.id, 'debit', Number(e.target.value))} placeholder="0.00" className="w-24 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-emerald-500 outline-none" />
                      </td>
                      <td className="p-2 text-right">
                        <input type="number" value={line.credit || ''} onChange={e => updateLine(line.id, 'credit', Number(e.target.value))} placeholder="0.00" className="w-24 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-amber-500 outline-none" />
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={() => removeLine(line.id)} className="p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-surface/50 p-5 border-t border-theme-subtle flex justify-end gap-10">
               <div className="text-right">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Total Debit</p>
                 <p className="text-lg font-black text-emerald-500">{formatCurrency(totalDebit)}</p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Total Credit</p>
                 <p className="text-lg font-black text-amber-500">{formatCurrency(totalCredit)}</p>
               </div>
            </div>
            
            {!isBalanced && totalDebit > 0 && (
              <div className="bg-red-500/10 p-3 text-center border-t border-red-500/20">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Out of Balance by {formatCurrency(difference)}</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
