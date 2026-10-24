import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, FileText, CheckCircle, Percent, DollarSign, Calendar, 
  Building2, User, Phone, Mail, MapPin, Receipt, ShieldCheck, 
  CreditCard, Sparkles, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { createInvoice } from '@/lib/api';
import { useAccounts, useTaxProfiles } from '@/hooks/useFinance';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (invoice: any) => void;
  settings?: any;
}

export const CreateAdvanceProformaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  settings
}) => {
  const { toast } = useDialog();
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const { data: taxProfiles = [] } = useTaxProfiles();

  // Basic order info
  const orderId = order?.id || '';
  const orderNo = order?.orderNo || '';
  const quotationNo = order?.quotationNo || '';
  const quotationId = order?.quoteId || '';

  const customerId = order?.customerId || order?.matchedCustomerId || '';
  const customerName = order?.customerName || 'Customer';
  const customerCompany = order?.customerCompany || order?.customerName || '';
  const customerAddress = order?.deliveryAddress || '';
  const customerPhone = order?.customerPhone || '';
  const customerEmail = order?.customerEmail || '';
  const customerAttention = order?.attention || '';

  // Order total
  const orderTotal = Number(order?.totalPrice || order?.totalAmount || 0);

  // Form State
  const [proformaNo, setProformaNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [advancePercent, setAdvancePercent] = useState<number>(30);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [modeOfPayment, setModeOfPayment] = useState('Bank Wire / TT');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedTaxProfileId, setSelectedTaxProfileId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize advance amount and proforma number
  useEffect(() => {
    if (orderTotal > 0) {
      const initAdv = Math.round((orderTotal * 0.3) * 100) / 100;
      setAdvanceAmount(initAdv);
      setAdvancePercent(30);
    }

    // Default Proforma Invoice number: PI-<YEAR><MONTH>_REX_<ORDER_NO>
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const cleanOrd = orderNo ? orderNo.replace(/[^A-Za-z0-9]/g, '') : Date.now().toString().slice(-4);
    setProformaNo(`PI-${yy}${mmm}-ORD${cleanOrd.slice(-4)}`);

    // Default notes
    setNotes(
      `Proforma Invoice for advance payment against Sales Order #${orderNo}. ` +
      `Kindly arrange payment to the bank account stated below to commence manufacturing & material reservation.`
    );
  }, [order, orderTotal, orderNo]);

  // Handle bank accounts filter (Cash / Bank accounts)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a: any) => 
        (a.type === 'Asset' && (a.subtype?.includes('Bank') || a.subtype?.includes('Cash') || a.name?.includes('Bank'))) ||
        a.accountNumber
    );
  }, [accounts]);

  // Set default bank if available
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankId) {
      setSelectedBankId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedBankId]);

  // Set default tax profile if available
  useEffect(() => {
    if (taxProfiles.length > 0 && !selectedTaxProfileId) {
      const def = taxProfiles.find((t: any) => t.is_default) || taxProfiles[0];
      if (def) setSelectedTaxProfileId(def.id);
    }
  }, [taxProfiles, selectedTaxProfileId]);

  // Quick percent buttons
  const handlePercentSelect = (pct: number) => {
    setAdvancePercent(pct);
    const val = Math.round((orderTotal * (pct / 100)) * 100) / 100;
    setAdvanceAmount(val);
  };

  const handleAmountChange = (amt: number) => {
    setAdvanceAmount(amt);
    if (orderTotal > 0) {
      const pct = Math.round((amt / orderTotal) * 100);
      setAdvancePercent(pct);
    }
  };

  const remainingBalance = Math.max(0, orderTotal - advanceAmount);

  // Selected Bank Object
  const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);

  // Selected Tax Profile
  const selectedTax = taxProfiles.find((t: any) => t.id === selectedTaxProfileId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!advanceAmount || advanceAmount <= 0) {
      toast('Please enter a valid advance amount', 'warning');
      return;
    }

    if (!proformaNo.trim()) {
      toast('Please provide a Proforma Invoice Number', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Build line items for proforma
      const proformaItems = [
        {
          id: `item-${Date.now()}`,
          description: `Advance Deposit (${advancePercent}% of Order Total) - Sales Order #${orderNo}`,
          details: order?.productName ? `Ref Item: ${order.productName} (Order Total: ${formatCurrency(orderTotal)})` : `Order Total: ${formatCurrency(orderTotal)}`,
          qty: 1,
          unitPrice: advanceAmount,
          amount: advanceAmount,
          taxRate: selectedTax?.rate || 0
        }
      ];

      const payload = {
        id: proformaNo.trim(),
        invoiceNo: proformaNo.trim(),
        orderNo: orderNo,
        orderId: String(orderId),
        quotationNo: quotationNo,
        quotationId: quotationId ? String(quotationId) : null,
        customerId: customerId || 'CUST-DIRECT',
        leadId: customerId || 'CUST-DIRECT',
        date: date,
        dueDate: dueDate,
        total: advanceAmount,
        subtotal: advanceAmount,
        taxAmount: 0,
        amount: advanceAmount,
        paidAmount: 0,
        status: 'unpaid',
        isProforma: 1,
        invoiceType: 'proforma',
        modeOfPayment: modeOfPayment,
        bankDetailId: selectedBankId || null,
        bankDetails: selectedBank ? JSON.stringify({
          bankName: selectedBank.bankName || selectedBank.name,
          accountNumber: selectedBank.accountNumber || selectedBank.code,
          branch: selectedBank.branch || '',
          accountName: selectedBank.accountName || settings?.company_name || 'Rex Industries (Pvt) Ltd',
          swiftCode: selectedBank.swiftCode || ''
        }) : null,
        items: JSON.stringify(proformaItems),
        notes: notes,
        attention: customerAttention,
        customerVat: order?.customerVat || ''
      };

      const res = await createInvoice(payload);
      toast(`Proforma Invoice ${proformaNo} created successfully!`, 'success');
      onSuccess(res || payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to create proforma invoice:', err);
      toast(err?.message || 'Failed to create Proforma Invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="bg-surface border border-theme-subtle rounded-none shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-surface2/60 border-b border-theme-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-primary tracking-tight">
                  Issue Advance Proforma Invoice
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold uppercase">
                  Proforma
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5 font-mono">
                Sales Order #{orderNo} • {customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface3 rounded-none transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Order Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-surface2/30 border border-theme-subtle rounded-none text-xs font-mono">
            <div>
              <span className="text-muted block text-[10px] uppercase">Order Total</span>
              <span className="font-bold text-primary text-sm">{formatCurrency(orderTotal)}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Customer</span>
              <span className="font-semibold text-secondary truncate block" title={customerCompany || customerName}>
                {customerCompany || customerName}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Ref Quote</span>
              <span className="text-secondary">{quotationNo || 'Direct'}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Order Status</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{order?.status || 'Confirmed'}</span>
            </div>
          </div>

          {/* Document Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Proforma Invoice #
              </label>
              <input
                type="text"
                required
                value={proformaNo}
                onChange={(e) => setProformaNo(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-mono font-bold bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-mono bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Valid Until / Due
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-mono bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>
          </div>

          {/* Advance Calculation Box */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-none space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Percent size={13} className="text-blue-500" /> Advance Deposit Terms
              </span>
              <span className="text-[11px] font-mono text-muted">
                Order Value: {formatCurrency(orderTotal)}
              </span>
            </div>

            {/* Quick Percentage Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 20, 25, 30, 40, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentSelect(pct)}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-none border transition-colors ${
                    advancePercent === pct
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-surface hover:bg-surface2 text-secondary border-theme-subtle'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Inputs: Percentage & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1 font-mono">
                  Advance Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={advancePercent}
                    onChange={(e) => handlePercentSelect(Number(e.target.value))}
                    className="w-full h-8 px-2.5 pr-8 text-xs font-mono font-bold bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-muted font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1 font-mono">
                  Advance Amount (LKR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={advanceAmount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full h-8 px-2.5 text-xs font-mono font-bold bg-surface border border-blue-500/40 rounded-none text-blue-600 dark:text-blue-400 focus:outline-none focus:border-rex-500"
                  />
                </div>
              </div>
            </div>

            {/* Summary preview */}
            <div className="flex items-center justify-between pt-2 border-t border-blue-500/15 text-xs font-mono">
              <span className="text-secondary">
                Advance Payable: <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(advanceAmount)}</strong>
              </span>
              <span className="text-muted">
                Remaining Balance: <strong>{formatCurrency(remainingBalance)}</strong>
              </span>
            </div>
          </div>

          {/* Payment & Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Remittance Mode
              </label>
              <select
                value={modeOfPayment}
                onChange={(e) => setModeOfPayment(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="Bank Wire / TT">Bank Wire / TT Transfer</option>
                <option value="Cheque">Company Cheque</option>
                <option value="Cash">Cash Deposit</option>
                <option value="Online Payment">Online / Card Gateway</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Beneficiary Bank Account
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="">-- No Bank Specified --</option>
                {bankAccounts.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName || b.name} {b.accountNumber ? `(${b.accountNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Instructions / Proforma Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs font-mono bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              placeholder="Bank details, terms, and instructions for customer remittance..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-theme-subtle flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs text-muted hover:text-primary rounded-none"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || advanceAmount <= 0}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-none flex items-center gap-1.5"
            >
              <FileText size={13} />
              {loading ? 'Creating Proforma...' : `Create Proforma (${formatCurrency(advanceAmount)})`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
