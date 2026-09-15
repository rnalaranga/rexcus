import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Receipt, Wallet, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAccounts } from '@/hooks/useFinance';
import { createJournal } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export const ExpenseBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();

  const [docNo] = useState('EXP-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const expenseAccounts = accounts.filter(a => a.type === 'Expense' || a.type === 'Asset');
  const paymentAccounts = accounts.filter(a => a.subtype === 'Bank' || a.subtype === 'Current Asset');

  const handleSave = async () => {
    if (amount <= 0 || !expenseAccountId || !paymentAccountId) {
      return alert("Please fill all fields correctly.");
    }
    
    const lines = [
      { id: '1', accountId: expenseAccountId, description, debit: amount, credit: 0 }, // Expense increases (Debit)
      { id: '2', accountId: paymentAccountId, description, debit: 0, credit: amount }  // Asset decreases (Credit)
    ];

    await createJournal({
      id: docNo, date, reference, description: `Direct Expense: ${description}`, totalAmount: amount, lines, createdBy: 'Admin'
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
                  {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
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

            <div className="pt-4 border-t border-theme-subtle">
               <label className="block text-[11px] font-bold text-muted uppercase mb-2 text-center">Total Amount</label>
               <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" className="w-full text-center bg-transparent text-4xl font-black text-foreground focus:outline-none placeholder:text-muted/30" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
