import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  FileText,
  CheckCircle2,
  Paperclip,
  Upload,
  X,
  Eye,
  ArrowRight,
  Building2,
  Printer,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, openDataUriOrUrl } from '@/lib/utils';
import {
  recordPoAdvancePayment,
  fetchAccounts,
  uploadFileToStorage,
} from '@/lib/api';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';

interface RecordPoAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any | null;
  supplierName?: string;
  onSuccess?: (result: any) => void;
  onPrintVoucher?: (voucher: any) => void;
  toast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const RecordPoAdvanceModal: React.FC<RecordPoAdvanceModalProps> = ({
  isOpen,
  onClose,
  po,
  supplierName,
  onSuccess,
  onPrintVoucher,
  toast,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<
    'Bank Transfer' | 'Cheque' | 'Cash' | 'Online / Card'
  >('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [depositSlip, setDepositSlip] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState<boolean>(false);

  // From Account (Credit - Bank / Cash) & To Account (Debit - Supplier Advance / AP)
  const [creditAccountId, setCreditAccountId] = useState<string>('');
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
        .then((accs) => {
          if (Array.isArray(accs)) setAccounts(accs);
        })
        .catch((err) => console.error('Failed to load accounts for PO advance:', err));
    }
  }, [isOpen]);

  const poTotal = Number(po?.totalAmount || 0);
  const alreadyPaidAdv = Number(po?.advancePaid || 0);
  const remainingPoBalance = Math.max(0, poTotal - alreadyPaidAdv);
  const existingVouchers: any[] = Array.isArray(po?.advanceVouchers)
    ? po.advanceVouchers
    : [];

  useEffect(() => {
    if (po && isOpen) {
      const rem = Math.max(0, Number(po.totalAmount || 0) - Number(po.advancePaid || 0));
      setAmount(rem > 0 ? String(rem) : '');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('Bank Transfer');
      setReferenceNo('');
      setChequeNo('');
      setChequeDate(new Date().toISOString().slice(0, 10));
      setBankName('');
      setDepositSlip('');
      setNotes(`Advance payment for Purchase Order #${po.id}`);
    }
  }, [po, isOpen]);

  // Auto-select default From (Credit) & To (Debit) accounts
  useEffect(() => {
    if (accounts.length > 0) {
      if (!debitAccountId) {
        const adv =
          accounts.find(
            (a: any) =>
              a.code === '1450' ||
              a.id === 'acc_1450' ||
              /advance.*supplier|supplier.*advance|vendor.*advance|prepayment/i.test(
                a.name || ''
              )
          ) ||
          accounts.find(
            (a: any) =>
              a.code === '2000' ||
              a.name?.toLowerCase().includes('payable') ||
              a.type === 'Liability'
          );
        if (adv) setDebitAccountId(adv.id);
      }

      if (paymentMethod === 'Cash') {
        const cash = accounts.find(
          (a: any) =>
            a.subtype === 'Cash' ||
            a.name?.toLowerCase().includes('cash') ||
            a.code === '1100'
        );
        if (cash) setCreditAccountId(cash.id);
      } else {
        const bank = accounts.find(
          (a: any) =>
            a.subtype === 'Bank' ||
            a.name?.toLowerCase().includes('bank') ||
            a.code === '1000'
        );
        if (bank) setCreditAccountId(bank.id);
      }
    }
  }, [accounts, paymentMethod]);

  if (!isOpen || !po) return null;

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
          toast?.('Payment slip attached', 'success');
        } catch (err) {
          console.warn('Slip upload fallback:', err);
        } finally {
          setIsUploadingSlip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingSlip(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast?.('Please enter a valid advance amount greater than 0', 'error');
      return;
    }
    if (paymentMethod === 'Cheque' && !chequeNo.trim() && !referenceNo.trim()) {
      toast?.('Please enter the Cheque Number', 'error');
      return;
    }
    if (!creditAccountId) {
      toast?.('Please select the Paying From Account (Bank / Cash)', 'error');
      return;
    }
    if (!debitAccountId) {
      toast?.('Please select the To Account (Supplier Advance / Payable)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordPoAdvancePayment(po.id, {
        supplierId: po.supplierId,
        supplierName: supplierName || po.supplierName || 'Vendor',
        amount: numAmount,
        date,
        paymentMethod,
        creditAccountId,
        debitAccountId,
        referenceNo: referenceNo.trim() || undefined,
        chequeNo:
          paymentMethod === 'Cheque'
            ? chequeNo.trim() || referenceNo.trim()
            : undefined,
        chequeDate: paymentMethod === 'Cheque' ? chequeDate : undefined,
        bankName: paymentMethod === 'Cheque' ? bankName.trim() : undefined,
        depositSlip: depositSlip || undefined,
        notes: notes.trim() || `Advance Payment for PO #${po.id}`,
      });

      toast?.(
        `PO Advance of ${formatCurrency(numAmount)} recorded! Payment Voucher ${res.voucherNo} generated & synced to Cashflow.`,
        'success'
      );
      onClose();
      if (onSuccess) onSuccess(res);
      if (onPrintVoucher && res.voucher) {
        onPrintVoucher(res.voucher);
      }
    } catch (err: any) {
      toast?.(err.message || 'Failed to record PO advance payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pay Vendor Advance & Issue Payment Voucher — PO #${po.id}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {/* PO Financial Banner */}
        <div className="bg-surface2/70 p-3.5 rounded-lg border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
              Purchase Order &amp; Vendor
            </span>
            <div className="font-bold text-sm text-primary flex items-center gap-2 flex-wrap mt-0.5">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {po.id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 size={13} className="text-muted" />
                {supplierName || po.supplierName || po.supplierId}
              </span>
              <Badge value={po.status || 'Ordered'} size="sm" />
            </div>
            <div className="text-[11px] text-muted mt-0.5 font-mono">
              PO Date: {po.date ? formatDate(po.date) : '—'} • PO Total:{' '}
              <strong className="text-primary">{formatCurrency(poTotal)}</strong>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-theme-subtle sm:pl-4">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
              Remaining Unpaid on PO
            </span>
            <span className="text-lg font-mono font-black text-amber-500">
              {formatCurrency(remainingPoBalance)}
            </span>
            {alreadyPaidAdv > 0 && (
              <div className="text-[10px] font-mono text-emerald-500 font-bold">
                Already Paid Advance: {formatCurrency(alreadyPaidAdv)}
              </div>
            )}
          </div>
        </div>

        {/* Existing Advance Vouchers for this PO (if any) */}
        {existingVouchers.length > 0 && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/25 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>Issued Advance Payment Vouchers for PO #{po.id}</span>
              <span className="font-mono">
                Total: {formatCurrency(alreadyPaidAdv)}
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {existingVouchers.map((v: any, idx: number) => (
                <div
                  key={v.id || v.voucherNo || idx}
                  className="flex items-center justify-between text-xs bg-surface px-2.5 py-1.5 rounded border border-theme-subtle"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {v.voucherNo}
                    </span>
                    <span className="text-[11px] text-muted">
                      {v.date ? formatDate(v.date) : ''} • {v.paymentMethod}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">
                      {formatCurrency(Number(v.amount || 0))}
                    </span>
                    {onPrintVoucher && (
                      <button
                        type="button"
                        onClick={() =>
                          onPrintVoucher({
                            ...v,
                            payeeName: supplierName || po.supplierName || 'Vendor',
                            category: 'PO Advance Payment',
                            relatedBillNo: `PO: ${po.id}`,
                          })
                        }
                        className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/20 flex items-center gap-1"
                      >
                        <Printer size={10} /> Print Voucher
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 1: Date & Advance Amount with quick % buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Payment Date *
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full input-base text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Advance Amount (LKR) *</span>
              {poTotal > 0 && (
                <div className="flex items-center gap-1">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        setAmount(
                          String(
                            Math.round(
                              (pct === 100 ? remainingPoBalance : (poTotal * pct) / 100) *
                                100
                            ) / 100
                          )
                        )
                      }
                      className="px-1.5 py-0.2 text-[9.5px] font-mono font-bold bg-surface2 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-theme-subtle rounded"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full input-base text-xs font-mono font-bold text-primary"
            />
          </div>
        </div>

        {/* Row 2: Payment Method & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full input-base text-xs"
            >
              <option value="Bank Transfer">Bank Transfer / SLIPS / CEFT</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Online / Card">Online / Corporate Card</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              {paymentMethod === 'Cheque'
                ? 'Cheque Number *'
                : 'Bank Ref / Transfer ID'}
            </label>
            <input
              type="text"
              value={paymentMethod === 'Cheque' ? chequeNo : referenceNo}
              onChange={(e) =>
                paymentMethod === 'Cheque'
                  ? setChequeNo(e.target.value)
                  : setReferenceNo(e.target.value)
              }
              placeholder={
                paymentMethod === 'Cheque'
                  ? 'e.g. 849201'
                  : 'e.g. TRF-99201 / Voucher Ref'
              }
              className="w-full input-base text-xs font-mono"
            />
          </div>
        </div>

        {/* Cheque Extra Fields */}
        {paymentMethod === 'Cheque' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-lg bg-surface2/60 border border-theme-subtle">
            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Cheque Date (PD / Current)
              </label>
              <input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="w-full input-base text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Commercial Bank / HNB / Sampath"
                className="w-full input-base text-xs"
              />
            </div>
          </div>
        )}

        {/* Row 3: Account Mapping (From Account -> To Account) */}
        <div className="p-3.5 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/25 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Wallet size={13} /> General Ledger &amp; Cashflow Account Mapping (From
              &rarr; To)
            </span>
            <span className="text-[10px] text-muted font-mono">
              Auto-posts GL &amp; Daily Cashflow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* FROM Account (Credit) */}
            <div>
              <label className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                1. Pay From Account (Credit — Bank / Cash) *
              </label>
              <AccountAutocomplete
                value={creditAccountId}
                onChange={(accId) => setCreditAccountId(accId)}
                accounts={accounts}
                placeholder="Select Bank or Cash account..."
                className="text-xs"
              />
              <span className="text-[10px] text-muted block mt-0.5">
                Money goes OUT from this account (shows in Cashflow)
              </span>
            </div>

            {/* TO Account (Debit) */}
            <div>
              <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                2. Charge To Account (Debit — Vendor Advance / AP) *
              </label>
              <AccountAutocomplete
                value={debitAccountId}
                onChange={(accId) => setDebitAccountId(accId)}
                accounts={accounts}
                placeholder="Select Supplier Advance (1450) or AP (2000)..."
                className="text-xs"
              />
              <span className="text-[10px] text-muted block mt-0.5">
                Debited as Vendor Advance / Prepayment for PO #{po.id}
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: Notes & Deposit Slip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Voucher Narration / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Advance payment for PO #${po.id}`}
              className="w-full input-base text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Bank Slip / Receipt Attachment (Optional)
            </label>
            {depositSlip ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-surface2 border border-emerald-500/30 rounded text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 truncate">
                  <CheckCircle2 size={12} /> Slip Attached
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openDataUriOrUrl(depositSlip, `PO_Advance_Slip_${po.id}`)}
                    className="text-blue-500 hover:underline flex items-center gap-0.5"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositSlip('')}
                    className="text-rose-500 hover:underline"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-theme-subtle hover:border-amber-500 rounded bg-surface2/50 cursor-pointer text-xs text-secondary hover:text-primary transition-colors">
                <Upload size={13} className="text-amber-500" />
                <span>{isUploadingSlip ? 'Uploading...' : 'Attach Bank Transfer Slip'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleSlipUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-subtle">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={isSubmitting}
            icon={CheckCircle2}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Pay Advance &amp; Generate Payment Voucher
          </Button>
        </div>
      </form>
    </Modal>
  );
};
