import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Building2, Calendar, FileText, AlertCircle, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAccounts } from '@/hooks/useFinance';

export interface ChequeRealizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: any | null;
  onConfirmRealize: (payload: { realizedDate: string; realizedAccountId: string; notes?: string }) => Promise<void>;
}

export const ChequeRealizationModal: React.FC<ChequeRealizationModalProps> = ({
  isOpen,
  onClose,
  cheque,
  onConfirmRealize
}) => {
  const { data: accounts = [] } = useAccounts();
  const [realizedDate, setRealizedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState(() => cheque?.targetAccountId || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !cheque) return null;

  const isInward = cheque.direction === 'IN' || String(cheque.direction || '').toLowerCase().includes('inward');
  const amountVal = Number(cheque.amount || 0);

  // Eligible Liquidity / Bank accounts for realization
  const bankAccounts = accounts.filter(a => 
    a.type === 'Asset' && (a.subtype === 'Bank' || a.subtype === 'Cash' || a.name.toLowerCase().includes('bank') || a.code?.startsWith('10'))
  );

  const activeAccId = selectedAccountId || cheque.targetAccountId || (bankAccounts[0]?.id || 'acc_1000');
  const chosenAccount = accounts.find(a => a.id === activeAccId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realizedDate) {
      setErrorMsg('Please specify the date this cheque was realized in the bank.');
      return;
    }
    if (!activeAccId) {
      setErrorMsg('Please select the Bank / GL Account for realization.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirmRealize({
        realizedDate,
        realizedAccountId: activeAccId,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to realize cheque into General Ledger');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ice-blur bg-white/60 dark:bg-black/60 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-lg bg-surface border border-theme shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-none border ${
              isInward 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
            }`}>
              {isInward ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-primary tracking-tight">
                Realize Cheque into General Ledger (බැංකු නිෂ්කාශනය)
              </h3>
              <p className="text-[11px] text-muted">
                Execute formal GL double-entry on the exact Realization Date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary hover:bg-surface3 rounded-none transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Instrument Overview Pill */}
          <div className="p-3 bg-surface2/60 border border-theme-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-primary">
                Cheque #{cheque.chequeNo}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 uppercase border ${
                isInward 
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25' 
                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25'
              }`}>
                {isInward ? 'Inward (Client)' : 'Outward (Vendor)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary truncate">{cheque.payeeName}</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">
                {formatCurrency(amountVal)}
              </strong>
            </div>
            <div className="text-[11px] text-muted flex items-center gap-2">
              <span>Dated: {cheque.chequeDate ? formatDate(cheque.chequeDate) : '-'}</span>
              <span>•</span>
              <span>{cheque.bankName || 'General Bank'}</span>
            </div>
          </div>

          {/* Realization Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar size={13} className="text-emerald-500" />
              Realization / Clearance Date (මුදල් බැර/හර වූ දිනය) *
            </label>
            <input
              type="date"
              required
              value={realizedDate}
              onChange={e => setRealizedDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-muted">
              General Ledger posting will be stamped on this date (not the cheque issue date).
            </p>
          </div>

          {/* Target Bank GL Account */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 size={13} className="text-amber-500" />
              Realized Bank Account (GL Account) *
            </label>
            <select
              value={activeAccId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-theme-subtle text-xs font-semibold text-primary outline-none focus:border-emerald-500"
            >
              {bankAccounts.length > 0 ? (
                bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code ? `${a.code} - ` : ''}{a.name} ({a.subtype || a.type})
                  </option>
                ))
              ) : (
                <option value="acc_1000">1000 - Commercial Bank (Primary)</option>
              )}
            </select>
            {chosenAccount && (
              <p className="text-[10px] text-muted font-mono">
                Current GL Balance: {formatCurrency(Number(chosenAccount.balance || 0))}
              </p>
            )}
          </div>

          {/* Accounting Impact Preview */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              <span>Realization Double-Entry Preview:</span>
            </div>
            {isInward ? (
              <div className="text-[11px] space-y-0.5 font-mono text-secondary">
                <p>• <strong>DEBIT:</strong> {chosenAccount?.name || 'Bank Account'} (+{formatCurrency(amountVal)})</p>
                <p>• <strong>CREDIT:</strong> Accounts Receivable / Cheque Clearing (-{formatCurrency(amountVal)})</p>
              </div>
            ) : (
              <div className="text-[11px] space-y-0.5 font-mono text-secondary">
                <p>• <strong>DEBIT:</strong> Accounts Payable / Cheque Clearing (-{formatCurrency(amountVal)})</p>
                <p>• <strong>CREDIT:</strong> {chosenAccount?.name || 'Bank Account'} (-{formatCurrency(amountVal)})</p>
              </div>
            )}
          </div>

          {/* Optional Bank Clearance Reference / Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Bank Reference / Clearance Slip Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Cleared via SLIPS batch #9042"
              className="w-full px-3 py-1.5 bg-background border border-theme-subtle text-xs text-primary outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
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
              {submitting ? 'Realizing...' : (
                <>
                  <Check size={14} />
                  <span>Realize into GL</span>
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
