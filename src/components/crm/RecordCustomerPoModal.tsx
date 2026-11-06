import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileCheck, Calendar, Building2, UploadCloud, Eye, Trash2, 
  CheckCircle2, AlertCircle, DollarSign, FileText, Clock, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, openDataUriOrUrl } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useFinishedGoodsOrders } from '@/hooks/useData';
import { updateFinishedGoodsOrder } from '@/lib/api';

export type PoEntryMode = 'received' | 'pending' | 'without_po';

export interface RecordCustomerPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData?: {
    group: any;
    quotation: any;
    type?: 'custom' | 'product';
    proceedToSalesOrder?: boolean;
  } | null;
  orderData?: any | null;
  onSuccess?: (updatedData?: any, proceedToSalesOrder?: boolean) => void;
}

export const RecordCustomerPoModal: React.FC<RecordCustomerPoModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  orderData,
  onSuccess
}) => {
  const { toast } = useDialog();
  const { user } = useAuth();
  const { data: allOrders = [] } = useFinishedGoodsOrders();

  const [submitting, setSubmitting] = useState(false);
  const [poMode, setPoMode] = useState<PoEntryMode>('received');
  const [customerPoNo, setCustomerPoNo] = useState('');
  const [customerPoDate, setCustomerPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedPoDate, setExpectedPoDate] = useState('');
  const [withoutPoReason, setWithoutPoReason] = useState('Verbal / Phone Confirmation');
  const [customerPoAttachment, setCustomerPoAttachment] = useState('');
  const [customerPoAttachmentName, setCustomerPoAttachmentName] = useState('');
  const [notes, setNotes] = useState('');
  const [isPreviouslyPending, setIsPreviouslyPending] = useState(false);

  const isOrderMode = Boolean(orderData);

  // Duplicate PO verification: Check if PO is already assigned to another order
  const duplicatePoOrder = useMemo(() => {
    if (poMode !== 'received') return null;
    const po = customerPoNo.trim();
    if (!po) return null;
    const poUpper = po.toUpperCase();
    if (poUpper === 'PO PENDING' || poUpper === 'WITHOUT PO' || poUpper === 'N/A' || poUpper === '-') return null;

    return (allOrders || []).find((ord: any) => {
      if (orderData && (ord.id === orderData.id || ord.orderNo === orderData.orderNo)) return false;
      if (!ord.customerPoNo) return false;
      const ordPo = String(ord.customerPoNo).trim();
      const ordPoUpper = ordPo.toUpperCase();
      if (ordPoUpper === 'PO PENDING' || ordPoUpper === 'WITHOUT PO' || ordPoUpper === 'N/A' || ordPoUpper === '-') return false;
      return ordPo.toLowerCase() === po.toLowerCase();
    });
  }, [customerPoNo, poMode, allOrders, orderData]);

  useEffect(() => {
    if (!isOpen || (!quotationData && !orderData)) return;

    if (orderData) {
      const existingPo = String(orderData.customerPoNo || '').trim();
      const existingNotes = String(orderData.notes || '');
      const wasPending = existingPo === 'PO PENDING' || /\[PO Pending\]/i.test(existingNotes);
      const isWithoutPo = existingPo === 'WITHOUT PO';
      const hasRealPo = Boolean(existingPo && !wasPending && !isWithoutPo);

      setIsPreviouslyPending(wasPending);

      if (isWithoutPo) {
        setPoMode('without_po');
        setCustomerPoNo('');
      } else if (hasRealPo) {
        setPoMode('received');
        setCustomerPoNo(existingPo);
      } else {
        setPoMode('received');
        setCustomerPoNo(wasPending ? '' : existingPo);
      }

      setCustomerPoDate(orderData.customerPoDate ? String(orderData.customerPoDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
      setExpectedPoDate('');
      setCustomerPoAttachment(orderData.customerPoAttachment || '');
      setCustomerPoAttachmentName(
        orderData.customerPoAttachment 
          ? ('PO_' + ((hasRealPo ? existingPo : '') || orderData.orderNo || 'Document') + '.pdf')
          : ''
      );

      const cleanNote = existingNotes
        .replace(/^\[Status:\s*(?:PO Pending|Without PO)[^\]]*\]\s*/i, '')
        .replace(/\[PO Pending\]/gi, '')
        .trim();
      setNotes(cleanNote);
      return;
    }

    if (quotationData) {
      const { quotation } = quotationData;
      let quoteData: any = {};
      try {
        if (quotation?.parsed && typeof quotation.parsed === 'object' && Object.keys(quotation.parsed).length > 0) {
          quoteData = quotation.parsed;
        } else if (quotation?.data) {
          quoteData = typeof quotation.data === 'string' ? JSON.parse(quotation.data || '{}') : (quotation.data || {});
          if (typeof quoteData === 'string') {
            try { quoteData = JSON.parse(quoteData); } catch (e) {}
          }
        }
      } catch (e) {}

      const existingPo = quotation.customerPoNo || quoteData.customerPoNo || quoteData.poNo || '';
      const existingStatus = quotation.poStatus || quoteData.poStatus || quotation.status;
      const hasRealPo = Boolean(existingPo && existingPo !== 'PO PENDING' && existingPo !== 'WITHOUT PO');
      const wasPending = existingPo === 'PO PENDING' || existingStatus === 'PO Pending';

      setIsPreviouslyPending(wasPending);

      if (existingPo === 'WITHOUT PO' || existingStatus === 'Without PO') {
        setPoMode('without_po');
        setCustomerPoNo('');
      } else if (hasRealPo) {
        setPoMode('received');
        setCustomerPoNo(existingPo);
      } else {
        setPoMode('received');
        setCustomerPoNo(existingPo === 'PO PENDING' ? '' : existingPo);
      }

      setCustomerPoDate(quotation.customerPoDate || quoteData.customerPoDate || new Date().toISOString().slice(0, 10));
      setExpectedPoDate(quotation.expectedPoDate || quoteData.expectedPoDate || '');
      setWithoutPoReason(quotation.withoutPoReason || quoteData.withoutPoReason || 'Verbal / Phone Confirmation');
      setCustomerPoAttachment(quotation.customerPoAttachment || quoteData.customerPoAttachment || '');
      setCustomerPoAttachmentName(
        quotation.customerPoAttachment || quoteData.customerPoAttachment 
          ? ('PO_' + ((hasRealPo ? existingPo : '') || 'Document') + '.pdf')
          : ''
      );

      const rawNote = quoteData.customerPoNotes || quoteData.notes || quoteData.description || quotation.notes || '';
      const cleanNote = typeof rawNote === 'string'
        ? rawNote.replace(/^\[Status:\s*(?:PO Pending|Without PO)[^\]]*\]\s*/i, '').trim()
        : '';
      setNotes(cleanNote || rawNote || '');
    }
  }, [isOpen, quotationData, orderData]);

  if (!isOpen || (!quotationData && !orderData)) return null;

  const group = quotationData?.group;
  const quotation = quotationData?.quotation;
  const custName = orderData?.customerName || group?.clientName || group?.clientCompany || group?.leadCompany || group?.leadName || 'Customer';
  const qNo = orderData?.orderNo || group?.quoNo || quotation?.quotationNo || quotation?.docNo || quotation?.id;
  const quoteTotal = Number(orderData?.totalPrice || orderData?.subtotal || quotation?.totalAmount || quotation?.customAmount || 0);
  const isProceedingToSo = Boolean(quotationData?.proceedToSalesOrder);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast('File size exceeds 15MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomerPoAttachment(reader.result as string);
      setCustomerPoAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalPoNo = customerPoNo.trim();
    let finalStatus = 'PO Received';

    if (poMode === 'received') {
      if (!finalPoNo) {
        toast('Please enter the Customer PO Number', 'error');
        return;
      }
      if (duplicatePoOrder) {
        toast(`Customer PO #${finalPoNo} is already used on Sales Order #${duplicatePoOrder.orderNo} (${duplicatePoOrder.customerName || 'Customer'}). Same PO number cannot be used on multiple sales orders.`, 'error');
        return;
      }
      finalStatus = 'PO Received';
    } else if (poMode === 'pending') {
      finalPoNo = finalPoNo || 'PO PENDING';
      finalStatus = 'PO Pending';
    } else if (poMode === 'without_po') {
      finalPoNo = finalPoNo || 'WITHOUT PO';
      finalStatus = 'Without PO';
    }

    setSubmitting(true);
    try {
      let compositeNotes = notes.trim();
      if (poMode === 'pending') {
        compositeNotes = ('[Status: PO Pending]' + (expectedPoDate ? (' Expected by: ' + expectedPoDate + '.') : '') + ' ' + compositeNotes).trim();
      } else if (poMode === 'without_po') {
        compositeNotes = ('[Status: Without PO - ' + withoutPoReason + '] ' + compositeNotes).trim();
      }

      if (isOrderMode && orderData) {
        let orderNotes = String(orderData.notes || '');
        if (poMode === 'pending') {
          if (!/\[PO Pending\]/i.test(orderNotes)) {
            orderNotes = ('[PO Pending] ' + orderNotes).trim();
          }
        } else {
          orderNotes = orderNotes.replace(/\[PO Pending\]/gi, '').trim();
        }
        if (compositeNotes && !orderNotes.includes(compositeNotes)) {
          orderNotes = (orderNotes + ' ' + compositeNotes).trim();
        }

        const data = await updateFinishedGoodsOrder(orderData.id, {
          customerPoNo: finalPoNo,
          customerPoDate,
          customerPoAttachment: customerPoAttachment || null,
          notes: orderNotes || null,
          updatedBy: user?.name || (user as any)?.email || 'Sales Team'
        });

        toast('Customer PO #' + finalPoNo + ' recorded for Order ' + orderData.orderNo + '!', 'success');
        onSuccess?.(data, false);
        onClose();
        return;
      }

      if (quotation) {
        const url = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/quotations/' + quotation.id + '/po-received';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerPoNo: finalPoNo,
            poStatus: finalStatus,
            customerPoDate,
            expectedPoDate: poMode === 'pending' ? expectedPoDate : null,
            withoutPoReason: poMode === 'without_po' ? withoutPoReason : null,
            customerPoAttachment: customerPoAttachment || null,
            notes: compositeNotes || null,
            receivedBy: user?.name || (user as any)?.email || 'Sales Team'
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to record customer PO');
        }

        const data = await res.json();
        
        const successMsg = poMode === 'pending'
          ? 'Quotation marked as "PO Pending". You can now proceed to Sales Order.'
          : poMode === 'without_po'
          ? ('Quotation marked as "Without PO" (' + withoutPoReason + '). You can now proceed to Sales Order.')
          : ('Customer PO #' + finalPoNo + ' recorded successfully!');

        toast(successMsg, 'success');
        onSuccess?.(data, isProceedingToSo);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'Failed to record PO', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-theme shadow-2xl rounded-none flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                Record Customer Purchase Order (PO)
              </h2>
              <p className="text-[11px] text-muted">
                {isOrderMode ? 'Sales Order' : 'Quotation'} <span className="font-mono font-semibold text-primary">{qNo}</span> &bull; {custName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Summary Box */}
          <div className="p-3 bg-surface2/50 border border-theme-subtle rounded-none flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer / Account</span>
              <span className="font-bold text-primary text-xs">{custName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">{isOrderMode ? 'Order Value' : 'Quote Value'}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(quoteTotal, true)}
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1.5 uppercase tracking-wider text-[10px]">
              Customer PO Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPoMode('received')}
                className={'p-2.5 border text-left transition-all flex flex-col justify-between ' + (
                  poMode === 'received'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'border-theme-subtle bg-surface hover:bg-surface2 text-muted'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={13} className={poMode === 'received' ? 'text-emerald-600' : 'text-muted'} />
                  <span className="text-xs">PO Received</span>
                </div>
                <span className="text-[9.5px] font-normal leading-tight opacity-80">Official PO is in hand</span>
              </button>

              <button
                type="button"
                onClick={() => setPoMode('pending')}
                className={'p-2.5 border text-left transition-all flex flex-col justify-between ' + (
                  poMode === 'pending'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-theme-subtle bg-surface hover:bg-surface2 text-muted'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={13} className={poMode === 'pending' ? 'text-amber-600' : 'text-muted'} />
                  <span className="text-xs">PO Pending</span>
                </div>
                <span className="text-[9.5px] font-normal leading-tight opacity-80">Awaiting official PO</span>
              </button>

              <button
                type="button"
                onClick={() => setPoMode('without_po')}
                className={'p-2.5 border text-left transition-all flex flex-col justify-between ' + (
                  poMode === 'without_po'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold'
                    : 'border-theme-subtle bg-surface hover:bg-surface2 text-muted'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText size={13} className={poMode === 'without_po' ? 'text-sky-600' : 'text-muted'} />
                  <span className="text-xs">Without PO</span>
                </div>
                <span className="text-[9.5px] font-normal leading-tight opacity-80">Verbal / Direct Order</span>
              </button>
            </div>
          </div>

          {/* MODE: PO RECEIVED */}
          {poMode === 'received' && (
            <div className="space-y-3 p-3.5 bg-surface2/30 border border-theme-subtle">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Customer PO Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPoNo}
                  onChange={e => setCustomerPoNo(e.target.value)}
                  placeholder="e.g. PO/2026/0891 or CUST-PO-774"
                  className={`w-full input-base font-mono text-xs font-semibold ${
                    duplicatePoOrder ? 'border-rose-500 focus:border-rose-500 bg-rose-500/5' : ''
                  }`}
                  autoFocus
                />
                {duplicatePoOrder && (
                  <div className="mt-1.5 p-2 bg-rose-500/15 border border-rose-500/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-1.5 animate-fade-in">
                    <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Duplicate PO Number!</strong>
                      <span className="text-[11px] leading-tight block">
                        Customer PO <strong>{customerPoNo.trim()}</strong> is already assigned to Sales Order{' '}
                        <strong className="font-mono text-primary">#{duplicatePoOrder.orderNo}</strong> ({duplicatePoOrder.customerName || 'Customer'}). Same PO number cannot be used on multiple sales orders.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Customer PO Date
                </label>
                <input
                  type="date"
                  value={customerPoDate}
                  onChange={e => setCustomerPoDate(e.target.value)}
                  className="w-full input-base text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Customer PO Document Attachment (PDF or Image)
                </label>
                {customerPoAttachment ? (
                  <div className="flex items-center justify-between p-2.5 bg-surface border border-theme-subtle">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck size={16} className="text-emerald-500 shrink-0" />
                      <span className="truncate text-xs font-mono font-medium text-primary">
                        {customerPoAttachmentName || 'PO_Attachment_Document'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDataUriOrUrl(customerPoAttachment, 'Customer PO Document')}
                        className="text-xs p-1.5 h-auto text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye size={13} /> View
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomerPoAttachment('');
                          setCustomerPoAttachmentName('');
                        }}
                        className="text-xs p-1.5 h-auto text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-theme-subtle hover:border-emerald-500 bg-surface cursor-pointer transition-colors text-center">
                    <UploadCloud size={20} className="text-emerald-500 mb-1" />
                    <span className="text-xs font-semibold text-primary">Upload Customer PO Document</span>
                    <span className="text-[10px] text-muted">Supports PDF, PNG, JPG up to 15MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* MODE: PO PENDING */}
          {poMode === 'pending' && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Notice:</strong> Marking as <em>PO Pending</em> allows order preparation, but <strong>Goods Dispatch</strong> and <strong>Final Commercial Tax Invoices</strong> remain strictly blocked until the official Customer PO is recorded.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Expected PO Date <span className="text-muted text-[10px] font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={expectedPoDate}
                  onChange={e => setExpectedPoDate(e.target.value)}
                  className="w-full input-base text-xs font-mono bg-surface"
                />
              </div>
            </div>
          )}

          {/* MODE: WITHOUT PO */}
          {poMode === 'without_po' && (
            <div className="p-3.5 bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-200 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Customer does not issue purchase orders (e.g. Retail, walk-in, director approval, or verbal agreement). This marks the record as <strong>Without PO</strong>, enabling full order processing.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Reason for No Customer PO
                </label>
                <select
                  value={withoutPoReason}
                  onChange={e => setWithoutPoReason(e.target.value)}
                  className="w-full input-base text-xs bg-surface"
                >
                  <option value="Verbal / Phone Confirmation">Verbal / Phone Confirmation</option>
                  <option value="Email Approval from Client">Email Approval from Client</option>
                  <option value="Walk-in / Retail Direct Customer">Walk-in / Retail Direct Customer</option>
                  <option value="Director / Executive Management Discretion">Director / Executive Management Discretion</option>
                  <option value="Cash / Advance Payment Completed">Cash / Advance Payment Completed</option>
                  <option value="Other Commercial Agreement">Other Commercial Agreement</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Internal Commercial Notes <span className="text-muted text-[10px] font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes regarding this customer purchase order or authorization..."
              className="w-full input-base text-xs resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-subtle">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {submitting ? 'Saving...' : (isOrderMode ? 'Save Customer PO' : (isProceedingToSo ? 'Save & Create Sales Order' : 'Save PO Details'))}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
