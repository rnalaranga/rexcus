import React, { useState, useEffect } from "react";
import {
  X,
  Receipt,
  CheckCircle,
  AlertCircle,
  Percent,
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  User,
  Package,
  Clock,
  ShieldCheck,
  Tag,
  Phone,
  Mail,
  MapPin,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, numberToWords } from "@/lib/utils";
import { createPaymentReceipt, fetchPaymentReceipts } from "@/lib/api";
import { useAccounts } from "@/hooks/useFinance";
import { useDialog } from "@/components/ui/DialogProvider";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();

  // Quotation & Order resolution
  const quoteData = quotation?.parsed || (typeof quotation?.data === "string" ? JSON.parse(quotation.data || "{}") : (quotation?.data || {}));
  const quotationId = quotation?.id || order?.quoteId || "";
  const quotationNo = quotation?.quotationNo || quotation?.docNo || quotation?.id || order?.quotationNo || "";
  const orderId = order?.id || quotation?.orderId || "";
  const orderNo = order?.orderNo || quotation?.orderNo || "";

  const customerId = quotation?.leadId || quotation?.customerId || quotation?.matchedCustomerId || order?.customerId || "CUST-DIRECT";
  const customerName = quotation?.leadCompany || quotation?.leadName || quotation?.customerCompany || quotation?.customerName || order?.customerName || "Customer";
  const customerCompany = quotation?.leadCompany || quotation?.customerCompany || order?.customerCompany || "";
  const customerAddress = quotation?.leadAddress || quotation?.customerAddress || order?.deliveryAddress || "";
  const customerPhone = quotation?.leadPhone || quotation?.customerPhone || order?.customerPhone || "";
  const customerEmail = quotation?.leadEmail || quotation?.customerEmail || order?.customerEmail || "";
  const customerAttention = quotation?.attention || order?.attention || "";
  const paymentTerms = order?.paymentTerms || quotation?.paymentTerms || quoteData?.terms?.paymentTerms || "";
  const deliveryTerms = order?.deliveryTerms || quotation?.deliveryTerms || quoteData?.terms?.deliveryTerms || "";

  // Quoted total computation (prioritize order totalPrice if order is provided)
  const quotedTotal = Number(
    order?.totalPrice ||
    order?.totalAmount ||
    order?.total ||
    quotation?.totalAmount ||
    quotation?.customAmount ||
    quoteData?.custTotals?.total ||
    quoteData?.jobTotals?.totalCost ||
    quotation?.total ||
    0
  );

  // Extract order/quotation scope items
  let itemsList: any[] = [];
  if (Array.isArray(order?.items)) {
    itemsList = order.items;
  } else if (typeof order?.items === "string") {
    try {
      itemsList = JSON.parse(order.items);
    } catch (e) {}
  } else if (Array.isArray(quotation?.items)) {
    itemsList = quotation.items;
  } else if (typeof quotation?.items === "string") {
    try {
      itemsList = JSON.parse(quotation.items);
    } catch (e) {}
  } else if (Array.isArray(quoteData?.items)) {
    itemsList = quoteData.items;
  } else if (Array.isArray(quoteData?.products)) {
    itemsList = quoteData.products;
  }

  if (itemsList.length === 0 && (order?.productName || quotation?.productName)) {
    itemsList = [
      {
        productName: order?.productName || quotation?.productName,
        quantity: order?.quantity || quotation?.quantity || 1,
        unitPrice: order?.unitPrice || quotation?.unitPrice || quotedTotal,
        totalPrice: quotedTotal
      }
    ];
  }

  const [existingReceipts, setExistingReceipts] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Form states
  const [amount, setAmount] = useState<number | string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [notes, setNotes] = useState("");
  const [attention, setAttention] = useState(customerAttention);
  const [receivedBy, setReceivedBy] = useState(user?.name || "Accounts Dept");
  const [submitting, setSubmitting] = useState(false);

  // Filter deposit accounts: Asset accounts of subtype Bank or Cash
  const depositAccounts = accounts.filter(
    (a: any) => a.type === "Asset" && (a.subtype === "Bank" || a.subtype === "Cash" || /bank|cash/i.test(a.name))
  );

  useEffect(() => {
    if (depositAccounts.length > 0 && !depositAccountId) {
      const def = depositAccounts.find((a: any) => /commercial|boc|bank|main/i.test(a.name)) || depositAccounts[0];
      if (def) setDepositAccountId(def.id);
    }
  }, [depositAccounts, depositAccountId]);

  useEffect(() => {
    if (customerAttention && !attention) {
      setAttention(customerAttention);
    }
  }, [customerAttention, attention]);

  useEffect(() => {
    if (user?.name && (!receivedBy || receivedBy === "Accounts Dept")) {
      setReceivedBy(user.name);
    }
  }, [user, receivedBy]);

  // Load existing receipts when opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingExisting(true);

    const qNo = quotationNo;
    const qId = quotationId;
    const oNo = orderNo;
    const oId = orderId;

    fetchPaymentReceipts({
      quotationNo: qNo || undefined,
      quoteId: qId || undefined,
      orderNo: oNo || undefined,
      orderId: oId || undefined
    })
      .then((res: any[]) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : [];
        setExistingReceipts(list);

        const totalPaid = list.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const rem = Math.max(0, quotedTotal - totalPaid);

        // Pre-fill amount
        if (totalPaid === 0 && quotedTotal > 0) {
          setAmount(Math.round(quotedTotal * 0.5));
        } else if (rem > 0) {
          setAmount(rem);
        } else {
          setAmount(0);
        }

        setNotes(
          oNo
            ? `Advance payment against Sales Order ${oNo}`
            : qNo
            ? `Advance payment against Quotation ${qNo}`
            : "Customer Advance Payment Receipt"
        );
      })
      .catch((err) => {
        console.error("Failed to fetch existing receipts:", err);
        if (isMounted) {
          if (quotedTotal > 0) {
            setAmount((prev) => (prev ? prev : Math.round(quotedTotal * 0.5)));
          }
          setNotes((prev) =>
            prev
              ? prev
              : oNo
              ? `Advance payment against Sales Order ${oNo}`
              : qNo
              ? `Advance payment against Quotation ${qNo}`
              : "Customer Advance Payment Receipt"
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoadingExisting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, quotationId, quotationNo, orderId, orderNo, quotedTotal]);

  if (!isOpen) return null;

  const totalPaidSoFar = existingReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const remainingBalance = Math.max(0, quotedTotal - totalPaidSoFar);
  const currentAmountNum = Number(amount) || 0;
  const balanceAfterCurrent = Math.max(0, remainingBalance - currentAmountNum);
  const currentAdvancePercent = quotedTotal > 0 ? ((currentAmountNum / quotedTotal) * 100).toFixed(1) : "0.0";
  const paidPercentNow = quotedTotal > 0 ? Math.min(100, Math.round(((totalPaidSoFar + currentAmountNum) / quotedTotal) * 100)) : 0;
  const amountWords = numberToWords(currentAmountNum);

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
      
      let finalReference = reference.trim();
      if (paymentMethod === "Cheque" && chequeBank.trim()) {
        finalReference = finalReference ? `${finalReference} (${chequeBank.trim()})` : chequeBank.trim();
      }

      const payload = {
        date,
        customerId,
        customerName: customerName || "Customer",
        customerCompany,
        customerAddress,
        customerPhone,
        attention: (attention || customerAttention || "").trim() || null,
        quoteId: quotationId || null,
        quotationId: quotationId || null,
        quotationNo: quotationNo || null,
        orderId: orderId || null,
        orderNo: orderNo || null,
        amount: numAmount,
        paymentMethod,
        accountId: depositAccountId || null,
        depositAccountId: depositAccountId || null,
        accountName: selectedAccount ? selectedAccount.name : depositAccountId,
        depositAccountName: selectedAccount ? selectedAccount.name : depositAccountId,
        reference: finalReference || null,
        notes: notes.trim() || (orderNo ? `Advance payment against Sales Order ${orderNo}` : `Advance payment against Quotation ${quotationNo}`),
        receivedBy: receivedBy.trim() || "Accounts Dept",
        totalQuoted: quotedTotal,
        totalQuotedAmount: quotedTotal,
        balanceDue: balanceAfterCurrent
      };

      const res = await createPaymentReceipt(payload);
      if (res.error) throw new Error(res.error);

      const createdReceipt = res.receipt || res;
      toast("Official Advance Payment Receipt " + (createdReceipt.receiptNo || "") + " generated successfully!", "success");
      onSuccess(createdReceipt);
      onClose();
    } catch (err: any) {
      toast(err?.message || "Failed to create payment receipt.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface border border-theme-subtle rounded-none max-w-5xl w-full flex flex-col shadow-2xl overflow-hidden animate-fade-in my-6 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-surface2/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-primary">
                  Issue Advance Payment Receipt (Voucher)
                </h2>
                {orderNo && (
                  <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Order: {orderNo}
                  </span>
                )}
                {quotationNo && (
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Quote: {quotationNo}
                  </span>
                )}
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {customerCompany || customerName}
                </span>
              </div>
              <p className="text-[11.5px] text-muted mt-0.5">
                Record customer advance consideration & deposit into General Ledger before final tax invoice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface2 rounded-none transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Spacious 2-Column Responsive Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT PANEL: Order, Scope, Customer & History (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Customer Profile Card */}
              <div className="bg-surface2/50 border border-theme-subtle rounded-none p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-primary">
                  <span className="flex items-center gap-1.5 text-muted uppercase text-[11px] tracking-wider">
                    <Building2 size={13} className="text-muted" /> Customer Information
                  </span>
                  <span className="font-mono text-[10px] text-muted">{customerId}</span>
                </div>
                <div>
                  <div className="text-sm font-black text-primary leading-tight">
                    {customerCompany || customerName}
                  </div>
                  {customerAttention ? (
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Attn: {customerAttention}
                    </div>
                  ) : customerCompany && customerName !== customerCompany ? (
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Attn: {customerName}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1 text-xs text-muted pt-1 border-t border-theme-subtle/60">
                  {customerPhone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone size={12} className="text-muted shrink-0" />
                      <span>{customerPhone}</span>
                    </div>
                  )}
                  {customerEmail && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail size={12} className="text-muted shrink-0" />
                      <span>{customerEmail}</span>
                    </div>
                  )}
                  {customerAddress && (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={12} className="text-muted shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{customerAddress}</span>
                    </div>
                  )}
                  {paymentTerms && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <Tag size={12} className="shrink-0" />
                      <span>Terms: {paymentTerms}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Scope / Line Items Preview */}
              <div className="bg-surface2/50 border border-theme-subtle rounded-none p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Package size={13} className="text-muted" /> Scope Items ({itemsList.length})
                  </span>
                  <span className="text-primary font-mono">{formatCurrency(quotedTotal)}</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-theme-subtle/50 text-xs">
                  {itemsList.length > 0 ? (
                    itemsList.map((item, idx) => (
                      <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-primary truncate text-[11.5px]">
                            {item.productName || item.name || item.description || `Item #${idx + 1}`}
                          </div>
                          <div className="text-[10px] text-muted">
                            Qty: <strong className="text-primary">{item.quantity || item.qty || 1}</strong> × {formatCurrency(Number(item.unitPrice || item.price || 0))}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-primary text-xs shrink-0">
                          {formatCurrency(Number(item.totalPrice || item.total || (Number(item.quantity || 1) * Number(item.unitPrice || 0))))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted italic py-1">Direct job consideration</div>
                  )}
                </div>
              </div>

              {/* Payment Progress & Prior Receipts History */}
              <div className="bg-surface2/50 border border-theme-subtle rounded-none p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-muted" /> Advance Receipts History
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {paidPercentNow}% Covered
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface border border-theme-subtle rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${paidPercentNow}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Paid so far: <strong className="text-primary">{formatCurrency(totalPaidSoFar)}</strong></span>
                  <span>Balance: <strong className="text-amber-600 dark:text-amber-400">{formatCurrency(balanceAfterCurrent)}</strong></span>
                </div>

                {/* Prior Receipts List */}
                {existingReceipts.length > 0 ? (
                  <div className="space-y-1.5 pt-1 border-t border-theme-subtle/60 max-h-28 overflow-y-auto">
                    {existingReceipts.map((r) => (
                      <div
                        key={r.id}
                        className="text-[11px] bg-surface p-2 rounded-none border border-theme-subtle flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-primary flex items-center gap-1">
                            <CheckCircle size={11} className="text-emerald-500" /> {r.receiptNo}
                          </div>
                          <div className="text-[10px] text-muted">
                            {r.date?.slice(0, 10)} • {r.paymentMethod} {r.reference ? `(${r.reference})` : ""}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-emerald-600">
                          {formatCurrency(Number(r.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted italic bg-surface p-2 rounded-none border border-theme-subtle flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-muted shrink-0" />
                    <span>No prior advance vouchers recorded for this order/quote yet.</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: Form Entries & Payment Details (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Financial Breakdown Metric Badges */}
              <div className="bg-surface2/60 border border-theme-subtle rounded-none p-3 grid grid-cols-3 gap-3 text-center">
                <div className="p-1">
                  <div className="text-[10px] font-bold text-muted uppercase">Total Consideration</div>
                  <div className="text-xs md:text-sm font-black text-primary mt-0.5">
                    {formatCurrency(quotedTotal)}
                  </div>
                </div>
                <div className="p-1 border-x border-theme-subtle">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">This Receipt ({currentAdvancePercent}%)</div>
                  <div className="text-xs md:text-sm font-black text-emerald-600 mt-0.5">
                    {formatCurrency(currentAmountNum)}
                  </div>
                </div>
                <div className="p-1">
                  <div className="text-[10px] font-bold text-amber-600 uppercase">Balance on Delivery</div>
                  <div className="text-xs md:text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {formatCurrency(balanceAfterCurrent)}
                  </div>
                </div>
              </div>

              {/* Amount input & quick buttons */}
              <div className="space-y-2 bg-surface2/30 border border-theme-subtle rounded-none p-4">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-600" /> Advance Amount to Receive (LKR) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyPercent(25)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPercent(30)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                    >
                      30%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPercent(50)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPercent(75)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(remainingBalance || quotedTotal)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface hover:bg-emerald-500/10 hover:text-emerald-600 text-muted transition-colors border border-theme-subtle"
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
                    className="w-full pl-10 pr-4 py-2 bg-background border border-theme-subtle rounded-none text-base font-black text-primary outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                  />
                </div>
                {/* Live Amount in words preview */}
                {currentAmountNum > 0 && (
                  <div className="text-[11px] text-muted italic bg-surface p-2 rounded-none border border-theme-subtle flex items-start gap-1.5">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 not-italic">In Words:</span>
                    <span className="text-primary font-medium">{amountWords}</span>
                  </div>
                )}
              </div>

              {/* Grid: Date & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" /> Receipt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <CreditCard size={14} className="text-purple-500" /> Payment Mode *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
                  >
                    <option value="Bank Transfer">Bank Transfer / Online</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              {/* Grid: Deposit Account & Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Building2 size={14} className="text-amber-500" /> Deposited Account (GL) *
                  </label>
                  <select
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
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
                  <label className="text-xs font-bold text-primary">
                    Reference / Slip / Cheque No
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={paymentMethod === "Cheque" ? "e.g. CHQ-882102" : "e.g. Txn / Slip Ref No"}
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Extra Cheque Details if Cheque */}
              {paymentMethod === "Cheque" && (
                <div className="space-y-1.5 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-none">
                  <label className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Drawn Bank Name & Branch
                  </label>
                  <input
                    type="text"
                    value={chequeBank}
                    onChange={(e) => setChequeBank(e.target.value)}
                    placeholder="e.g. Commercial Bank - Colombo / HNB - Negombo"
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Operational Personnel: Attn & Received By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <User size={14} className="text-blue-500" /> Customer Attention (Attn)
                  </label>
                  <input
                    type="text"
                    value={attention}
                    onChange={(e) => setAttention(e.target.value)}
                    placeholder="Contact person name"
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" /> Received / Issued By
                  </label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Staff name / Accounts Dept"
                    className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes with Quick Suggestions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary">Notes / Particulars Description</label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setNotes(`50% Advance with confirmed PO`)}
                      className="px-1.5 py-0.5 rounded bg-surface hover:bg-surface2 text-muted border border-theme-subtle"
                    >
                      50% PO Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotes(`Initial production deposit`)}
                      className="px-1.5 py-0.5 rounded bg-surface hover:bg-surface2 text-muted border border-theme-subtle"
                    >
                      Production Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotes(`Advance payment against ${orderNo ? `Sales Order ${orderNo}` : `Quotation ${quotationNo}`}`)}
                      className="px-1.5 py-0.5 rounded bg-surface hover:bg-surface2 text-muted border border-theme-subtle"
                    >
                      Ref Link
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Advance payment description"
                  className="w-full px-3 py-2 bg-background border border-theme-subtle rounded-none text-xs font-semibold text-primary outline-none focus:border-emerald-500"
                />
              </div>

              {/* Statutory Notice */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-none flex items-start gap-2.5 text-[11px] text-blue-900 dark:text-blue-300">
                <AlertCircle size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Sri Lanka Accounting Standard:</span> Advance receipt vouchers credit
                  <code className="mx-1 px-1 py-0.5 rounded bg-blue-500/20 font-bold">Customer Advance Liability</code> or
                  <code className="mx-1 px-1 py-0.5 rounded bg-blue-500/20 font-bold">AR</code>. The official
                  <strong> Final Tax Invoice</strong> will be generated upon dispatch/delivery with this advance deducted.
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-theme-subtle">
            <div className="text-[11px] text-muted">
              Auto-generates official General Ledger Journal Entry (<strong className="text-primary">Bank/Cash Debit • Customer Advance Credit</strong>)
            </div>
            <div className="flex items-center gap-3">
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
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-600/20"
              >
                {submitting ? "Issuing Receipt..." : "Issue & Print Payment Receipt"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
