import React, { useState, useEffect } from "react";
import { X, Receipt, CheckCircle, AlertCircle, Percent, DollarSign, Calendar, CreditCard, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { createPaymentReceipt, fetchPaymentReceipts } from "@/lib/api";
import { useAccounts } from "@/hooks/useFinance";
import { useDialog } from "@/components/ui/DialogProvider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotation?: any;
  order?: any;
  onSuccess: (receipt: any) => void;
  settings?: any;
}

export const CreatePaymentReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotation,
  order,
  onSuccess,
  settings
}) => {
  const { toast } = useDialog();
  const { data: accounts = [] } = useAccounts();

  // Quotation resolution
  const quoteData = quotation?.parsed || (typeof quotation?.data === "string" ? JSON.parse(quotation.data || "{}") : (quotation?.data || {}));
  const quotationId = quotation?.id || "";
  const quotationNo = quotation?.quotationNo || quotation?.docNo || quotation?.id || "";

  const customerId = quotation?.leadId || quotation?.customerId || quotation?.matchedCustomerId || order?.customerId || "CUST-DIRECT";
  const customerName = quotation?.leadCompany || quotation?.leadName || quotation?.customerCompany || quotation?.customerName || order?.customerName || "Customer";
  const customerCompany = quotation?.leadCompany || quotation?.customerCompany || order?.customerCompany || "";
  const customerAddress = quotation?.leadAddress || quotation?.customerAddress || order?.deliveryAddress || "";
  const customerPhone = quotation?.leadPhone || quotation?.customerPhone || order?.customerPhone || "";

  // Quoted total computation
  const quotedTotal = Number(
    quotation?.totalAmount ||
    quotation?.customAmount ||
    quoteData?.custTotals?.total ||
    quoteData?.jobTotals?.totalCost ||
    quotation?.total ||
    order?.totalAmount ||
    order?.total ||
    0
  );

  const [existingReceipts, setExistingReceipts] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Form states
  const [amount, setAmount] = useState<number | string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("Accounts Dept");
  const [submitting, setSubmitting] = useState(false);

  // Filter deposit accounts: Asset accounts of subtype Bank or Cash
  const depositAccounts = accounts.filter(
    (a: any) => a.type === "Asset" && (a.subtype === "Bank" || a.subtype === "Cash" || /bank|cash/i.test(a.name))
  );

  useEffect(() => {
    if (depositAccounts.length > 0 && !depositAccountId) {
      // Default to primary bank or cash
      const def = depositAccounts.find((a: any) => /commercial|boc|bank|main/i.test(a.name)) || depositAccounts[0];
      if (def) setDepositAccountId(def.id);
    }
  }, [depositAccounts, depositAccountId]);

  // Load existing receipts when opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingExisting(true);

    const qNo = quotationNo;
    const qId = quotationId;

    fetchPaymentReceipts({ quotationNo: qNo, quoteId: qId })
      .then((res: any[]) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : [];
        setExistingReceipts(list);

        const totalPaid = list.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const rem = Math.max(0, quotedTotal - totalPaid);

        // Pre-fill amount
        if (totalPaid === 0 && quotedTotal > 0) {
          // Default to 50% advance for first payment
          setAmount(Math.round(quotedTotal * 0.5));
        } else if (rem > 0) {
          setAmount(rem);
        } else {
          setAmount(0);
        }

        setNotes(
          qNo
            ? ("Advance payment against Quotation " + qNo)
            : "Customer Advance Payment Receipt"
        );
      })
      .catch((err) => {
        console.error("Failed to fetch existing receipts:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingExisting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, quotationId, quotationNo, quotedTotal]);

  if (!isOpen) return null;

  const totalPaidSoFar = existingReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const remainingBalance = Math.max(0, quotedTotal - totalPaidSoFar);

  const applyPercent = (pct: number) => {
    if (quotedTotal <= 0) return;
    const calc = Math.round(quotedTotal * (pct / 100));
    setAmount(calc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast("Please enter a valid advance payment amount greater than zero.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const selectedAccount = depositAccounts.find((a: any) => a.id === depositAccountId);
      const payload = {
        date,
        customerId,
        customerName: customerName || "Customer",
        customerCompany,
        customerAddress,
        customerPhone,
        quotationId: quotationId || null,
        quotationNo: quotationNo || null,
        orderId: order?.id || null,
        orderNo: order?.orderNo || null,
        amount: numAmount,
        paymentMethod,
        depositAccountId: depositAccountId || null,
        depositAccountName: selectedAccount ? selectedAccount.name : depositAccountId,
        reference: reference.trim() || null,
        notes: notes.trim() || ("Advance payment against Quotation " + quotationNo),
        receivedBy: receivedBy.trim() || "Accounts Dept",
        totalQuoted: quotedTotal
      };

      const res = await createPaymentReceipt(payload);
      if (res.error) throw new Error(res.error);

      toast("Official Advance Payment Receipt " + (res.receiptNo || "") + " generated successfully!", "success");
      onSuccess(res);
      onClose();
    } catch (err: any) {
      toast(err?.message || "Failed to create payment receipt.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface border border-theme-subtle rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-surface2/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-primary flex items-center gap-2">
                Issue Advance Payment Receipt
                {quotationNo && (
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {quotationNo}
                  </span>
                )}
              </h2>
              <p className="text-[12px] text-muted">Acknowledge advance payment & record deposit in General Ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)]">
          {/* Summary Box */}
          <div className="bg-surface2/40 border border-theme-subtle rounded-xl p-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-bold text-muted uppercase">Customer</div>
              <div className="text-xs font-bold text-primary truncate mt-0.5">{customerCompany || customerName}</div>
              {customerCompany && customerName !== customerCompany && (
                <div className="text-[10px] text-muted truncate">Attn: {customerName}</div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted uppercase">Quotation Total</div>
              <div className="text-sm font-black text-primary mt-0.5">{formatCurrency(quotedTotal)}</div>
              {totalPaidSoFar > 0 && (
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Paid so far: {formatCurrency(totalPaidSoFar)}
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted uppercase">Remaining Balance</div>
              <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(remainingBalance)}
              </div>
              <div className="text-[10px] text-muted mt-0.5">To invoice on delivery</div>
            </div>
          </div>

          {/* Existing Receipts Notice */}
          {existingReceipts.length > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle size={14} /> Prior Advance Receipts Recorded ({existingReceipts.length})
              </div>
              <div className="space-y-1">
                {existingReceipts.map((r) => (
                  <div key={r.id} className="text-[11px] flex items-center justify-between text-muted">
                    <span>
                      <strong className="text-primary font-mono">{r.receiptNo}</strong> ({r.paymentMethod}) - {r.date?.slice(0, 10)}
                    </span>
                    <span className="font-bold text-emerald-600">{formatCurrency(Number(r.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amount input & quick buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Advance Amount to Receive (LKR) *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPercent(25)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface2 hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => applyPercent(50)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface2 hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => applyPercent(75)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface2 hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(remainingBalance || quotedTotal)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface2 hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                >
                  100% (Balance)
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-black text-muted">Rs.</span>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 bg-background border border-theme-subtle rounded-xl text-base font-black text-primary outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Grid: Date & Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-500" /> Receipt Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-xl text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <CreditCard size={14} className="text-purple-500" /> Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-xl text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              >
                <option value="Bank Transfer">Bank Transfer / Online</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Credit / Debit Card</option>
              </select>
            </div>
          </div>

          {/* Grid: Deposit Account & Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Building2 size={14} className="text-amber-500" /> Deposited Into (GL Account) *
              </label>
              <select
                value={depositAccountId}
                onChange={(e) => setDepositAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-xl text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              >
                {depositAccounts.length > 0 ? (
                  depositAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.code ? a.code + " - " : ""}{a.name} ({a.subtype || a.type})
                    </option>
                  ))
                ) : (
                  <option value="">1050 - Bank Account (Default Asset)</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary">Reference / Cheque / Slip No</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. CHQ-104928 or Ref 928341"
                className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-xl text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Received By & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <User size={14} className="text-blue-500" /> Received By
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Staff name / Accounts Dept"
                className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-xl text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary">Notes / Particulars</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Advance payment description"
                className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-xl text-xs font-semibold text-primary outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Statutory Explanatory Callout */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900 dark:text-blue-300">
            <AlertCircle size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Sri Lanka Accounting Standard:</span> Advance receipt vouchers credit
              <code className="mx-1 px-1 py-0.5 rounded bg-blue-500/20 font-bold">Customer Advance Liability</code> or
              <code className="mx-1 px-1 py-0.5 rounded bg-blue-500/20 font-bold">AR</code>. The official
              <strong> Final Tax Invoice</strong> will be generated upon dispatch/delivery with this advance deducted.
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-theme-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-muted hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              icon={Receipt}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {submitting ? "Issuing Receipt..." : "Issue & Print Payment Receipt"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
