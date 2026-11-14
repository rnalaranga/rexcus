import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Check, CheckSquare, Square, DollarSign, Wallet, Calendar,
  ArrowRight, Sparkles, AlertCircle, Info, RefreshCw, FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { settleCustomerOutstanding } from '@/lib/api';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';

interface MultiInvoiceSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: any; // { id, name, company }
  allCustomers?: any[];
  openInvoices: any[]; // All open invoices across the system
  depositAccounts: any[]; // Cash & Bank chart of accounts
  onSuccess: (receipt: any) => void;
}

export const MultiInvoiceSettlementModal: React.FC<MultiInvoiceSettlementModalProps> = ({
  isOpen,
  onClose,
  customer,
  allCustomers = [],
  openInvoices,
  depositAccounts,
  onSuccess
}) => {
  // Selected Customer ID
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Payment Form Fields
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [depositAccountId, setDepositAccountId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');

  // Map of invoiceId -> allocated amount (as number)
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize selected customer and deposit account
  useEffect(() => {
    if (customer?.id || customer?.partyId) {
      setSelectedCustomerId(customer.id || customer.partyId);
    } else if (allCustomers.length > 0 && !selectedCustomerId) {
      // Find first customer with open invoices
      const firstWithInvoices = allCustomers.find(c => 
        openInvoices.some((inv: any) => inv.customerId === c.id || inv.leadId === c.id)
      );
      if (firstWithInvoices) {
        setSelectedCustomerId(firstWithInvoices.id);
      } else {
        setSelectedCustomerId(allCustomers[0].id);
      }
    }
  }, [customer, allCustomers, openInvoices]);

  // Customer object resolved
  const currentCustomer = useMemo(() => {
    return allCustomers.find(c => c.id === selectedCustomerId) || customer || null;
  }, [allCustomers, selectedCustomerId, customer]);

  // Unpaid invoices specifically for the selected customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return openInvoices
      .filter((inv: any) => inv.customerId === selectedCustomerId || inv.leadId === selectedCustomerId)
      .map((inv: any) => {
        const total = Number(inv.total !== null && inv.total !== undefined ? inv.total : (inv.amount || 0));
        const paid = Number(inv.paidAmount || 0);
        const balanceDue = Math.max(0, total - paid);
        return {
          ...inv,
          calculatedTotal: total,
          calculatedPaid: paid,
          balanceDue
        };
      })
      .filter(inv => inv.balanceDue > 0.01)
      .sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
  }, [openInvoices, selectedCustomerId]);

  const isUSD = useMemo(() => {
    return customerInvoices.some((inv: any) => 
      inv.currency === 'USD' || 
      inv.currency === '$' || 
      inv.taxProfileId === 'tp_export_zero_rated' || 
      inv.isForeign
    );
  }, [customerInvoices]);
  const settlementCurrency = isUSD ? 'USD' : 'LKR';

  // Default deposit account to first bank or cash account (prioritizes USD if foreign)
  useEffect(() => {
    if (depositAccounts.length > 0) {
      if (isUSD) {
        const usdAcc = depositAccounts.find(a => a.id === 'acc_1010' || /usd|foreign/i.test(a.name));
        if (usdAcc && depositAccountId !== usdAcc.id) {
          setDepositAccountId(usdAcc.id);
          return;
        }
      }
      if (!depositAccountId) {
        const defaultBank = depositAccounts.find(a => a.subtype === 'Bank') || depositAccounts[0];
        setDepositAccountId(defaultBank.id);
      }
    }
  }, [depositAccounts, depositAccountId, isUSD]);

  // Total customer outstanding across all their open invoices
  const totalCustomerOutstanding = useMemo(() => {
    return customerInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  }, [customerInvoices]);

  // Reset allocations when customer changes
  useEffect(() => {
    setAllocations({});
    setTotalAmount('');
    setErrorMsg(null);
  }, [selectedCustomerId]);

  // Auto-allocate entered totalAmount across invoices using FIFO (Oldest first)
  const handleAutoAllocate = (amountToDistribute?: number) => {
    const val = amountToDistribute !== undefined ? amountToDistribute : parseFloat(totalAmount);
    if (isNaN(val) || val <= 0) {
      setAllocations({});
      return;
    }

    let remaining = val;
    const newAllocations: Record<string, number> = {};

    for (const inv of customerInvoices) {
      if (remaining <= 0) {
        newAllocations[inv.id] = 0;
      } else if (remaining >= inv.balanceDue) {
        // Fully pay this invoice
        newAllocations[inv.id] = inv.balanceDue;
        remaining -= inv.balanceDue;
      } else {
        // Partially pay this invoice (the "0.5" invoice!)
        newAllocations[inv.id] = Math.round(remaining * 100) / 100;
        remaining = 0;
      }
    }

    setAllocations(newAllocations);
  };

  // Handler when user changes totalAmount input
  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      handleAutoAllocate(num);
    } else {
      setAllocations({});
    }
  };

  // Handler when user manually changes an invoice's allocated amount
  const handleInvoiceAllocationChange = (invoiceId: string, value: string, maxBalance: number) => {
    const num = parseFloat(value);
    const validAmount = isNaN(num) ? 0 : Math.min(Math.max(0, num), maxBalance);

    const updated = {
      ...allocations,
      [invoiceId]: validAmount
    };
    setAllocations(updated);

    // Sync totalAmount with sum of allocations
    const newTotal = Object.values(updated).reduce((sum, v) => sum + (v || 0), 0);
    setTotalAmount(newTotal > 0 ? newTotal.toFixed(2) : '');
  };

  // Quick toggle: pay full balance of single invoice
  const handleTogglePayFull = (invoiceId: string, balanceDue: number) => {
    const current = allocations[invoiceId] || 0;
    const isAlreadyFull = Math.abs(current - balanceDue) < 0.01;

    const updated = {
      ...allocations,
      [invoiceId]: isAlreadyFull ? 0 : balanceDue
    };
    setAllocations(updated);

    const newTotal = Object.values(updated).reduce((sum, v) => sum + (v || 0), 0);
    setTotalAmount(newTotal > 0 ? newTotal.toFixed(2) : '');
  };

  // Quick toggle: Select All Invoices (Pay Full Outstanding)
  const handleSelectAllFull = () => {
    const newAllocations: Record<string, number> = {};
    for (const inv of customerInvoices) {
      newAllocations[inv.id] = inv.balanceDue;
    }
    setAllocations(newAllocations);
    setTotalAmount(totalCustomerOutstanding.toFixed(2));
  };

  // Calculate totals
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [allocations]);

  const numEnteredTotal = parseFloat(totalAmount) || 0;
  const unallocatedDifference = Math.round((numEnteredTotal - totalAllocated) * 100) / 100;
  const isAllocationMismatch = Math.abs(unallocatedDifference) > 0.05 && numEnteredTotal > 0;

  // Active settled invoices count
  const activeSettledCount = useMemo(() => {
    return Object.values(allocations).filter(v => (v || 0) > 0).length;
  }, [allocations]);

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numEnteredTotal <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (activeSettledCount === 0) {
      setErrorMsg('Please allocate payment to at least one invoice.');
      return;
    }

    if (isAllocationMismatch) {
      setErrorMsg(`Allocated amount (${formatCurrency(totalAllocated)}) does not match Total Payment (${formatCurrency(numEnteredTotal)}).`);
      return;
    }

    // Build allocations array
    const validAllocationsList = customerInvoices
      .filter(inv => (allocations[inv.id] || 0) > 0)
      .map(inv => ({
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo || inv.id,
        allocatedAmount: allocations[inv.id]
      }));

    setSubmitting(true);
    try {
      const res = await settleCustomerOutstanding({
        customerId: selectedCustomerId,
        customerName: currentCustomer?.company || currentCustomer?.name || 'Customer',
        paymentDate,
        paymentMethod,
        depositAccountId: depositAccountId || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        totalAmount: numEnteredTotal,
        currency: settlementCurrency,
        allocations: validAllocationsList
      });

      if (res && res.receipt) {
        onSuccess(res.receipt);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to settle customer outstanding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Outstanding Settlement (Multi-Invoice Allocation)"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Top Header Card: Customer Selection & Live Outstanding */}
        <div className="p-3.5 bg-surface-secondary border border-theme rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
              Select Customer / Debtor
            </label>
            <CustomerAutocomplete
              value={selectedCustomerId}
              onChange={(cId) => setSelectedCustomerId(cId)}
              customers={allCustomers}
              placeholder="Search customer by name, company..."
              className="text-xs py-1.5"
            />
          </div>

          <div className="text-right sm:border-l sm:border-theme sm:pl-4">
            <span className="text-[10px] uppercase font-bold text-muted block">Total Customer Outstanding</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              {formatCurrency(totalCustomerOutstanding, false, settlementCurrency)}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              {customerInvoices.length} Unpaid / Partial Invoices
            </span>
          </div>
        </div>

        {/* Payment Configuration Card */}
        <div className="p-3.5 bg-surface border border-theme rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Total Payment Received */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Payment Received ({settlementCurrency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">
                  {settlementCurrency === 'USD' ? '$' : 'Rs.'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={e => handleTotalAmountChange(e.target.value)}
                  className="w-full bg-surface-secondary border border-theme rounded-lg pl-9 pr-3 py-2 text-sm font-black text-primary outline-none focus:ring-2 focus:ring-rex-500 font-mono"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full bg-surface-secondary border border-theme rounded-lg px-3 py-2 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Settlement / Payment Mode *
              </label>
              <select
                required
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-surface-secondary border border-theme rounded-lg px-3 py-2 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-rex-500"
              >
                <option value="Bank Transfer">Bank Transfer (Direct / Wire)</option>
                <option value="Cheque">Cheque (Company / Cash)</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Online / Card">Credit Card / Online</option>
                <option value="Advance Offset">Customer Advance Offset (Prior Advance Set-off)</option>
              </select>
            </div>

            {/* Deposit / Offset Account */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                {paymentMethod === 'Advance Offset' ? 'Offset GL Account (Advance Liability / Clearing) *' : 'Deposit Into (Account) *'}
              </label>
              <AccountAutocomplete
                value={depositAccountId}
                onChange={setDepositAccountId}
                placeholder={paymentMethod === 'Advance Offset' ? 'Search & Select Offset GL Account (e.g. 2150 Customer Advances)...' : 'Search deposit account (Bank / Cash)...'}
                typeFilter={paymentMethod === 'Advance Offset' ? undefined : 'Asset'}
                required
                className="text-xs"
              />
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-theme-subtle">
            <div>
              <label className="block text-[11px] font-medium text-secondary mb-1">
                Cheque No / Slip No / Reference <span className="text-muted">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CHQ-882190, TXN-99014"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full bg-surface-secondary border border-theme rounded-lg px-3 py-1.5 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-secondary mb-1">
                Internal Settlement Remarks <span className="text-muted">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lump-sum settlement for project milestones"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-surface-secondary border border-theme rounded-lg px-3 py-1.5 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>
          </div>
        </div>

        {/* Invoice Allocation Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Unpaid Invoices Available for Settlement ({customerInvoices.length})
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {activeSettledCount} Selected
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAutoAllocate()}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rex-500/10 border border-rex-500/30 text-rex-600 dark:text-rex-400 hover:bg-rex-500/20 flex items-center gap-1 transition-colors"
              >
                <Sparkles size={12} /> Auto-Allocate (Oldest First)
              </button>

              <button
                type="button"
                onClick={handleSelectAllFull}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-secondary border border-theme text-secondary hover:text-primary transition-colors"
              >
                Select All (Pay Full)
              </button>

              <button
                type="button"
                onClick={() => { setAllocations({}); setTotalAmount(''); }}
                className="px-2.5 py-1 text-xs font-semibold rounded-md text-muted hover:text-rose-500 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="border border-theme rounded-xl overflow-hidden bg-surface">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-surface-secondary border-b border-theme z-10 text-[10px] text-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3">Invoice # / Date</th>
                    <th className="py-2 px-2">PO / Ref</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Paid So Far</th>
                    <th className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">Balance Due</th>
                    <th className="py-2 px-3 text-right w-44">Allocated Payment</th>
                    <th className="py-2 px-3 text-right">Remaining Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {customerInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted">
                        No outstanding invoices found for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerInvoices.map(inv => {
                      const allocated = allocations[inv.id] || 0;
                      const isSelected = allocated > 0;
                      const isFullySettled = Math.abs(allocated - inv.balanceDue) < 0.01;
                      const remDue = Math.max(0, inv.balanceDue - allocated);

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-surface-secondary/60 transition-colors ${
                            isSelected ? 'bg-rex-500/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleTogglePayFull(inv.id, inv.balanceDue)}
                              className="text-secondary hover:text-primary transition-colors"
                            >
                              {isFullySettled ? (
                                <CheckSquare size={16} className="text-emerald-500" />
                              ) : isSelected ? (
                                <CheckSquare size={16} className="text-amber-500" />
                              ) : (
                                <Square size={16} className="text-muted" />
                              )}
                            </button>
                          </td>

                          {/* Invoice # & Date */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold font-mono text-primary text-xs">
                              {inv.invoiceNo || inv.id}
                            </div>
                            <span className="text-[10px] text-muted">
                              {inv.date ? String(inv.date).slice(0, 10) : ''}
                            </span>
                          </td>

                          {/* PO No */}
                          <td className="py-2.5 px-2 font-mono text-[11px] text-muted">
                            {inv.poNo || '—'}
                          </td>

                          {/* Total Gross */}
                          <td className="py-2.5 px-3 text-right font-mono text-secondary">
                            {formatCurrency(inv.calculatedTotal)}
                          </td>

                          {/* Already Paid */}
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {inv.calculatedPaid > 0 ? formatCurrency(inv.calculatedPaid) : '—'}
                          </td>

                          {/* Balance Due */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(inv.balanceDue)}
                          </td>

                          {/* Allocated Amount Input & Pay Full */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTogglePayFull(inv.id, inv.balanceDue)}
                                title="Pay Full Balance"
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                                  isFullySettled
                                    ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                                    : 'bg-surface-secondary border-theme text-muted hover:text-primary'
                                }`}
                              >
                                Full
                              </button>
                              <div className="relative w-28">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={inv.balanceDue}
                                  placeholder="0.00"
                                  value={allocated > 0 ? allocated : ''}
                                  onChange={e => handleInvoiceAllocationChange(inv.id, e.target.value, inv.balanceDue)}
                                  className="w-full bg-surface-secondary border border-theme rounded-md px-2 py-1 text-xs font-mono font-bold text-primary text-right outline-none focus:ring-1 focus:ring-rex-500"
                                />
                              </div>
                            </div>
                          </td>

                          {/* Remaining Due */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {remDue <= 0.01 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center justify-end gap-1">
                                <Check size={12} /> Settled
                              </span>
                            ) : isSelected ? (
                              <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                                {formatCurrency(remDue)} (Partial)
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">
                                {formatCurrency(inv.balanceDue)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-Time Allocation Summary Footer Bar */}
        <div className="p-3 bg-surface-secondary border border-theme rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-muted block text-[10px] uppercase font-bold">Payment Received</span>
              <span className="font-mono font-black text-primary text-sm">
                {formatCurrency(numEnteredTotal)}
              </span>
            </div>

            <div className="w-px h-6 bg-theme-subtle" />

            <div>
              <span className="text-muted block text-[10px] uppercase font-bold">Total Allocated</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(totalAllocated, false, settlementCurrency)}
              </span>
            </div>

            <div className="w-px h-6 bg-theme-subtle" />

            <div>
              <span className="text-muted block text-[10px] uppercase font-bold">Unallocated Difference</span>
              <span className={`font-mono font-black text-sm ${Math.abs(unallocatedDifference) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {Math.abs(unallocatedDifference) < 0.05 ? `${settlementCurrency === 'USD' ? '$' : 'Rs.'} 0.00 (Balanced)` : formatCurrency(unallocatedDifference, false, settlementCurrency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || activeSettledCount === 0 || isAllocationMismatch}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {submitting ? 'Processing Settlement...' : `Process Settlement (${activeSettledCount} Invoices)`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
