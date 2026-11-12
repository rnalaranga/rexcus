import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Receipt, Wallet, Calendar, Percent } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { useAccounts, useTaxes, useTaxProfiles } from '@/hooks/useFinance';
import { useSuppliers } from '@/hooks/useData';
import { createJournal } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

export const ExpenseBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: taxProfiles = [] } = useTaxProfiles();
  const { data: suppliers = [] } = useSuppliers();
  const { showError, toast } = useDialog();

  const [docNo] = useState('EXP-' + Date.now().toString().slice(-4));
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [taxMode, setTaxMode] = useState<string>('none'); // 'none' | 'vat18' | 'sscl_vat'

  const expenseAccounts = accounts.filter(a => a.type === 'Expense');
  
  // Group expenses by subtype
  const groupedExpenses = expenseAccounts.reduce((acc, curr) => {
    const group = curr.subtype || 'Other Expenses';
    if (!acc[group]) acc[group] = [];
    acc[group].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  // Payment/Credit accounts: Exclude Accounts Receivable! An expense cannot credit customer receivables.
  const paymentAccounts = accounts.filter(a => {
    if (a.type === 'Liability') return true;
    if (a.type === 'Asset') {
      const nameLower = (a.name || '').toLowerCase();
      if (nameLower.includes('receivable') || a.code === '1500' || a.code === '1200' || a.code === '1690') return false;
      return true;
    }
    return false;
  }).sort((a, b) => (a.code === '2000' ? -1 : b.code === '2000' ? 1 : 0));

  // Auto-default payment account to Accounts Payable if not set
  React.useEffect(() => {
    if (!paymentAccountId && paymentAccounts.length > 0) {
      const ap = paymentAccounts.find(a => a.code === '2000' || a.name.toLowerCase().includes('accounts payable'));
      if (ap) setPaymentAccountId(ap.id);
    }
  }, [paymentAccounts, paymentAccountId]);

  // Tax calculations
  let ssclAmount = 0;
  let vatAmount = 0;
  if (taxMode === 'vat18') {
    vatAmount = Math.round(amount * 0.18 * 100) / 100;
  } else if (taxMode === 'sscl_vat') {
    ssclAmount = Math.round(amount * 0.025 * 100) / 100;
    vatAmount = Math.round((amount + ssclAmount) * 0.18 * 100) / 100;
  }
  const taxAmount = vatAmount + ssclAmount;
  const totalAmount = amount + taxAmount;

  const handleSave = async () => {
    if (amount <= 0 || !expenseAccountId || !paymentAccountId) {
      return showError('Please fill all fields correctly. Amount must be greater than 0.', 'Missing Fields');
    }
    
    const partyInfo = supplierId ? { partyType: 'Supplier', partyId: supplierId } : {};

    // Find accounts for VAT Input and SSCL Expense
    const vatAcc = accounts.find(a => a.code === '1690' || (a.type === 'Asset' && a.name.toLowerCase().includes('input vat'))) || { id: 'acc_1690' };
    const ssclAcc = accounts.find(a => a.code === '5010' || (a.type === 'Expense' && a.name.toLowerCase().includes('sscl'))) || { id: 'acc_5010' };

    const lines = [];
    lines.push({ id: crypto.randomUUID(), accountId: expenseAccountId, description: description || 'Expense Charge', debit: amount, credit: 0, ...partyInfo });
    if (vatAmount > 0) {
      lines.push({ id: crypto.randomUUID(), accountId: vatAcc.id, description: `VAT Input Tax Recoverable (18%): ${description || reference}`, debit: vatAmount, credit: 0, ...partyInfo });
    }
    if (ssclAmount > 0) {
      lines.push({ id: crypto.randomUUID(), accountId: ssclAcc.id, description: `SSCL Expense (2.5%): ${description || reference}`, debit: ssclAmount, credit: 0, ...partyInfo });
    }
    lines.push({ id: crypto.randomUUID(), accountId: paymentAccountId, description: `Credit: ${description || reference}`, debit: 0, credit: totalAmount, ...partyInfo });

    await createJournal({
      id: docNo, date, reference, description: `Direct Expense: ${description || reference}`, totalAmount, lines, createdBy: 'Admin'
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
             <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Supplier (Optional)</label>
                <SupplierAutocomplete
                  value={supplierId}
                  onChange={setSupplierId}
                  suppliers={suppliers}
                  placeholder="Type to search vendor / supplier..."
                  className="text-xs py-1.5"
                />
             </div>
             <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">Expense Description / Payee</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Office Stationery from Keells" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
             </div>
          </div>

          <div className="bg-surface/50 p-6 rounded-xl border border-theme-subtle space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-red-500 uppercase mb-1 flex items-center gap-1.5"><Receipt size={12}/> Expense Account (Debit)</label>
                <SearchableSelect
                  value={expenseAccountId}
                  onChange={setExpenseAccountId}
                  placeholder="-- Select Expense Category --"
                  options={expenseAccounts.map(a => ({ value: a.id, label: a.name, extra: a.code, group: a.subtype || 'Other' }))}
                  className="focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1.5"><Wallet size={12}/> Paid Through (Credit)</label>
                <SearchableSelect
                  value={paymentAccountId}
                  onChange={setPaymentAccountId}
                  placeholder="-- Select Payment Method --"
                  options={paymentAccounts.map(a => ({ value: a.id, label: a.name, extra: `${a.code} - ${formatCurrency(a.balance)}`, group: a.subtype || a.type }))}
                  className="focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-theme-subtle">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-2 text-center">Expense Amount (Excl. Tax)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" className="w-full text-center bg-transparent text-3xl font-black text-foreground focus:outline-none placeholder:text-muted/30" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-orange-500 uppercase mb-1 flex items-center gap-1.5 justify-center"><Percent size={12}/> Applicable Tax / VAT</label>
                <select value={taxMode} onChange={e => setTaxMode(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-theme-subtle px-3 py-2.5 rounded-lg text-sm font-medium focus:border-orange-500 text-center">
                  <option value="none">No Tax (0%)</option>
                  <option value="vat18">VAT 18% (Claimable Input Tax → 1690)</option>
                  <option value="sscl_vat">SSCL 2.5% + VAT 18% (Standard Purchase Tax)</option>
                </select>
                {taxAmount > 0 && (
                   <div className="text-center mt-2 text-xs font-mono font-semibold space-y-0.5">
                     {ssclAmount > 0 && <div className="text-muted">SSCL (2.5%): + {formatCurrency(ssclAmount)}</div>}
                     {vatAmount > 0 && <div className="text-orange-500">VAT Input (18%): + {formatCurrency(vatAmount)}</div>}
                     <div className="text-amber-500 font-bold">Total Tax: + {formatCurrency(taxAmount)}</div>
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
