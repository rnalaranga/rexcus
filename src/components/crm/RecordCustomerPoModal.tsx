import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileCheck, Calendar, Building2, UploadCloud, Eye, Trash2, 
  CheckCircle2, AlertCircle, DollarSign, FileText, Clock, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

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
  onSuccess?: (updatedQuote: any, proceedToSalesOrder?: boolean) => void;
}

export const RecordCustomerPoModal: React.FC<RecordCustomerPoModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  onSuccess
}) => {
  const { toast } = useDialog();
  const { user } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [poMode, setPoMode] = useState<PoEntryMode>('received');
  const [customerPoNo, setCustomerPoNo] = useState('');
  const [customerPoDate, setCustomerPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedPoDate, setExpectedPoDate] = useState('');
  const [withoutPoReason, setWithoutPoReason] = useState('Verbal / Phone Confirmation');
  const [customerPoAttachment, setCustomerPoAttachment] = useState('');
  const [customerPoAttachmentName, setCustomerPoAttachmentName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !quotationData) return;
    const { group, quotation, type } = quotationData;
    let quoteData: any = {};
    if (type === 'product') {
      quoteData = quotation.parsed || {};
    } else {
      try {
        quoteData = typeof quotation.data === 'string' ? JSON.parse(quotation.data || '{}') : (quotation.data || {});
      } catch (e) {}
    }

    const existingPo = quotation.customerPoNo || quoteData.customerPoNo || quoteData.poNo || '';
    const existingStatus = quotation.poStatus || quoteData.poStatus || quotation.status;

    if (existingPo === 'PO PENDING' || existingStatus === 'PO Pending') {
      setPoMode('pending');
      setCustomerPoNo('');
    } else if (existingPo === 'WITHOUT PO' || existingStatus === 'Without PO') {
      setPoMode('without_po');
      setCustomerPoNo('');
    } else if (existingPo) {
      setPoMode('received');
      setCustomerPoNo(existingPo);
    } else {
      setPoMode('received');
      setCustomerPoNo('');
    }

    setCustomerPoDate(quotation.customerPoDate || quoteData.customerPoDate || new Date().toISOString().slice(0, 10));
    setCustomerPoAttachment(quotation.customerPoAttachment || quoteData.customerPoAttachment || '');
    setCustomerPoAttachmentName(
      quotation.customerPoAttachment || quoteData.customerPoAttachment 
        ? `PO_${existingPo || 'Document'}.pdf` 
        : ''
    );
    setNotes(quoteData.customerPoNotes || '');
  }, [isOpen, quotationData]);

  if (!isOpen || !quotationData) return null;

  const { group, quotation } = quotationData;
  const custName = group?.clientName || group?.clientCompany || group?.leadCompany || group?.leadName || 'Customer';
  const qNo = group?.quoNo || quotation?.quotationNo || quotation?.docNo || quotation?.id;
  const quoteTotal = Number(quotation?.totalAmount || quotation?.customAmount || 0);
  const isProceedingToSo = Boolean(quotationData.proceedToSalesOrder);

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
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/${quotation.id}/po-received`;
      
      let compositeNotes = notes.trim();
      if (poMode === 'pending') {
        compositeNotes = `[Status: PO Pending]${expectedPoDate ? ` Expected by: ${expectedPoDate}.` : ''} ${compositeNotes}`.trim();
      } else if (poMode === 'without_po') {
        compositeNotes = `[Status: Without PO - ${withoutPoReason}] ${compositeNotes}`.trim();
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPoNo: finalPoNo,
          poStatus: finalStatus,
          customerPoDate,
          customerPoAttachment: poMode === 'received' ? (customerPoAttachment || null) : null,
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
        ? `Quotation marked as "PO Pending". You can now proceed to Sales Order.`
        : poMode === 'without_po'
        ? `Quotation marked as "Without PO" (${withoutPoReason}). You can now proceed to Sales Order.`
        : `Customer PO #${finalPoNo} recorded successfully!`;

      toast(successMsg, 'success');
      onSuccess?.(data, isProceedingToSo);
      onClose();
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
                Quotation <span className="font-mono font-semibold text-primary">{qNo}</span> • {custName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Notice if opened from Sales Order flow */}
        {isProceedingToSo && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2.5">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
              <strong>PO Status Required before creating Sales Order:</strong> If the client provided a PO, enter it below. If not, choose <strong>PO Pending</strong> or <strong>Without PO</strong> to continue.
            </div>
          </div>
        )}

        {/* PO Mode Selector */}
        <div className="p-4 bg-surface2/60 border-b border-theme-subtle">
          <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
            Select Customer PO Status <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPoMode('received')}
              className={`p-2.5 text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                poMode === 'received'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'bg-surface hover:bg-surface3 border-theme-subtle text-muted hover:text-primary'
              }`}
            >
              <FileCheck size={16} className={poMode === 'received' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'} />
              <span>PO Received</span>
            </button>

            <button
              type="button"
              onClick={() => setPoMode('pending')}
              className={`p-2.5 text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                poMode === 'pending'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'bg-surface hover:bg-surface3 border-theme-subtle text-muted hover:text-primary'
              }`}
            >
              <Clock size={16} className={poMode === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-muted'} />
              <span>PO Pending</span>
            </button>

            <button
              type="button"
              onClick={() => setPoMode('without_po')}
              className={`p-2.5 text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                poMode === 'without_po'
                  ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'bg-surface hover:bg-surface3 border-theme-subtle text-muted hover:text-primary'
              }`}
            >
              <ShieldCheck size={16} className={poMode === 'without_po' ? 'text-blue-600 dark:text-blue-400' : 'text-muted'} />
              <span>Without PO</span>
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Target Quotation Summary */}
          <div className="p-3 bg-surface2 border border-theme-subtle text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-muted shrink-0" />
              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer</span>
                <span className="text-xs font-bold text-primary">{custName}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Quotation Value</span>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(quoteTotal)}
              </span>
            </div>
          </div>

          {/* Conditional Form Body based on Mode */}
          {poMode === 'received' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-primary mb-1">
                    Customer PO Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-2026-8891"
                    value={customerPoNo}
                    onChange={(e) => setCustomerPoNo(e.target.value)}
                    className="w-full px-3 py-2 bg-surface2 border border-theme text-xs font-mono font-bold focus:border-emerald-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-primary mb-1">
                    Customer PO Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={customerPoDate}
                      onChange={(e) => setCustomerPoDate(e.target.value)}
                      className="w-full px-3 py-2 bg-surface2 border border-theme text-xs focus:border-emerald-500 outline-none transition-colors"
                    />
                    <Calendar size={14} className="absolute right-3 top-2.5 text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* PO Document Attachment */}
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1">
                  Customer PO Attachment (PDF / Image)
                </label>
                <div className="border-2 border-dashed border-theme-subtle hover:border-emerald-500/60 transition-colors p-3.5 text-center bg-surface2/40">
                  {customerPoAttachment ? (
                    <div className="flex items-center justify-between gap-3 p-2 bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-mono truncate text-primary">
                          {customerPoAttachmentName || `PO_${customerPoNo || 'Attachment'}.pdf`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open();
                            if (w) {
                              w.document.write(`<iframe src="${customerPoAttachment}" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                            }
                          }}
                          className="p-1 text-muted hover:text-primary hover:bg-surface transition-colors"
                          title="View Document"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerPoAttachment('');
                            setCustomerPoAttachmentName('');
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove Document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud size={24} className="mx-auto text-muted mb-1.5 opacity-60" />
                      <p className="text-xs font-medium text-primary">
                        Drag and drop customer PO file here, or{' '}
                        <label className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                          browse
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">PDF, PNG, JPG up to 15MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {poMode === 'pending' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1">
                  <Clock size={14} /> PO Pending Confirmation
                </span>
                Customer has agreed or placed the order, but the formal PO document is pending issuance. Selecting this will allow creating a Sales Order with <strong>PO Pending</strong> status.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-primary mb-1">
                    Expected PO Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expectedPoDate}
                    onChange={(e) => setExpectedPoDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface2 border border-theme text-xs focus:border-amber-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-primary mb-1">
                    Provisional Ref / Tracking
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Email promise / Kamal - Finance"
                    value={customerPoNo}
                    onChange={(e) => setCustomerPoNo(e.target.value)}
                    className="w-full px-3 py-2 bg-surface2 border border-theme text-xs font-mono focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {poMode === 'without_po' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={14} /> Proceed Without PO
                </span>
                Customer does not issue purchase orders (e.g. Retail, walk-in, director approval, or verbal/email agreement). This will mark the quotation as <strong>Without PO</strong>, enabling Sales Order creation.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-primary mb-1">
                  Authorization / Confirmation Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={withoutPoReason}
                  onChange={(e) => setWithoutPoReason(e.target.value)}
                  className="w-full px-3 py-2 bg-surface2 border border-theme text-xs font-medium focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="Verbal / Phone Confirmation">Verbal / Phone Confirmation</option>
                  <option value="Email Approval">Email Approval</option>
                  <option value="Walk-in Cash Customer">Walk-in Cash / Retail Customer</option>
                  <option value="Company Director Authorized">Company Director Authorized</option>
                  <option value="Contractual / Tender Agreement">Contractual / Tender Agreement</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-primary mb-1">
              Internal Remarks / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes regarding this customer purchase order or authorization..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-theme text-xs focus:border-emerald-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-theme-subtle flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || (poMode === 'received' && !customerPoNo.trim())}
              className={`text-xs text-white font-bold ${
                poMode === 'pending'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : poMode === 'without_po'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {submitting 
                ? 'Saving...' 
                : isProceedingToSo 
                ? 'Save & Proceed to Sales Order →' 
                : poMode === 'pending' 
                ? 'Confirm PO Pending' 
                : poMode === 'without_po' 
                ? 'Confirm Without PO' 
                : 'Confirm PO Received'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
