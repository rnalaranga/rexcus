import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Check, CheckSquare, Square, DollarSign, Wallet, Calendar,
  ArrowRight, Sparkles, AlertCircle, Info, RefreshCw, FileText,
  CreditCard, Paperclip, Upload, Eye, Trash2, Building2
} from 'lucide-react';
import { formatCurrency, formatDate, openDataUriOrUrl } from '@/lib/utils';
import { settleVendorOutstanding, fetchAccounts, uploadFileToStorage } from '@/lib/api';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';

interface MultiBillSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: any; // { id, name, company }
  allSuppliers?: any[];
  openBills: any[]; // All open bills across the system
  onSuccess: (result: any) => void;
}

export const MultiBillSettlementModal: React.FC<MultiBillSettlementModalProps> = ({
  isOpen,
  onClose,
  supplier,
  allSuppliers = [],
  openBills = [],
  onSuccess
}) => {
  // Selected Supplier ID
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Payment Form Fields
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cheque' | 'Cash' | 'Online / Card'>('Bank Transfer');
  const [creditAccountId, setCreditAccountId] = useState<string>(''); // Bank / Cash account
  const [debitAccountId, setDebitAccountId] = useState<string>('');  // Accounts Payable
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bankName, setBankName] = useState<string>('');
  const [depositSlip, setDepositSlip] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');

  // Map of billId -> allocated amount (as number)
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load COA accounts
  useEffect(() => {
    if (isOpen) {
      fetchAccounts().then(accs => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(err => console.error('Failed to load COA accounts:', err));
    }
  }, [isOpen]);

  // Initialize selected supplier
  useEffect(() => {
    if (supplier?.id || supplier?.supplierId) {
      setSelectedSupplierId(supplier.id || supplier.supplierId);
    } else if (allSuppliers.length > 0 && !selectedSupplierId) {
      const firstWithBills = allSuppliers.find(s => 
        openBills.some((b: any) => b.supplierId === s.id)
      );
      if (firstWithBills) {
        setSelectedSupplierId(firstWithBills.id);
      } else {
        setSelectedSupplierId(allSuppliers[0].id);
      }
    }
  }, [supplier, allSuppliers, openBills]);

  // Set default accounts once COA is loaded
  useEffect(() => {
    if (accounts.length > 0) {
      // 1. Credit Account (Payment source: Bank or Cash)
      if (!creditAccountId) {
        const isCash = paymentMethod === 'Cash';
        const defaultPaying = accounts.find((a: any) => 
          a.type === 'Asset' && (isCash ? (a.subtype === 'Cash' || a.name.toLowerCase().includes('cash')) : (a.subtype === 'Bank' || a.code === '1000' || a.name.toLowerCase().includes('bank')))
        );
        if (defaultPaying) setCreditAccountId(defaultPaying.id);
      }

      // 2. Debit Account (Accounts Payable)
      if (!debitAccountId) {
        const defaultAP = accounts.find((a: any) => 
          a.type === 'Liability' && (a.code === '2000' || a.name.toLowerCase().includes('payable')) && !a.isTaxAccount
        );
        if (defaultAP) setDebitAccountId(defaultAP.id);
      }
    }
  }, [accounts, paymentMethod]);

  // Current supplier object
  const currentSupplier = useMemo(() => {
    return allSuppliers.find(s => s.id === selectedSupplierId) || supplier || null;
  }, [allSuppliers, selectedSupplierId, supplier]);

  // Unpaid bills specifically for the selected supplier
  const supplierBills = useMemo(() => {
    if (!selectedSupplierId) return [];
    return openBills
      .filter((b: any) => b.supplierId === selectedSupplierId)
      .map((b: any) => {
        const total = Number(b.totalAmount !== null && b.totalAmount !== undefined ? b.totalAmount : (b.amount || 0));
        const paid = Number(b.paidAmount || 0);
        const balanceDue = Math.max(0, total - paid);
        return {
          ...b,
          calculatedTotal: total,
          calculatedPaid: paid,
          balanceDue
        };
      })
      .filter(b => b.balanceDue > 0.01)
      .sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
  }, [openBills, selectedSupplierId]);

  // Reset allocations when supplier changes
  useEffect(() => {
    setAllocations({});
    setTotalAmount('');
    setErrorMsg(null);
  }, [selectedSupplierId]);

  // Total outstanding balance across all unpaid bills for this vendor
  const totalVendorOutstanding = useMemo(() => {
    return supplierBills.reduce((acc, b) => acc + b.balanceDue, 0);
  }, [supplierBills]);

  // Total currently allocated across bills
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [allocations]);

  // Number of bills with non-zero allocation
  const allocatedBillCount = useMemo(() => {
    return Object.values(allocations).filter(v => Number(v) > 0).length;
  }, [allocations]);

  // Auto-allocate / Knock-off FIFO helper
  const handleAutoAllocate = (amountToDistribute: number) => {
    let remaining = Math.max(0, amountToDistribute);
    const newAllocations: Record<string, number> = {};

    for (const b of supplierBills) {
      if (remaining <= 0) {
        newAllocations[b.id] = 0;
        continue;
      }
      const canTake = Math.min(b.balanceDue, remaining);
      const rounded = Math.round(canTake * 100) / 100;
      newAllocations[b.id] = rounded;
      remaining = Math.round((remaining - rounded) * 100) / 100;
    }

    setAllocations(newAllocations);
    setErrorMsg(null);
  };

  // When total amount input changes, re-allocate
  const handleTotalAmountChange = (valStr: string) => {
    setTotalAmount(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      handleAutoAllocate(num);
    } else {
      setAllocations({});
    }
  };

  // Pay All Bills full button
  const handlePayAllInFull = () => {
    const fullTotal = Math.round(totalVendorOutstanding * 100) / 100;
    setTotalAmount(fullTotal.toString());
    const newAllocations: Record<string, number> = {};
    supplierBills.forEach(b => {
      newAllocations[b.id] = b.balanceDue;
    });
    setAllocations(newAllocations);
    setErrorMsg(null);
  };

  // Clear allocations
  const handleClearAllocations = () => {
    setTotalAmount('');
    setAllocations({});
    setErrorMsg(null);
  };

  // Manual allocation change per bill
  const handleBillAllocationChange = (billId: string, valStr: string) => {
    const bill = supplierBills.find(b => b.id === billId);
    if (!bill) return;

    let num = parseFloat(valStr);
    if (isNaN(num) || num < 0) num = 0;
    if (num > bill.balanceDue) num = bill.balanceDue;

    const rounded = Math.round(num * 100) / 100;
    const updated = { ...allocations, [billId]: rounded };
    setAllocations(updated);

    const newTotal = Object.values(updated).reduce((acc, v) => acc + (Number(v) || 0), 0);
    setTotalAmount(newTotal > 0 ? (Math.round(newTotal * 100) / 100).toString() : '');
    setErrorMsg(null);
  };

  // Toggle full allocation for a single bill
  const handleToggleBillFull = (billId: string) => {
    const bill = supplierBills.find(b => b.id === billId);
    if (!bill) return;

    const currentAlloc = allocations[billId] || 0;
    const nextAlloc = currentAlloc > 0 ? 0 : bill.balanceDue;

    const updated = { ...allocations, [billId]: nextAlloc };
    setAllocations(updated);

    const newTotal = Object.values(updated).reduce((acc, v) => acc + (Number(v) || 0), 0);
    setTotalAmount(newTotal > 0 ? (Math.round(newTotal * 100) / 100).toString() : '');
    setErrorMsg(null);
  };

  // Bank Deposit Slip Upload
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
        } catch (err) {
          console.warn('Storage upload fallback:', err);
        } finally {
          setIsUploadingSlip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingSlip(false);
    }
  };

  // Form Submit: Settle Bills via API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numTotal = parseFloat(totalAmount);
    if (!numTotal || numTotal <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (paymentMethod === 'Cheque' && !chequeNo.trim() && !referenceNo.trim()) {
      setErrorMsg('Please enter the Cheque Number for cheque payment.');
      return;
    }

    const payloadAllocations = Object.entries(allocations)
      .filter(([_, amt]) => Number(amt) > 0)
      .map(([billId, amt]) => {
        const b = supplierBills.find(x => x.id === billId);
        return {
          billId,
          invoiceNo: b?.invoiceNo || b?.id,
          allocatedAmount: Number(amt)
        };
      });

    if (payloadAllocations.length === 0) {
      setErrorMsg('Please allocate payment to at least one vendor bill.');
      return;
    }

    const diff = Math.abs(numTotal - totalAllocated);
    if (diff > 0.05) {
      setErrorMsg(`Allocated total (${formatCurrency(totalAllocated)}) does not match Payment Amount (${formatCurrency(numTotal)}). Click "Auto-Allocate" or adjust.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await settleVendorOutstanding({
        supplierId: selectedSupplierId,
        supplierName: currentSupplier?.company || currentSupplier?.name || 'Vendor',
        paymentDate,
        paymentMethod,
        creditAccountId: creditAccountId || undefined,
        debitAccountId: debitAccountId || undefined,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        totalAmount: numTotal,
        chequeNo: paymentMethod === 'Cheque' ? (chequeNo.trim() || referenceNo.trim()) : undefined,
        chequeDate: paymentMethod === 'Cheque' ? chequeDate : undefined,
        bankName: paymentMethod === 'Cheque' ? bankName.trim() : undefined,
        depositSlip: depositSlip || undefined,
        allocations: payloadAllocations
      });

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to settle supplier bills');
    } finally {
      setSubmitting(false);
    }
  };

  const payingAccounts = accounts.filter((a: any) => 
    a.type === 'Asset' && (a.subtype === 'Bank' || a.subtype === 'Cash' || a.code?.startsWith('10') || a.name?.toLowerCase().includes('cash') || a.name?.toLowerCase().includes('bank'))
  );

  const apAccounts = accounts.filter((a: any) => 
    a.type === 'Liability' && !a.isTaxAccount
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consolidated Vendor Bill Payment & AP Knock-Off"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Top Supplier Picker & Global Outstanding Summary */}
        <div className="bg-surface2/60 border border-theme-subtle p-3.5 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                <Building2 size={13} /> Select Supplier / Vendor
              </label>
              <SupplierAutocomplete
                value={selectedSupplierId}
                onChange={(sId) => setSelectedSupplierId(sId)}
                suppliers={allSuppliers}
                placeholder="Search vendor to view unpaid bills..."
                className="text-xs py-1.5"
              />
            </div>

            <div className="text-right sm:border-l sm:border-theme-subtle sm:pl-4 shrink-0">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                Total Outstanding AP
              </span>
              <span className="text-xl font-mono font-black text-rose-500">
                {formatCurrency(totalVendorOutstanding)}
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                {supplierBills.length} unpaid bill(s) open
              </span>
            </div>
          </div>
        </div>

        {/* Payment Details Form: Source Account, AP Account, Method, Slips & Cheques */}
        <div className="bg-surface/60 border border-theme-subtle p-4 rounded-xl space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <CreditCard size={14} /> Payment & Banking Details
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Payment Method */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              >
                <option value="Bank Transfer">Bank Transfer / Online</option>
                <option value="Cheque">Cheque (PDC / Current)</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Online / Card">Corporate Credit / Debit Card</option>
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            {/* Total Payment Amount */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1 flex items-center justify-between">
                <span>Total Payment (LKR) *</span>
                {totalVendorOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={handlePayAllInFull}
                    className="text-[10px] text-amber-500 hover:text-amber-400 font-bold underline"
                  >
                    Pay All Full
                  </button>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={e => handleTotalAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface border-2 border-amber-500/50 px-3 py-1.5 rounded-lg text-sm font-black text-amber-500 font-mono text-right outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Paid From Account (Bank / Cash) */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Disburse From (Bank / Cash Account) *
              </label>
              <select
                value={creditAccountId}
                onChange={e => setCreditAccountId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs font-medium"
              >
                {payingAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name} ({a.subtype || a.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Accounts Payable Account */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Debit Account (Accounts Payable) *
              </label>
              <select
                value={debitAccountId}
                onChange={e => setDebitAccountId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs font-medium"
              >
                {apAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Cheque Fields */}
          {paymentMethod === 'Cheque' && (
            <div className="p-3 bg-amber-500/[0.04] border border-amber-500/20 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Cheque Number *</label>
                <input
                  type="text"
                  value={chequeNo}
                  onChange={e => setChequeNo(e.target.value)}
                  placeholder="e.g. CHQ-981245"
                  className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Cheque / Realization Date</label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={e => setChequeDate(e.target.value)}
                  className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Issuing Bank</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. Commercial Bank / Seylan"
                  className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs"
                />
              </div>
            </div>
          )}

          {/* Transaction Ref, Bank Deposit Slip & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Reference # / Voucher / Bank Ref
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g. TRF-879412 or PV-2024-009"
                className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-mono"
              />
            </div>

            {/* Bank Deposit Slip Attachment */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><Paperclip size={11} /> Bank Slip / Cheque Copy</span>
                {depositSlip && (
                  <button
                    type="button"
                    onClick={() => openDataUriOrUrl(depositSlip, 'Bank Transfer Slip')}
                    className="text-[10px] text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1"
                  >
                    <Eye size={11} /> View Slip
                  </button>
                )}
              </label>

              {depositSlip ? (
                <div className="flex items-center justify-between px-2.5 py-1 bg-surface border border-theme-subtle rounded text-xs">
                  <span className="text-[11px] text-emerald-500 font-medium truncate">Slip Attached ✓</span>
                  <button
                    type="button"
                    onClick={() => setDepositSlip('')}
                    className="text-rose-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-theme-subtle hover:border-amber-500 bg-surface rounded text-xs cursor-pointer text-muted hover:text-primary transition-colors">
                  <Upload size={13} />
                  <span>{isUploadingSlip ? 'Uploading...' : 'Upload Bank Slip / Receipt (Image or PDF)'}</span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleSlipUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Bill Allocation Table (Knock-Off / Partial Matching) */}
        <div className="bg-surface/40 border border-theme-subtle rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-surface2/60 border-b border-theme-subtle flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black uppercase tracking-wider text-primary">Unpaid Bills for Settlement</span>
              <Badge value={`${allocatedBillCount} / ${supplierBills.length} Selected`} size="sm" />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(totalAmount);
                  if (num > 0) handleAutoAllocate(num);
                }}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
                title="Automatically allocate payment amount starting from oldest bills (FIFO)"
              >
                <Sparkles size={13} /> Auto-Allocate (FIFO)
              </button>
              <button
                type="button"
                onClick={handleClearAllocations}
                className="text-xs text-muted hover:text-rose-500"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            {supplierBills.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                {selectedSupplierId ? 'No outstanding bills found for this vendor. All bills are fully paid! 🎉' : 'Please select a vendor above.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle text-[10px] uppercase font-bold text-muted bg-surface/80 sticky top-0 backdrop-blur z-10">
                    <th className="py-2 px-3 text-center w-10">Select</th>
                    <th className="py-2 px-3">Bill ID / Inv #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Bill Total</th>
                    <th className="py-2 px-3 text-right">Paid</th>
                    <th className="py-2 px-3 text-right font-black text-rose-500">Balance Due</th>
                    <th className="py-2 px-3 text-right w-36">Allocated (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle font-mono">
                  {supplierBills.map((b) => {
                    const currentAlloc = allocations[b.id] || 0;
                    const isFullyAllocated = Math.abs(currentAlloc - b.balanceDue) < 0.01 && b.balanceDue > 0;
                    const isPartiallyAllocated = currentAlloc > 0 && currentAlloc < b.balanceDue;

                    return (
                      <tr 
                        key={b.id} 
                        className={`hover:bg-surface2/50 transition-colors ${currentAlloc > 0 ? 'bg-amber-500/[0.03]' : ''}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleBillFull(b.id)}
                            className="p-1 hover:text-amber-500 transition-colors text-muted"
                          >
                            {isFullyAllocated ? (
                              <CheckSquare size={16} className="text-amber-500" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="py-2 px-3">
                          <span className="font-bold text-primary block">{b.invoiceNo || b.id}</span>
                          <span className="text-[10px] text-muted">{b.id} {b.poId && `• PO: ${b.poId}`}</span>
                        </td>

                        <td className="py-2 px-3 text-muted">
                          {b.date ? formatDate(b.date) : '—'}
                        </td>

                        <td className="py-2 px-3 font-sans">
                          <span className="text-[10px] bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle text-secondary">
                            {b.billCategory || 'Purchase'}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-right text-primary">
                          {formatCurrency(b.calculatedTotal, true)}
                        </td>

                        <td className="py-2 px-3 text-right text-muted">
                          {b.calculatedPaid > 0 ? formatCurrency(b.calculatedPaid, true) : '—'}
                        </td>

                        <td className="py-2 px-3 text-right font-bold text-rose-500">
                          {formatCurrency(b.balanceDue, true)}
                        </td>

                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            max={b.balanceDue}
                            value={currentAlloc > 0 ? currentAlloc : ''}
                            onChange={e => handleBillAllocationChange(b.id, e.target.value)}
                            placeholder="0.00"
                            className={`w-full text-right font-mono text-xs font-bold px-2 py-1 rounded border outline-none ${
                              isFullyAllocated 
                                ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                                : isPartiallyAllocated 
                                  ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                                  : 'border-theme-subtle bg-surface text-primary'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Allocation Bottom Summary */}
          <div className="p-3 bg-surface2/80 border-t border-theme-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 text-muted">
              <span>Total Open: <strong className="text-primary">{formatCurrency(totalVendorOutstanding, true)}</strong></span>
              <span>Total Allocated: <strong className="text-amber-500 font-black">{formatCurrency(totalAllocated, true)}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-secondary font-sans text-xs">Remaining Unallocated:</span>
              <span className={`font-black text-sm ${Math.abs(parseFloat(totalAmount || '0') - totalAllocated) < 0.05 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(Math.max(0, (parseFloat(totalAmount || '0') || 0) - totalAllocated), true)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold text-muted uppercase mb-1">Remarks / Accounting Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Bulk payment for March material bills / Settlement via Cheque #..."
            className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded-lg text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-subtle">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={submitting || totalAllocated <= 0}
            className="px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {submitting ? 'Recording Settlement...' : `Confirm Payment of ${formatCurrency(totalAllocated || parseFloat(totalAmount || '0'))}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
