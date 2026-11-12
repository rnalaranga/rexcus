import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Calendar, FileText, CheckCircle2, AlertCircle, Paperclip, Upload, X, Eye } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createSupplierLedgerEntry, fetchAccounts, uploadFileToStorage } from '@/lib/api';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';

interface RecordBillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any | null;
  onSuccess?: () => void;
  toast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const RecordBillPaymentModal: React.FC<RecordBillPaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  onSuccess,
  toast
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cheque' | 'Cash' | 'Online / Card'>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [depositSlip, setDepositSlip] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState<boolean>(false);
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [creditAccountId, setCreditAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load COA accounts
  useEffect(() => {
    if (isOpen) {
      fetchAccounts().then(accs => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(err => console.error('Failed to load accounts for bill payment:', err));
    }
  }, [isOpen]);

  // Pre-fill form when bill changes
  useEffect(() => {
    if (bill && isOpen) {
      const billTotal = Number(bill.totalAmount || bill.amount || 0);
      const paid = Number(bill.paidAmount || 0);
      const remainingDue = Math.max(0, billTotal - paid);
      setAmount(remainingDue > 0 ? String(remainingDue) : (billTotal > 0 ? String(billTotal) : ''));
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('Bank Transfer');
      setReferenceNo('');
      setChequeNo('');
      setChequeDate(new Date().toISOString().slice(0, 10));
      setBankName(bill.supplier?.bankName || '');
      setDepositSlip('');
      setNotes(`Payment settlement for Bill ${bill.invoiceNo || bill.id}`);
    }
  }, [bill, isOpen]);

  // Set default debit & credit accounts once accounts are loaded
  useEffect(() => {
    if (accounts.length > 0) {
      if (!debitAccountId) {
        const ap = accounts.find((a: any) => a.code === '2000' || a.name?.toLowerCase().includes('payable') || a.type === 'Liability');
        if (ap) setDebitAccountId(ap.id);
      }
      if (!creditAccountId) {
        if (paymentMethod === 'Cash') {
          const cash = accounts.find((a: any) => a.code === '1000' || a.subtype === 'Cash' || a.name?.toLowerCase().includes('cash'));
          if (cash) setCreditAccountId(cash.id);
        } else {
          const bank = accounts.find((a: any) => a.subtype === 'Bank' || a.name?.toLowerCase().includes('bank') || a.code?.startsWith('10'));
          if (bank) setCreditAccountId(bank.id);
        }
      }
    }
  }, [accounts, paymentMethod]);

  if (!isOpen || !bill) return null;

  const billTotal = Number(bill.totalAmount || bill.amount || 0);
  const billPaid = Number(bill.paidAmount || 0);
  const remainingDue = Math.max(0, billTotal - billPaid);

  const liabilityAccounts = accounts.filter((a: any) => a.type === 'Liability');
  const bankAndCashAccounts = accounts.filter((a: any) => 
    a.type === 'Asset' && (a.subtype === 'Bank' || a.subtype === 'Cash' || a.code?.startsWith('10') || a.name?.toLowerCase().includes('cash') || a.name?.toLowerCase().includes('bank'))
  );

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSlip(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          setDepositSlip(base64);
          const uploaded = await uploadFileToStorage(base64, file.name, 'slips');
          if (uploaded && uploaded.url) {
            setDepositSlip(uploaded.url);
          }
          toast?.('Bank deposit slip attached successfully', 'success');
        } catch (err: any) {
          console.warn('Storage upload error, keeping dataUri fallback:', err);
        } finally {
          setIsUploadingSlip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast?.('Failed reading slip file', 'error');
      setIsUploadingSlip(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast?.('Please enter a valid payment amount greater than 0', 'error');
      return;
    }

    if (paymentMethod === 'Cheque' && !chequeNo.trim() && !referenceNo.trim()) {
      toast?.('Please provide the Cheque Number', 'error');
      return;
    }

    const debitAcc = accounts.find((a: any) => a.id === debitAccountId);
    const creditAcc = accounts.find((a: any) => a.id === creditAccountId);

    setIsSubmitting(true);
    try {
      const payload: any = {
        supplierId: bill.supplierId,
        date: date ? (date.length === 10 ? date + ' 12:00:00' : date.replace('T', ' ')) : new Date().toISOString().slice(0, 19).replace('T', ' '),
        type: 'payment',
        referenceNo: (paymentMethod === 'Cheque' ? (chequeNo || referenceNo) : referenceNo) || `PAY-${Date.now().toString().slice(-6)}`,
        description: notes.trim() || `Payment for Bill ${bill.invoiceNo || bill.id}`,
        debit: 0,
        credit: numAmount,
        amount: numAmount,
        paymentMethod,
        chequeNo: paymentMethod === 'Cheque' ? (chequeNo.trim() || referenceNo.trim() || undefined) : undefined,
        chequeDate: paymentMethod === 'Cheque' ? chequeDate : undefined,
        bankName: paymentMethod === 'Cheque' ? (bankName.trim() || undefined) : undefined,
        chequeStatus: paymentMethod === 'Cheque' ? 'Pending' : undefined,
        transactionRef: paymentMethod === 'Bank Transfer' ? (referenceNo.trim() || undefined) : undefined,
        depositSlip: depositSlip || undefined,
        debitAccountId: debitAccountId || undefined,
        creditAccountId: creditAccountId || undefined,
        debitAccountName: debitAcc ? `${debitAcc.code} - ${debitAcc.name}` : undefined,
        creditAccountName: creditAcc ? `${creditAcc.code} - ${creditAcc.name}` : undefined,
        relatedBillId: bill.id
      };

      await createSupplierLedgerEntry(payload);
      toast?.(`Payment of ${formatCurrency(numAmount)} recorded successfully for Bill ${bill.invoiceNo || bill.id}!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to record bill payment:', err);
      toast?.(err.message || 'Failed to record payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment — Bill #${bill.invoiceNo || bill.id}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {/* Bill Summary Banner */}
        <div className="bg-surface2/60 p-3.5 rounded-lg border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Vendor / Payee</span>
            <div className="font-bold text-sm text-primary flex items-center gap-2">
              <span>{bill.supplierName || bill.supplier?.name || `Vendor (${bill.supplierId})`}</span>
              <Badge variant={bill.status === 'paid' ? 'success' : 'warning'} size="sm">
                {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
            <div className="text-[11px] text-muted mt-0.5 font-mono">
              Bill Date: {bill.date ? formatDate(bill.date) : '—'} • Due: {bill.dueDate ? formatDate(bill.dueDate) : '—'}
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-theme-subtle sm:pl-4">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Remaining Due</span>
            <span className={`text-lg font-mono font-black ${remainingDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-500'}`}>
              {formatCurrency(remainingDue)}
            </span>
            <div className="text-[10px] text-muted">
              Total: {formatCurrency(billTotal)} {billPaid > 0 && `(Paid: ${formatCurrency(billPaid)})`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Payment Date */}
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Payment Date *
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full input-base text-xs"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Amount to Pay (LKR) *</span>
              {remainingDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(remainingDue))}
                  className="text-[10px] text-blue-500 hover:underline font-normal cursor-pointer"
                >
                  Pay Full Due
                </button>
              )}
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full input-base text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base"
              placeholder="0.00"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={e => {
                const m = e.target.value as any;
                setPaymentMethod(m);
                if (m === 'Cash') {
                  const cash = accounts.find((a: any) => a.code === '1000' || a.subtype === 'Cash' || a.name?.toLowerCase().includes('cash'));
                  if (cash) setCreditAccountId(cash.id);
                } else {
                  const bank = accounts.find((a: any) => a.subtype === 'Bank' || a.name?.toLowerCase().includes('bank') || a.code?.startsWith('10'));
                  if (bank) setCreditAccountId(bank.id);
                }
              }}
              className="w-full input-base text-xs font-medium"
            >
              <option value="Bank Transfer">Bank Transfer (SLIPS / CEFT)</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash (Petty Cash)</option>
              <option value="Online / Card">Online / Card</option>
            </select>
          </div>

          {/* Reference # */}
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              {paymentMethod === 'Cheque' ? 'Cheque No *' : paymentMethod === 'Bank Transfer' ? 'Transfer / SLIPS Ref #' : 'Payment Ref / Receipt #'}
            </label>
            <input
              type="text"
              value={paymentMethod === 'Cheque' ? chequeNo : referenceNo}
              onChange={e => {
                const val = e.target.value;
                if (paymentMethod === 'Cheque') setChequeNo(val);
                else setReferenceNo(val);
              }}
              placeholder={paymentMethod === 'Cheque' ? 'e.g. CHQ-992144' : 'e.g. TRF-77401 / CEFT'}
              className="w-full input-base text-xs font-mono"
            />
          </div>

          {/* Cheque Details if Cheque */}
          {paymentMethod === 'Cheque' && (
            <>
              <div>
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                  Cheque Date *
                </label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={e => setChequeDate(e.target.value)}
                  className="w-full input-base text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                  Cheque Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. Commercial Bank / Sampath Bank"
                  className="w-full input-base text-xs"
                />
              </div>
            </>
          )}

          {/* Debit Account: Liability */}
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Debit Account (Liability) *</span>
              <span className="text-[9px] font-mono text-rex-500 font-bold bg-surface2 px-1 rounded">DR</span>
            </label>
            <AccountAutocomplete
              value={debitAccountId}
              onChange={setDebitAccountId}
              placeholder="Search liability account (e.g. 2000 Accounts Payable)..."
              required
              className="text-xs"
            />
            <p className="text-[9px] text-muted mt-0.5">Supplier liability account being settled (2000 AP)</p>
          </div>

          {/* Credit Account: Paid From */}
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Credit Account (Paid From) *</span>
              <span className="text-[9px] font-mono text-emerald-500 font-bold bg-surface2 px-1 rounded">CR</span>
            </label>
            <AccountAutocomplete
              value={creditAccountId}
              onChange={setCreditAccountId}
              placeholder="Search source account (e.g. Bank / Cash)..."
              typeFilter="Asset"
              required
              className="text-xs"
            />
            <p className="text-[9px] text-muted mt-0.5">Asset account payment is drawn from (Bank / Cash)</p>
          </div>

          {/* Bank Slip Attachment */}
          <div className="col-span-2 space-y-1.5 p-2.5 rounded-lg bg-surface2/60 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <Paperclip size={13} className="text-purple-500" /> Bank Deposit Slip / Transfer Receipt (තැන්පතු ස්ලිප්පුව)
              </label>
              {depositSlip && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Attached
                </span>
              )}
            </div>
            {!depositSlip ? (
              <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-theme-subtle hover:border-purple-500/50 rounded-lg bg-surface/50 hover:bg-purple-500/5 transition-all cursor-pointer">
                <Upload size={14} className="text-secondary" />
                <span className="text-xs font-medium text-secondary">
                  {isUploadingSlip ? 'Uploading slip...' : 'Attach Deposit Slip (Image / PDF)'}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={isUploadingSlip}
                  onChange={handleSlipUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-1.5 bg-surface border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-2 truncate">
                  {depositSlip.startsWith('data:image') || /\.(jpg|jpeg|png|webp)($|\?)/i.test(depositSlip) ? (
                    <img src={depositSlip} alt="Slip" className="w-8 h-8 object-cover rounded border" />
                  ) : (
                    <FileText size={16} className="text-purple-500" />
                  )}
                  <span className="text-xs font-medium truncate">Bank Slip Attached</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={depositSlip}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-secondary hover:text-primary transition-colors"
                    title="Preview Slip"
                  >
                    <Eye size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setDepositSlip('')}
                    className="p-1 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove Slip"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Description / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Full settlement for Supplier Bill"
              className="w-full input-base text-xs"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-theme-subtle flex justify-end gap-2.5">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            <span>{isSubmitting ? 'Recording Payment...' : 'Record Payment'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
