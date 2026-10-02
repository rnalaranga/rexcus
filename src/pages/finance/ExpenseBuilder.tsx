import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Receipt, Wallet, Calendar, Percent } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAccounts, useTaxes } from '@/hooks/useFinance';
import { createJournal } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

export const ExpenseBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: taxes } = useTaxes();
  const { showError, toast } = useDialog();

  const [docNo] = useState('EXP-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [taxRateId, setTaxRateId] = useState('');

  const expenseAccounts = accounts.filter(a => a.type === 'Expense');
  
  // Group expenses by subtype
  const groupedExpenses = expenseAccounts.reduce((acc, curr) => {
    const group = curr.subtype || 'Other Expenses';
    if (!acc[group]) acc[group] = [];
    acc[group].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const paymentAccounts = accounts.filter(a => a.type === 'Asset' || a.type === 'Liability');

  const selectedTax = taxes.find(t => t.id === taxRateId);
  const taxAmount = selectedTax ? (amount * selectedTax.rate) / 100 : 0;
  const totalAmount = amount + taxAmount;

  const handleSave = async () => {
    if (amount <= 0 || !expenseAccountId || !paymentAccountId) {
      return showError('Please fill all fields correctly. Amount must be greater than 0.', 'Missing Fields');
    }
    
    const lines = [];
    lines.push({ id: crypto.randomUUID(), accountId: expenseAccountId, description, debit: amount, credit: 0 });
    if (selectedTax && taxAmount > 0) {
      lines.push({ id: crypto.randomUUID(), accountId: selectedTax.accountId, description: `VAT Input: ${description}`, debit: taxAmount, credit: 0 });
    }
    lines.push({ id: crypto.randomUUID(), accountId: paymentAccountId, description, debit: 0, credit: totalAmount });

    await createJournal({
      id: docNo, date, reference, description: `Direct Expense: ${description}`, totalAmount, lines, createdBy: 'Admin'
    });
    toast('Expense recorded successfully!', 'success');
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
            <h1 className="text-lg font-black text-primary tracking-tight">Record Expense</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Record Expense</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 flex justify-center items-start">
        <GlassCard className="w-full max-w-3xl p-8 border-t-4 border-t-red-500">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2 mb-6 border-b border-theme-subtle pb-4">
            <Receipt size={18} /> Direct Expense Form
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Calendar size={12}/> Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
             </div>
             <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Receipt / Ref #</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. REC-9923" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm font-mono" />
             </div>
             <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Expense Description / Payee</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Office Stationery from Keells" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
             </div>
          </div>

          <div className="bg-surface/50 p-6 rounded-xl border border-theme-subtle space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-red-500 uppercase mb-1 flex items-center gap-1.5"><Receipt size={12}/> Expense Account (Debit)</label>
                <select value={expenseAccountId} onChange={e => setExpenseAccountId(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-theme-subtle px-3 py-2.5 rounded-lg text-sm font-medium focus:border-red-500">
                  <option value="">-- Select Expense Category --</option>
                  {Object.entries(groupedExpenses).sort(([a], [b]) => a.localeCompare(b)).map(([group, accs]: [string, any]) => (
                    <optgroup key={group} label={group}>
                      {(accs as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1.5"><Wallet size={12}/> Paid Through (Credit)</label>
                <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-theme-subtle px-3 py-2.5 rounded-lg text-sm font-medium focus:border-blue-500">
                  <option value="">-- Select Payment Method --</option>
                  {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name} ({formatCurrency(a.balance)})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-theme-subtle">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-2 text-center">Expense Amount (Excl. Tax)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" className="w-full text-center bg-transparent text-3xl font-black text-foreground focus:outline-none placeholder:text-muted/30" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-orange-500 uppercase mb-1 flex items-center gap-1.5 justify-center"><Percent size={12}/> Applicable Tax / VAT</label>
                <select value={taxRateId} onChange={e => setTaxRateId(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-theme-subtle px-3 py-2.5 rounded-lg text-sm font-medium focus:border-orange-500 text-center">
                  <option value="">No Tax (0%)</option>
                  {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({Number(t.rate)}%)</option>)}
                </select>
                {taxAmount > 0 && (
                   <div className="text-center mt-2 text-sm font-semibold text-orange-500">
                     + {formatCurrency(taxAmount)}
                   </div>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t-2 border-theme-subtle">
               <label className="block text-[11px] font-bold text-muted uppercase mb-2 text-center">Total Payment (Incl. Tax)</label>
               <div className="w-full text-center bg-transparent text-4xl font-black text-red-500">
                 {formatCurrency(totalAmount)}
               </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
