import React, { useState, useMemo } from 'react';
import { 
  X, Building2, Calendar, DollarSign, FileText, 
  AlertCircle, CheckCircle2, Clock, ShieldCheck, User 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { useCustomers } from '@/hooks/useData';
import { createInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface CreateOpeningOutstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCustomerId?: string;
}

export const CreateOpeningOutstandingModal: React.FC<CreateOpeningOutstandingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId
}) => {
  const { toast } = useDialog();
  const { data: customers = [] } = useCustomers();

  // Date defaults: 60 days ago
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString().slice(0, 10);
  }, []);

  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('Opening balance brought forward from legacy system');
  const [submitting, setSubmitting] = useState(false);

  // Sync initial customer
  React.useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === customerId) || null;
  }, [customers, customerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 50);
  }, [customers, customerSearch]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast('Please select a customer', 'error');
      return;
    }

    const cleanInvoiceNo = invoiceNo.trim();
    if (!cleanInvoiceNo) {
      toast('Please enter the old invoice / bill reference number', 'error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast('Please enter a valid outstanding amount greater than zero', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const custName = selectedCustomer?.company || selectedCustomer?.name || 'Customer';
      
      const payload = {
        invoiceNo: cleanInvoiceNo,
        customerId: customerId,
        customerName: custName,
        customerCompany: selectedCustomer?.company || selectedCustomer?.name || '',
        customerAddress: selectedCustomer?.address || '',
        customerPhone: selectedCustomer?.phone || '',
        customerEmail: selectedCustomer?.email || '',
        customerVat: selectedCustomer?.vat || '',
        date: date,
        dueDate: dueDate,
        amount: numAmount,
        total: numAmount,
        subtotal: numAmount,
        taxAmount: 0,
        paidAmount: 0,
        status: 'unpaid',
        invoiceType: 'opening',
        isOpeningBalance: true,
        items: JSON.stringify([
          {
            description: `Historical Outstanding Invoice: ${cleanInvoiceNo}`,
            qty: 1,
            unitPrice: numAmount,
            total: numAmount,
            unit: 'Bill'
          }
        ]),
        notes: notes || 'Historical opening outstanding from previous accounting system'
      };

      const res = await createInvoice(payload);
      if (res && (res.id || res.success)) {
        toast(`Opening invoice ${cleanInvoiceNo} recorded successfully!`, 'success');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res?.error || 'Failed to record opening outstanding');
      }
    } catch (err: any) {
      console.error('Error creating opening invoice:', err);
      toast(err.message || 'Failed to record opening invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-surface border border-theme shadow-2xl rounded-none flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-primary">
                Add Customer Opening Outstanding
              </h3>
              <p className="text-[11px] text-muted">
                Record legacy / historical unpaid invoices without re-triggering Sales or VAT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Statutory Compliance Notice Banner */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-none flex items-start gap-2 text-blue-900 dark:text-blue-300">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">LKAS 1 & IRD Compliance:</span> This entry will update the customer's outstanding debt and aging buckets without affecting current Sales Turnover or VAT/SSCL returns. Offset is posted directly to Opening Balance Equity.
            </div>
          </div>

          {/* 1. Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Select Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
              className="w-full input-base text-xs font-medium cursor-pointer"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Old Invoice No & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Old Invoice / Bill Reference <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2024-0042 or OLD-BILL-10"
                className="w-full input-base font-mono text-xs font-bold"
              />
              <p className="text-[10px] text-muted mt-0.5">Exact number from previous system</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Outstanding Balance (Rs.) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-muted font-bold text-xs">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full input-base pl-9 font-mono text-xs font-black text-emerald-600"
                />
              </div>
              <p className="text-[10px] text-muted mt-0.5">Unpaid amount still owed by customer</p>
            </div>
          </div>

          {/* 3. Original Date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Original Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full input-base text-xs font-mono"
              />
              <p className="text-[10px] text-muted mt-0.5">Determines aging bucket (30/60/90+ days)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full input-base text-xs font-mono"
              />
            </div>
          </div>

          {/* 4. Notes / Remarks */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Remarks / Audit Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Balance carried forward from previous ERP / Manual Ledger"
              className="w-full input-base text-xs resize-none"
            />
          </div>

          {/* Live Preview Summary */}
          {parseFloat(amount) > 0 && selectedCustomer && (
            <div className="p-3 bg-surface2 border border-theme-subtle flex items-center justify-between text-xs">
              <div>
                <span className="text-muted block text-[10px]">Customer Balance to be added:</span>
                <strong className="text-primary font-medium">{selectedCustomer.company || selectedCustomer.name}</strong>
              </div>
              <div className="text-right">
                <span className="text-muted block text-[10px]">Accounts Receivable:</span>
                <strong className="text-emerald-600 font-mono font-black text-sm">
                  {formatCurrency(parseFloat(amount))}
                </strong>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4"
            >
              {submitting ? 'Saving...' : 'Record Outstanding Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
