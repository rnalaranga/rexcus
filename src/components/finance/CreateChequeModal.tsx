import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Building2, Calendar, DollarSign, FileText, 
  AlertCircle, ArrowDownLeft, ArrowUpRight, Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAccounts } from '@/hooks/useFinance';
import { createChequeRecord } from '@/lib/api';
import { formatCurrency, numberToWords } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

export interface CreateChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCheque: any) => void;
}

export const CreateChequeModal: React.FC<CreateChequeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { data: accounts = [] } = useAccounts();
  const { toast } = useDialog();

  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payeeName, setPayeeName] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'supplier' | 'employee' | 'other'>('customer');
  const [bankName, setBankName] = useState('Commercial Bank');
  const [branchName, setBranchName] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [status, setStatus] = useState<'Pending' | 'Deposited' | 'Cleared'>('Pending');
  const [realizedDate, setRealizedDate] = useState('');
  const [description, setDescription] = useState('');
  const [isCrossed, setIsCrossed] = useState(true);
  const [isAccountPayee, setIsAccountPayee] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const amountWords = numAmount > 0 ? numberToWords(numAmount) : '';

  // All eligible GL Accounts for manual selection
  const eligibleAccounts = accounts.filter(a => !a.isTaxAccount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeNo.trim()) {
      setErrorMsg('Cheque number is required');
      return;
    }
    if (!payeeName.trim()) {
      setErrorMsg('Drawer / Payee name is required');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than zero');
      return;
    }
    if (!targetAccountId) {
      setErrorMsg('Please select a General Ledger (GL) account for this cheque');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        direction,
        chequeNo: chequeNo.trim(),
        chequeDate,
        payeeName: payeeName.trim(),
        partyType,
        bankName: bankName.trim() || 'General Bank',
        branchName: branchName.trim() || undefined,
        amount: numAmount,
        currency: 'LKR',
        targetAccountId,
        status,
        realizedDate: status === 'Cleared' ? (realizedDate || chequeDate) : null,
        description: description.trim() || (direction === 'IN' ? `Inward Cheque #${chequeNo} from ${payeeName}` : `Outward Cheque #${chequeNo} to ${payeeName}`),
        isCrossed,
        isAccountPayee
      };

      const res = await createChequeRecord(payload);
      toast(`Cheque #${chequeNo} registered successfully!`, 'success');
      onSuccess(res.cheque || res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save cheque record');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ice-blur bg-white/60 dark:bg-black/60 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-2xl bg-surface border border-theme shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-surface2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-primary tracking-tight">
                Register Manual Cheque (චෙක්පත් ලියාපදිංචිය)
              </h3>
              <p className="text-xs text-muted">
                Create Inward or Outward Cheque with custom GL Account linkage & Realization rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Direction Selector (Inward vs Outward) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setDirection('IN'); setPartyType('customer'); }}
              className={`p-3 border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                direction === 'IN'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'bg-surface border-theme-subtle text-secondary hover:bg-surface2'
              }`}
            >
              <ArrowDownLeft size={16} />
              <span>Inward Cheque (Received from Client)</span>
            </button>

            <button
              type="button"
              onClick={() => { setDirection('OUT'); setPartyType('supplier'); }}
              className={`p-3 border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                direction === 'OUT'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'bg-surface border-theme-subtle text-secondary hover:bg-surface2'
              }`}
            >
              <ArrowUpRight size={16} />
              <span>Outward Cheque (Issued by Company)</span>
            </button>
          </div>

          {/* Cheque # & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Cheque Number *</label>
              <input
                type="text"
                required
                value={chequeNo}
                onChange={e => setChequeNo(e.target.value)}
                placeholder="e.g. 884021"
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-mono font-bold text-primary outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Cheque Date *</label>
              <input
                type="date"
                required
                value={chequeDate}
                onChange={e => setChequeDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payee / Drawer Name & Party Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">
                {direction === 'IN' ? 'Drawer / Customer Name *' : 'Payee / Vendor Name *'}
              </label>
              <input
                type="text"
                required
                value={payeeName}
                onChange={e => setPayeeName(e.target.value)}
                placeholder={direction === 'IN' ? 'e.g. Colombo Dockyard PLC' : 'e.g. Lanka Steel Industries'}
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Party Category</label>
              <select
                value={partyType}
                onChange={e => setPartyType(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier / Vendor</option>
                <option value="employee">Employee / Staff</option>
                <option value="other">Other Entity</option>
              </select>
            </div>
          </div>

          {/* Bank & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="e.g. Commercial Bank / Sampath Bank / HNB"
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Branch (Optional)</label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="e.g. City Office / Colombo 03"
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Amount & In-Words preview */}
          <div className="space-y-1 bg-surface2/50 border border-theme-subtle p-3.5">
            <label className="text-xs font-bold text-primary flex items-center justify-between uppercase tracking-wider">
              <span>Cheque Amount (LKR) *</span>
              {numAmount > 0 && (
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatCurrency(numAmount)}
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-muted">Rs.</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-1.5 bg-background border border-theme-subtle text-sm font-black font-mono text-primary outline-none focus:border-emerald-500"
              />
            </div>
            {amountWords && (
              <p className="text-[11px] text-muted italic pt-1">
                <span className="font-semibold text-secondary not-italic">In Words:</span> {amountWords}
              </p>
            )}
          </div>

          {/* GL Account Selection (The core user requirement) */}
          <div className="space-y-1 bg-amber-500/5 border border-amber-500/25 p-3.5">
            <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 size={14} className="text-amber-500" />
              Linked GL Account (General Ledger ගිණුම) *
            </label>
            <select
              required
              value={targetAccountId}
              onChange={e => setTargetAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-amber-500"
            >
              <option value="">-- Select GL Account to Link this Cheque --</option>
              {eligibleAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.code ? `${a.code} - ` : ''}{a.name} ({a.type} • {a.subtype || 'General'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted mt-1">
              Funds will reflect in this GL account when realized, preserving cash flow accuracy.
            </p>
          </div>

          {/* Initial Status & Realization Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Initial Instrument Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              >
                <option value="Pending">Pending (Holding in safe / Not yet cleared)</option>
                <option value="Deposited">Deposited (Sent to bank for collection)</option>
                <option value="Cleared">Cleared (Already Realized in Bank)</option>
              </select>
            </div>

            {status === 'Cleared' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Realization Date *</label>
                <input
                  type="date"
                  required
                  value={realizedDate || chequeDate}
                  onChange={e => setRealizedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-emerald-500 text-xs font-semibold text-primary outline-none"
                />
              </div>
            )}
          </div>

          {/* Crossed & A/C Payee Checkboxes */}
          <div className="flex items-center gap-6 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-secondary">
              <input
                type="checkbox"
                checked={isCrossed}
                onChange={e => setIsCrossed(e.target.checked)}
                className="rounded-none border-theme-subtle text-primary focus:ring-0"
              />
              <span className="font-semibold">General Crossing (& Co.)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-secondary">
              <input
                type="checkbox"
                checked={isAccountPayee}
                onChange={e => setIsAccountPayee(e.target.checked)}
                className="rounded-none border-theme-subtle text-primary focus:ring-0"
              />
              <span className="font-semibold">Account Payee Only</span>
            </label>
          </div>

          {/* Purpose / Remarks */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-primary uppercase tracking-wider">Purpose / Reference Notes</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Settlement for Raw Materials invoice or Customer Project Advance"
              className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs text-primary outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={onClose}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
            >
              {submitting ? 'Registering...' : (
                <>
                  <Check size={14} />
                  <span>Register Cheque</span>
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
