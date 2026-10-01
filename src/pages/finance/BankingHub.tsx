import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowLeft, ArrowRightLeft, Plus, Download, Search, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAccounts } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';
import { AccountModal } from './AccountModal';
import { Modal } from '@/components/ui/Modal';
import { useDialog } from '@/components/ui/DialogProvider';
import { createJournal, deleteAccount } from '@/lib/api';

export const BankingHub: React.FC = () => {
  const navigate = useNavigate();
  const { data: accounts, loading, refetch } = useAccounts();
  const [search, setSearch] = useState('');
  const [showAddBank, setShowAddBank] = useState(false);
  const [editBank, setEditBank] = useState<any>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const { showError, toast, showConfirm } = useDialog();

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading bank accounts...</div>;

  const bankAccounts = accounts.filter(a => a.subtype === 'Bank' || a.subtype === 'Cash');
  const filteredBanks = bankAccounts.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    (a.accountNumber && a.accountNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBalance = bankAccounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  const handleDelete = async (id: string, name: string) => {
    if (await showConfirm(`Are you sure you want to delete the bank account "${name}"?`)) {
      try {
        const res = await deleteAccount(id);
        if (!res.success && res.error) throw new Error(res.error);
        toast('Bank account deleted successfully', 'success');
        refetch();
      } catch (err: any) {
        showError(err.message, 'Failed to Delete');
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const fromId = formData.get('fromAccountId') as string;
    const toId = formData.get('toAccountId') as string;
    const date = formData.get('date') as string;
    const reference = formData.get('reference') as string;
    const description = formData.get('description') as string || 'Bank Transfer';

    if (amount <= 0 || !fromId || !toId) return showError('Invalid amount or missing accounts');
    if (fromId === toId) return showError('Cannot transfer to the same account');

    try {
      const je = {
        id: 'TRF-' + Date.now().toString().slice(-4),
        date,
        reference,
        description,
        totalAmount: amount,
        createdBy: 'System',
        lines: [
          { id: crypto.randomUUID(), accountId: toId, debit: amount, credit: 0, description: `Transfer in from ${bankAccounts.find(a=>a.id===fromId)?.name}` },
          { id: crypto.randomUUID(), accountId: fromId, debit: 0, credit: amount, description: `Transfer out to ${bankAccounts.find(a=>a.id===toId)?.name}` }
        ]
      };
      await createJournal(je);
      toast('Transfer completed successfully', 'success');
      setShowTransfer(false);
      refetch();
    } catch(err: any) { showError(err.message, 'Error'); }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative animate-fade-in">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Landmark size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Banking Hub</h1>
            <p className="text-[11px] text-muted mt-0.5">{bankAccounts.length} Connected Accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={ArrowRightLeft} onClick={() => setShowTransfer(true)} className="border border-theme-subtle text-blue-500">Bank Transfer</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddBank(true)} className="bg-blue-600 hover:bg-blue-700">Add Bank Account</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Total Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-5 border-t-2 border-t-blue-500">
             <h3 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Total Bank Balance</h3>
             <p className="text-3xl font-black text-primary font-mono">{formatCurrency(totalBalance)}</p>
          </GlassCard>
        </div>

        {/* Bank List */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-theme-subtle flex justify-between items-center bg-surface/30">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <Landmark size={16} className="text-blue-500" /> Account List
            </h2>
            <SearchBar placeholder="Search banks..." value={search} onChange={setSearch} className="w-64" />
          </div>
          <div className="divide-y divide-theme-subtle">
            {filteredBanks.length === 0 ? (
               <div className="p-8 text-center text-muted text-sm">No bank accounts found.</div>
            ) : (
               filteredBanks.map(bank => (
                 <div key={bank.id} className="p-4 hover:bg-surface2/30 transition-colors flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-theme flex items-center justify-center shadow-sm">
                       <Landmark size={18} className="text-muted" />
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-0.5">
                         <h4 className="text-sm font-bold text-primary">{bank.name}</h4>
                         <Badge value={bank.subtype} size="sm" />
                       </div>
                       <p className="text-xs text-muted flex items-center gap-2 font-mono">
                         {bank.code} {bank.accountNumber ? `• A/C: ${bank.accountNumber}` : ''}
                       </p>
                     </div>
                   </div>
                   <div className="flex items-center gap-6">
                     <div className="text-right">
                       <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">Balance</p>
                       <p className={`text-lg font-black font-mono ${Number(bank.balance) < 0 ? 'text-red-500' : 'text-primary'}`}>
                         {formatCurrency(Number(bank.balance))}
                       </p>
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="sm" icon={Edit2} onClick={() => setEditBank(bank)} />
                       <Button variant="ghost" size="sm" icon={Trash2} className="text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(bank.id, bank.name)} />
                     </div>
                   </div>
                 </div>
               ))
            )}
          </div>
        </GlassCard>
      </div>

      {showAddBank && (
        <AccountModal
          initialData={{ subtype: 'Bank', type: 'Asset' }}
          isOpen={true}
          onClose={() => setShowAddBank(false)}
          onSuccess={() => { refetch(); setShowAddBank(false); }}
        />
      )}

      {editBank && (
        <AccountModal
          initialData={editBank}
          isOpen={true}
          onClose={() => setEditBank(null)}
          onSuccess={() => { refetch(); setEditBank(null); }}
        />
      )}

      {/* Transfer Modal */}
      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="Bank Transfer">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Transfer From</label>
                <select name="fromAccountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                  <option value="">-- Select Source Bank --</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>)}
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Transfer To</label>
                <select name="toAccountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                  <option value="">-- Select Destination Bank --</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>)}
                </select>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Date</label>
                <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
             </div>
             <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Amount</label>
                <input type="number" step="0.01" name="amount" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Reference</label>
            <input type="text" name="reference" placeholder="e.g. TRF-1029" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Description</label>
            <input type="text" name="description" defaultValue="Bank Transfer" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
          </div>
          
          <div className="flex justify-end gap-2 mt-6 border-t border-theme-subtle pt-4">
            <Button variant="ghost" type="button" onClick={() => setShowTransfer(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Complete Transfer</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
