import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Camera, 
  Trash2, RefreshCw, Calendar, Check, X, Tag, FileText, Image as ImageIcon
} from 'lucide-react';
import { useCashbook, useAccounts } from '@/hooks/useFinance';
import { createCashbookEntry, deleteCashbookEntry } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

export const MobileCashbook: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useDialog();
  const [searchParams] = useSearchParams();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const { data: cashbookData, loading, refetch } = useCashbook(selectedDate);
  const { data: allAccounts = [] } = useAccounts();

  // New entry modal / bottom sheet
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [entryType, setEntryType] = useState<'IN' | 'OUT'>('OUT');
  const [amount, setAmount] = useState<string>('');
  const [particulars, setParticulars] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // Filter for view
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Suitable account choices for mobile
  const accountOptions = useMemo(() => {
    if (entryType === 'OUT') {
      return allAccounts.filter((a: any) => 
        a.type === 'Expense' || a.category === 'Expense' || a.subtype === 'Operating Expense' || a.subtype === 'Cost of Sales'
      );
    } else {
      return allAccounts.filter((a: any) => 
        a.type === 'Revenue' || a.category === 'Revenue' || a.type === 'Income' || a.subtype === 'Operating Revenue'
      );
    }
  }, [allAccounts, entryType]);

  // Set default account when entryType changes
  useEffect(() => {
    if (accountOptions.length > 0 && !targetAccountId) {
      setTargetAccountId(accountOptions[0].id);
    }
  }, [accountOptions, targetAccountId]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast('Please enter a valid amount', 'warning');
      return;
    }
    if (!particulars.trim()) {
      toast('Please enter a description / particulars', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const cashAccId = cashbookData?.cashAccount?.id || 'acc_1000';
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      await createCashbookEntry({
        date: selectedDate,
        time: nowTime,
        cashAccountId: cashAccId,
        entryType: entryType,
        amount: numAmount,
        targetAccountId: targetAccountId || (entryType === 'IN' ? 'acc_4000' : 'acc_6000'),
        particulars: particulars.trim(),
        partyName: partyName.trim(),
        referenceNo: referenceNo.trim(),
        receiptPhoto: photoPreview || undefined,
        source: 'mobile',
        status: 'pending',
        createdBy: user?.name || user?.username || 'Mobile Staff',
        createdById: user?.id,
        createdByName: user?.name || user?.username || 'Mobile Staff'
      });

      toast('Cash voucher submitted! Waiting for Finance approval.', 'success');
      setIsModalOpen(false);
      setAmount('');
      setParticulars('');
      setPartyName('');
      setReferenceNo('');
      setPhotoPreview(null);
      refetch();
    } catch (err: any) {
      toast(err.message || 'Failed to save cashbook entry', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!window.confirm('Delete this cashbook entry?')) return;
    try {
      await deleteCashbookEntry(entryId);
      toast('Entry deleted', 'info');
      refetch();
    } catch (err: any) {
      toast('Failed to delete entry', 'error');
    }
  };

  const allDayEntries = useMemo(() => {
    const approved = (cashbookData?.entries || []).map((e: any) => ({ ...e, status: e.status || 'approved' }));
    const pending = (cashbookData?.dayPendingEntries || []).map((e: any) => ({ ...e, status: 'pending' }));
    return [...pending, ...approved];
  }, [cashbookData?.entries, cashbookData?.dayPendingEntries]);

  const filteredEntries = useMemo(() => {
    if (typeFilter === 'ALL') return allDayEntries;
    return allDayEntries.filter((e: any) => {
      const isReceipt = e.entryType === 'RECEIPT' || e.entryType === 'IN' || e.type === 'IN';
      return typeFilter === 'IN' ? isReceipt : !isReceipt;
    });
  }, [allDayEntries, typeFilter]);

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Bar with Date Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-primary flex items-center gap-2">
            Daily Cashbook
          </h1>
          <p className="text-[11px] text-muted">
            {cashbookData?.cashAccount?.name || 'Petty Cash & Till'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-surface border border-theme rounded-lg px-2 py-1 text-xs text-primary font-mono shadow-xs"
          />
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 rounded-lg bg-surface border border-theme text-muted hover:text-primary shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-rex-600' : ''} />
          </button>
        </div>
      </div>

      {/* Floating / Prominent Add Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 px-4 rounded-xl bg-rex-600 hover:bg-rex-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>+ Record Cash Entry</span>
      </button>

      {/* Cash In Hand Summary Cards */}
      <div className="p-3.5 rounded-xl bg-surface border border-theme space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Closing Cash Balance</span>
          <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(Number(cashbookData?.closingBalance || 0))}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-theme-subtle text-center">
          <div className="p-1.5 rounded-lg bg-surface2/60 border border-theme-subtle">
            <span className="text-[10px] text-muted block">Opening</span>
            <span className="text-xs font-mono font-semibold text-primary">
              {formatCurrency(Number(cashbookData?.openingBalance || 0), true)}
            </span>
          </div>

          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">+ Inflow</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(Number(cashbookData?.totalIn || 0), true)}
            </span>
          </div>

          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block">- Outflow</span>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(Number(cashbookData?.totalOut || 0), true)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          Transactions ({filteredEntries.length})
        </span>
        <div className="flex rounded-lg bg-surface2 p-0.5 border border-theme">
          {(['ALL', 'IN', 'OUT'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className={`px-2.5 py-0.5 text-[11px] rounded-md font-medium transition-all ${
                typeFilter === tab
                  ? 'bg-surface text-primary font-bold shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'IN' ? 'In (+)' : 'Out (-)'}
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-2">
          {filteredEntries.map((entry: any) => {
            const isReceipt = entry.entryType === 'RECEIPT' || entry.type === 'IN';

            return (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-surface border border-theme flex items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isReceipt ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isReceipt ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-primary truncate">
                        {entry.particulars || (isReceipt ? 'Cash Collection' : 'Expense')}
                      </p>
                      {entry.status === 'pending' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          ⏳ Pending Approval
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ✓ Approved
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {entry.partyName && <span className="font-semibold text-secondary">{entry.partyName} • </span>}
                      {entry.accountName || entry.targetAccountName || 'General'}
                    </p>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-muted mt-0.5 flex-wrap">
                      <span>{entry.time || 'Today'}</span>
                      {entry.referenceNo && <span>• Ref: {entry.referenceNo}</span>}
                      <span className="text-secondary font-medium">• Entered by: {entry.createdByName || entry.createdBy || 'Staff'}</span>
                      {entry.receiptPhoto && (
                        <button
                          type="button"
                          onClick={() => setViewPhoto(entry.receiptPhoto)}
                          className="text-blue-500 hover:text-blue-600 underline flex items-center gap-0.5"
                        >
                          <Camera size={10} /> View Bill
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className={`text-sm font-bold font-mono text-right ${
                    isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {isReceipt ? '+' : '-'}{formatCurrency(entry.amount)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="p-1 text-muted hover:text-rose-500 transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-surface border border-theme text-center text-xs text-muted shadow-xs">
          No transactions for this date. Tap "+ Record Cash Entry" to add.
        </div>
      )}

      {/* Record Cash Entry Bottom Sheet / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-theme rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in text-primary">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Wallet size={16} className="text-rex-600" />
                Record Cash Transaction
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3">
              {/* Cash In vs Cash Out Segmented Toggle */}
              <div className="grid grid-cols-2 p-1 bg-surface2 rounded-xl border border-theme">
                <button
                  type="button"
                  onClick={() => setEntryType('OUT')}
                  className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    entryType === 'OUT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  <ArrowUpRight size={14} />
                  <span>Cash Out (Payment)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType('IN')}
                  className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    entryType === 'IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  <ArrowDownLeft size={14} />
                  <span>Cash In (Receipt)</span>
                </button>
              </div>

              {/* Big Amount Keypad Input */}
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                  Amount (LKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted font-mono">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface2 border border-theme focus:border-rex-500 rounded-xl py-3 pl-11 pr-3 text-lg font-bold font-mono text-primary placeholder-muted focus:outline-none"
                  />
                </div>
              </div>

              {/* Particulars / Description */}
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                  Particulars / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder={entryType === 'OUT' ? "e.g. Tea & refreshments, transport, fuel" : "e.g. Cash sale, customer collection"}
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  className="w-full bg-surface2 border border-theme rounded-lg p-2.5 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500"
                />
              </div>

              {/* Payee / Party Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                    {entryType === 'OUT' ? 'Paid To (Payee)' : 'Received From'}
                  </label>
                  <input
                    type="text"
                    placeholder="Name / Person"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full bg-surface2 border border-theme rounded-lg p-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                    Voucher / Ref No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. V-102"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full bg-surface2 border border-theme rounded-lg p-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500"
                  />
                </div>
              </div>

              {/* Account Category */}
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                  Category / Ledger Account
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full bg-surface2 border border-theme rounded-lg p-2 text-xs text-primary focus:outline-none focus:border-rex-500"
                >
                  {accountOptions.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Photo Attachment */}
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                  Bill / Receipt Photo (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-theme bg-surface2 text-secondary text-xs font-medium cursor-pointer hover:border-rex-500 transition-colors">
                    <Camera size={15} className="text-rex-600" />
                    <span>{photoPreview ? 'Change Photo' : 'Snap Photo / Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>
                  {photoPreview && (
                    <div className="relative w-10 h-10 rounded border border-theme overflow-hidden shrink-0">
                      <img src={photoPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 rounded-xl bg-surface2 hover:bg-surface border border-theme text-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{isSubmitting ? 'Saving...' : 'Save Cash Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Photo Lightbox Modal */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface border border-theme rounded-2xl max-w-sm w-full p-3.5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Camera size={14} className="text-rex-600" /> Attached Receipt Photo
              </span>
              <button
                type="button"
                onClick={() => setViewPhoto(null)}
                className="p-1 rounded-lg text-muted hover:text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-theme max-h-[70vh] bg-black/50 flex items-center justify-center">
              <img src={viewPhoto} alt="Bill / Receipt" className="w-full h-auto object-contain max-h-[65vh]" />
            </div>
            <button
              type="button"
              onClick={() => setViewPhoto(null)}
              className="w-full py-2 rounded-xl bg-surface2 border border-theme text-xs font-semibold text-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
