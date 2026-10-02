import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Receipt, Wallet, Calendar, Percent } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAccounts, useTaxes } from '@/hooks/useFinance';
import { createJournal } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

export const IncomeBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: taxes } = useTaxes();
  const { showError, toast } = useDialog();

  const [docNo] = useState('EXP-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [taxRateId, setTaxRateId] = useState('');

  const incomeAccounts = accounts.filter(a => a.type === 'Revenue' || a.type === 'Income');
  const paymentAccounts = accounts.filter(a => a.subtype === 'Bank' || a.subtype === 'Current Asset');

  const selectedTax = taxes.find(t => t.id === taxRateId);
  const taxAmount = selectedTax ? (amount * selectedTax.rate) / 100 : 0;
  const totalAmount = amount + taxAmount;

  const handleSave = async () => {
    if (amount <= 0 || !incomeAccountId || !paymentAccountId) {
      return showError('Please fill all fields correctly. Amount must be greater than 0.', 'Missing Fields');
    }
    
    const lines = [];
    lines.push({ id: crypto.randomUUID(), accountId: incomeAccountId, description, debit: 0, credit: amount });
    if (selectedTax && taxAmount > 0) {
      lines.push({ id: crypto.randomUUID(), accountId: selectedTax.accountId, description: `VAT Output: ${description}`, debit: 0, credit: taxAmount });
    }
    lines.push({ id: crypto.randomUUID(), accountId: paymentAccountId, description, debit: totalAmount, credit: 0 });

    await createJournal({
      id: docNo, date, reference, description: `Direct Income: ${description}`, totalAmount, lines, createdBy: 'Admin'
    });
    toast('Income recorded successfully!', 'success');
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
            <h1 className="text-lg font-black text-primary tracking-tight">Record Income</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Record Income</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 flex justify-center items-start">
        <GlassCard className="w-full max-w-3xl p-8 border-t-4 border-t-emerald-500">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 mb-6 border-b border-theme-subtle pb-4">
            <Receipt size={18} /> Direct Income Form
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
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Income Description / Source</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Consulting Services" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
             </div>
          </div>

          <div className="bg-surface/50 p-6 rounded-xl border border-theme-subtle space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-emerald-500 uppercase mb-1 flex items-center gap-1.5"><Receipt size={12}/> Income Account (Credit)</label>
                <SearchableSelect
                  value={incomeAccountId}
                  onChange={setIncomeAccountId}
                  placeholder="-- Select Income Category --"
                  options={incomeAccounts.map(a => ({ value: a.id, label: a.name, extra: a.code, group: a.subtype || 'Revenue' }))}
                  className="focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1.5"><Wallet size={12}/> Received Into (Debit)</label>
                <SearchableSelect
                  value={paymentAccountId}
                  onChange={setPaymentAccountId}
                  placeholder="-- Select Payment Method --"
                  options={paymentAccounts.map(a => ({ value: a.id, label: a.name, extra: `${a.code} - ${formatCurrency(a.balance)}`, group: a.subtype || 'Asset' }))}
                  className="focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-theme-subtle">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-2 text-center">Income Amount (Excl. Tax)</label>
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
               <label className="block text-[11px] font-bold text-muted uppercase mb-2 text-center">Total Received (Incl. Tax)</label>
               <div className="w-full text-center bg-transparent text-4xl font-black text-emerald-500">
                 {formatCurrency(totalAmount)}
               </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
